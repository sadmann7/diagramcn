import type { ResolvedGraph, ResolvedNode } from "@/lib/registry/resolve";
import type {
  RegistryItem,
  RegistryItemFile,
} from "@/lib/validations/registry";

import { SHADCN_NAMESPACE } from "@/lib/registry/specifier";

export type Severity = "error" | "warning" | "info";

export interface Finding {
  severity: Severity;
  category: "security" | "conflict" | "registry" | "compatibility";
  title: string;
  detail: string;
  itemId?: string;
  target?: string;
}

export interface PlannedFile {
  itemId: string;
  itemName: string;
  path: string;
  type: RegistryItemFile["type"];
  /** Project-relative path the CLI writes to (aliases approximated). */
  target: string | null;
  content: string | null;
  /** Ids (`itemId::path`) of other planned files this file imports. */
  imports: string[];
  /** npm packages this file imports. */
  packages: string[];
}

export interface PlannedDependency {
  name: string;
  versions: { range: string | null; requiredBy: string[] }[];
}

export interface PlannedCssVar {
  scope: "theme" | "light" | "dark";
  name: string;
  values: { value: string; definedBy: string[] }[];
}

export interface PlannedEnvVar {
  name: string;
  value: string;
  definedBy: string[];
}

export interface InstallPlan {
  files: PlannedFile[];
  dependencies: PlannedDependency[];
  devDependencies: PlannedDependency[];
  cssVars: PlannedCssVar[];
  cssRules: { selector: string; definedBy: string[] }[];
  envVars: PlannedEnvVar[];
  fonts: { family: string; definedBy: string }[];
  findings: Finding[];
}

export function getPlannedFileId(file: Pick<PlannedFile, "itemId" | "path">) {
  return `${file.itemId}::${file.path}`;
}

function getBasename(path: string) {
  return path.split("/").pop() ?? path;
}

function getStem(path: string) {
  return getBasename(path).replace(/\.[^.]+$/, "");
}

/**
 * Approximates where the CLI writes a file with the default aliases.
 * @see https://ui.shadcn.com/docs/registry/registry-item-json#files
 */
export function getFileTarget(file: RegistryItemFile): string | null {
  if (file.target) return file.target.replace(/^~\//, "");

  const basename = getBasename(file.path);
  switch (file.type) {
    case "registry:ui":
      return `components/ui/${basename}`;
    case "registry:component":
    case "registry:block":
    case "registry:example":
      return `components/${basename}`;
    case "registry:hook":
      return `hooks/${basename}`;
    case "registry:lib":
      return `lib/${basename}`;
    case "registry:page":
    case "registry:file":
      return null;
    default:
      return `components/${basename}`;
  }
}

function getItemLabel(node: ResolvedNode) {
  if (node.namespace && node.item) return `${node.namespace}/${node.item.name}`;
  return node.item?.name ?? node.specifier;
}

function parsePackageSpec(spec: string) {
  const match = spec.match(/^(@[^/@]+\/[^@]+|[^@]+)(?:@(.+))?$/);
  return { name: match?.[1] ?? spec, range: match?.[2] ?? null };
}

function getPackageName(specifier: string) {
  if (specifier.startsWith("node:")) return null;
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

const importPattern =
  /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']/g;

function getImportSpecifiers(content: string) {
  const specifiers = new Set<string>();
  for (const match of content.matchAll(importPattern)) {
    const specifier = match[1] ?? match[2] ?? match[3];
    if (specifier) specifiers.add(specifier);
  }
  return [...specifiers];
}

const nodeBuiltins = new Set([
  "fs",
  "path",
  "os",
  "child_process",
  "crypto",
  "http",
  "https",
  "net",
  "url",
  "util",
  "stream",
  "events",
  "buffer",
  "zlib",
]);

function getIsLocalImport(specifier: string) {
  return (
    specifier.startsWith(".") ||
    specifier.startsWith("@/") ||
    specifier.startsWith("~/") ||
    specifier.startsWith("#")
  );
}

// Registry files import through their author's aliases (`@/registry/new-york/ui/button`),
// so imports match on trailing path segments rather than exact paths.
function linkImports(files: PlannedFile[]) {
  const byStem = new Map<string, PlannedFile[]>();
  for (const file of files) {
    const stem = getStem(file.path);
    byStem.set(stem, [...(byStem.get(stem) ?? []), file]);
    if (stem === "index") {
      const folder = file.path.split("/").at(-2);
      if (folder) byStem.set(folder, [...(byStem.get(folder) ?? []), file]);
    }
  }

  for (const file of files) {
    if (!file.content || !/\.(?:[cm]?[jt]sx?)$/.test(file.path)) continue;
    const imports = new Set<string>();
    const packages = new Set<string>();

    for (const specifier of getImportSpecifiers(file.content)) {
      if (!getIsLocalImport(specifier)) {
        const packageName = getPackageName(specifier);
        if (packageName && !nodeBuiltins.has(packageName)) {
          packages.add(packageName);
        }
        continue;
      }

      const segments = specifier
        .replace(/\.[jt]sx?$/, "")
        .split("/")
        .filter((segment) => segment && segment !== "." && segment !== "..");
      const stem = segments.at(-1);
      const parent = segments.at(-2);
      if (!stem) continue;

      const candidates = (byStem.get(stem) ?? []).filter(
        (candidate) => candidate !== file,
      );
      const best =
        candidates.find((candidate) => candidate.itemId === file.itemId) ??
        candidates.find(
          (candidate) => parent && candidate.path.includes(`/${parent}/`),
        ) ??
        candidates[0];
      if (best) imports.add(getPlannedFileId(best));
    }

    file.imports = [...imports];
    file.packages = [...packages];
  }
}

const sensitiveTargets = [
  /^\.env/,
  /(^|\/)package\.json$/,
  /(^|\/)(next|vite|tailwind|postcss)\.config\./,
  /(^|\/)\.github\//,
  /(^|\/)\.npmrc$/,
  /(^|\/)middleware\.[jt]s$/,
  /(^|\/)proxy\.[jt]s$/,
  /(^|\/)instrumentation\.[jt]s$/,
];

const riskPatterns: {
  pattern: RegExp;
  severity: Severity;
  title: string;
  detail: string;
}[] = [
  {
    pattern: /\beval\s*\(|new\s+Function\s*\(/,
    severity: "error",
    title: "Dynamic code execution",
    detail: "Uses eval() or new Function(), which can run arbitrary code.",
  },
  {
    pattern: /["'](?:node:)?child_process["']/,
    severity: "error",
    title: "Spawns processes",
    detail: "Imports child_process and can run shell commands.",
  },
  {
    pattern: /["'](?:node:)?fs(?:\/promises)?["']/,
    severity: "warning",
    title: "File system access",
    detail: "Imports fs and can read or write files on the server.",
  },
  {
    pattern: /[A-Za-z0-9+/=]{400,}/,
    severity: "warning",
    title: "Large encoded blob",
    detail:
      "Contains a very long encoded string. It may be an inlined asset, or obfuscated code.",
  },
  {
    pattern: /dangerouslySetInnerHTML/,
    severity: "info",
    title: "Renders raw HTML",
    detail: "Uses dangerouslySetInnerHTML. Make sure the input is trusted.",
  },
];

function scanFile(file: PlannedFile, findings: Finding[]) {
  const content = file.content ?? "";
  const where = { itemId: file.itemId, target: file.target ?? file.path };

  for (const { pattern, severity, title, detail } of riskPatterns) {
    if (pattern.test(content)) {
      findings.push({
        severity,
        category: "security",
        title,
        detail,
        ...where,
      });
    }
  }

  const hosts = new Set<string>();
  for (const match of content.matchAll(
    /(?:fetch|axios(?:\.\w+)?|navigator\.sendBeacon)\s*\(\s*["'`](https?:\/\/[^/"'`$]+)/g,
  )) {
    if (match[1]) hosts.add(new URL(match[1]).host);
  }
  if (hosts.size > 0) {
    findings.push({
      severity: "warning",
      category: "security",
      title: "Network requests",
      detail: `Sends requests to ${[...hosts].join(", ")}.`,
      ...where,
    });
  }

  const envNames = new Set<string>();
  for (const match of content.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
    if (match[1] && match[1] !== "NODE_ENV") envNames.add(match[1]);
  }
  if (envNames.size > 0) {
    findings.push({
      severity: "info",
      category: "security",
      title: "Reads environment variables",
      detail: [...envNames].join(", "),
      ...where,
    });
  }
}

function lintItem(node: ResolvedNode, item: RegistryItem, findings: Finding[]) {
  const itemId = node.id;

  const isThirdParty = node.namespace !== SHADCN_NAMESPACE;

  if (isThirdParty && !item.description && !item.title && node.depth === 0) {
    findings.push({
      severity: "info",
      category: "registry",
      title: "Missing description",
      detail: `${item.name} has no title or description, so it is hard to find in search and the CLI.`,
      itemId,
    });
  }

  for (const file of item.files ?? []) {
    if (
      (file.type === "registry:file" || file.type === "registry:page") &&
      !file.target
    ) {
      findings.push({
        severity: "error",
        category: "registry",
        title: "Missing target",
        detail: `${file.path} is ${file.type}, which requires a target. The CLI will refuse to install it.`,
        itemId,
        target: file.path,
      });
    }

    if (!file.content) {
      findings.push({
        severity: "error",
        category: "registry",
        title: "Missing file content",
        detail: `${file.path} has no content. Run \`shadcn build\` so content is inlined.`,
        itemId,
        target: file.path,
      });
    }

    if (file.target) {
      const normalized = file.target.replace(/^~\//, "");
      if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
        findings.push({
          severity: "error",
          category: "security",
          title: "Writes outside the project",
          detail: `Target ${file.target} points outside the project directory.`,
          itemId,
          target: file.target,
        });
      } else if (sensitiveTargets.some((pattern) => pattern.test(normalized))) {
        findings.push({
          severity: "warning",
          category: "security",
          title: "Writes a sensitive file",
          detail: `Target ${file.target} is project configuration. Review it before overwriting yours.`,
          itemId,
          target: file.target,
        });
      }
    }
  }

  // Items that ship both are compatible with v3 and v4 projects.
  if (item.tailwind?.config && !item.cssVars?.theme && !item.css) {
    findings.push({
      severity: "info",
      category: "compatibility",
      title: "Tailwind v3 only",
      detail: `${item.name} ships only a tailwind.config block, which Tailwind v4 projects ignore. Add cssVars.theme or css for v4.`,
      itemId,
    });
  }

  if (
    node.namespace &&
    isThirdParty &&
    (item.files ?? []).some((file) => file.path.endsWith("lib/utils.ts"))
  ) {
    findings.push({
      severity: "warning",
      category: "conflict",
      title: "Overwrites lib/utils.ts",
      detail: `${item.name} ships its own lib/utils.ts, which replaces the cn() helper and anything else you added there.`,
      itemId,
      target: "lib/utils.ts",
    });
  }
}

function collectDependencies(
  entries: { itemLabel: string; specs: string[] }[],
): PlannedDependency[] {
  const byName = new Map<string, Map<string | null, string[]>>();

  for (const { itemLabel, specs } of entries) {
    for (const spec of specs) {
      const { name, range } = parsePackageSpec(spec);
      const ranges = byName.get(name) ?? new Map<string | null, string[]>();
      ranges.set(range, [...(ranges.get(range) ?? []), itemLabel]);
      byName.set(name, ranges);
    }
  }

  return [...byName.entries()]
    .map(([name, ranges]) => ({
      name,
      versions: [...ranges.entries()].map(([range, requiredBy]) => ({
        range,
        requiredBy,
      })),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function createInstallPlan(graph: ResolvedGraph): InstallPlan {
  const findings: Finding[] = [];
  const files: PlannedFile[] = [];
  const cssVarMap = new Map<string, Map<string, string[]>>();
  const cssRuleMap = new Map<string, string[]>();
  const envVarMap = new Map<string, Map<string, string[]>>();
  const fonts: InstallPlan["fonts"] = [];

  // Dependencies install first, so walk leaves before the items requesting them.
  const nodes = [...graph.nodes].sort((a, b) => b.depth - a.depth);

  for (const node of nodes) {
    if (node.error || !node.item) {
      findings.push({
        severity: "error",
        category: "registry",
        title: "Could not resolve item",
        detail: `${node.specifier}: ${node.error ?? "unknown error"}`,
        itemId: node.id,
      });
      continue;
    }

    const item = node.item;
    const label = getItemLabel(node);
    lintItem(node, item, findings);

    for (const file of item.files ?? []) {
      files.push({
        itemId: node.id,
        itemName: label,
        path: file.path,
        type: file.type,
        target: getFileTarget(file),
        content: file.content ?? null,
        imports: [],
        packages: [],
      });
    }

    for (const scope of ["theme", "light", "dark"] as const) {
      for (const [name, value] of Object.entries(item.cssVars?.[scope] ?? {})) {
        const key = `${scope}\n${name}`;
        const values = cssVarMap.get(key) ?? new Map<string, string[]>();
        values.set(value, [...(values.get(value) ?? []), label]);
        cssVarMap.set(key, values);
      }
    }

    for (const selector of Object.keys(item.css ?? {})) {
      cssRuleMap.set(selector, [...(cssRuleMap.get(selector) ?? []), label]);
    }

    for (const [name, value] of Object.entries(item.envVars ?? {})) {
      const values = envVarMap.get(name) ?? new Map<string, string[]>();
      values.set(value, [...(values.get(value) ?? []), label]);
      envVarMap.set(name, values);
    }

    if (item.font) fonts.push({ family: item.font.family, definedBy: label });
  }

  linkImports(files);

  const filesByTarget = new Map<string, PlannedFile[]>();
  for (const file of files) {
    if (file.target) {
      filesByTarget.set(file.target, [
        ...(filesByTarget.get(file.target) ?? []),
        file,
      ]);
    }
    scanFile(file, findings);
  }

  for (const [target, sameTarget] of filesByTarget) {
    const owners = [...new Set(sameTarget.map((file) => file.itemName))];
    const contents = new Set(sameTarget.map((file) => file.content));
    if (owners.length > 1 && contents.size > 1) {
      findings.push({
        severity: "warning",
        category: "conflict",
        title: "File conflict",
        detail: `${owners.join(" and ")} write different content to ${target}. The last one installed wins.`,
        target,
      });
    }
  }

  const cssVars: PlannedCssVar[] = [...cssVarMap.entries()].map(
    ([key, values]) => {
      const [scope, name] = key.split("\n") as [PlannedCssVar["scope"], string];
      return {
        scope,
        name,
        values: [...values.entries()].map(([value, definedBy]) => ({
          value,
          definedBy,
        })),
      };
    },
  );

  for (const cssVar of cssVars) {
    if (cssVar.values.length > 1) {
      findings.push({
        severity: "warning",
        category: "conflict",
        title: "CSS variable conflict",
        detail: `--${cssVar.name} (${cssVar.scope}) is set to different values by ${cssVar.values
          .flatMap((value) => value.definedBy)
          .join(", ")}.`,
      });
    }
  }

  const envVars: PlannedEnvVar[] = [...envVarMap.entries()].flatMap(
    ([name, values]) =>
      [...values.entries()].map(([value, definedBy]) => ({
        name,
        value,
        definedBy,
      })),
  );

  const dependencyEntries = nodes
    .filter((node) => node.item)
    .map((node) => ({
      node,
      itemLabel: getItemLabel(node),
    }));

  const dependencies = collectDependencies(
    dependencyEntries.map(({ node, itemLabel }) => ({
      itemLabel,
      specs: node.item?.dependencies ?? [],
    })),
  );
  const devDependencies = collectDependencies(
    dependencyEntries.map(({ node, itemLabel }) => ({
      itemLabel,
      specs: node.item?.devDependencies ?? [],
    })),
  );

  for (const dependency of dependencies) {
    const ranges = dependency.versions.filter((version) => version.range);
    if (new Set(ranges.map((version) => version.range)).size > 1) {
      findings.push({
        severity: "warning",
        category: "conflict",
        title: "Version conflict",
        detail: `${dependency.name} is requested as ${ranges
          .map(
            (version) => `${version.range} (${version.requiredBy.join(", ")})`,
          )
          .join(" and ")}.`,
      });
    }
  }

  const declared = new Set(
    [...dependencies, ...devDependencies].map((dependency) => dependency.name),
  );
  const undeclared = new Map<string, Set<string>>();
  for (const file of files) {
    for (const packageName of file.packages) {
      if (declared.has(packageName) || getIsImplicitPackage(packageName)) {
        continue;
      }
      undeclared.set(
        packageName,
        (undeclared.get(packageName) ?? new Set()).add(file.itemName),
      );
    }
  }
  for (const [packageName, items] of undeclared) {
    findings.push({
      severity: "warning",
      category: "registry",
      title: "Undeclared dependency",
      detail: `${[...items].join(", ")} imports ${packageName} but does not list it in dependencies, so it will not be installed.`,
    });
  }

  if (graph.truncated) {
    findings.push({
      severity: "warning",
      category: "registry",
      title: "Dependency tree truncated",
      detail: "The tree is too large or too deep, so only part of it is shown.",
    });
  }

  const severityOrder: Record<Severity, number> = {
    error: 0,
    warning: 1,
    info: 2,
  };
  findings.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity],
  );

  return {
    files,
    dependencies,
    devDependencies,
    cssVars,
    cssRules: [...cssRuleMap.entries()].map(([selector, definedBy]) => ({
      selector,
      definedBy,
    })),
    envVars,
    fonts,
    findings,
  };
}

// Packages every shadcn project already has, or that frameworks provide.
const implicitPackages = new Set([
  "react",
  "react-dom",
  "next",
  "cn",
  "clsx",
  "tailwind-merge",
  "class-variance-authority",
  "lucide-react",
]);

function getIsImplicitPackage(name: string) {
  return implicitPackages.has(name) || name.startsWith("@types/");
}
