/** Mirrors `VersionChanges` from the server's `/api/sync/changes`. */
export interface VersionChanges {
  /** False when either version only knows its files. */
  complete: boolean;
  changes: {
    dependencies: ListChange;
    devDependencies: ListChange;
    registryDependencies: ListChange;
    cssVars: { key: string; from: string | null; to: string | null }[];
    envVars: { key: string; from: string | null; to: string | null }[];
  };
  requires: {
    dependencies: string[];
    devDependencies: string[];
    registryDependencies: string[];
    envVars: string[];
  } | null;
}

interface ListChange {
  added: string[];
  removed: string[];
}

export interface Missing {
  dependencies: string[];
  devDependencies: string[];
}

/** `zod@^4` → `zod`, `@radix-ui/react-slot@1.2` → `@radix-ui/react-slot`. */
export function getPackageName(spec: string) {
  const at = spec.indexOf("@", 1);
  return at === -1 ? spec : spec.slice(0, at);
}

function getAddCommand(specifier: string) {
  return `shadcn add ${specifier.replace(/^@shadcn\//, "")}`;
}

/**
 * Lines describing what besides files changed upstream, and which npm
 * packages the new version needs that `installed` doesn't have. Sync only
 * writes files, so these are left for the user to apply.
 */
export function describeRequirements(
  { complete, changes, requires }: VersionChanges,
  installed: Set<string>,
) {
  const lines: string[] = [];
  const missing: Missing = { dependencies: [], devDependencies: [] };

  for (const key of ["dependencies", "devDependencies"] as const) {
    const added = complete ? changes[key].added : [];
    // Required now but not installed, whether or not it's new upstream.
    const needed = (requires?.[key] ?? []).filter(
      (spec) => !installed.has(getPackageName(spec)),
    );
    const specs = [...new Set([...added, ...needed])];
    const removed = complete ? changes[key].removed : [];

    for (const spec of specs) {
      const isMissing = !installed.has(getPackageName(spec));
      if (isMissing) missing[key].push(spec);
      const label = key === "dependencies" ? "dependency" : "dev dependency";
      lines.push(
        `  + ${spec}  ${added.includes(spec) ? `new ${label}` : "needed upstream"}, ${isMissing ? "not installed" : "already installed"}`,
      );
    }
    for (const spec of removed) {
      lines.push(
        `  − ${spec}  no longer used upstream${installed.has(getPackageName(spec)) ? ", you can remove it" : ""}`,
      );
    }
  }

  if (complete) {
    for (const specifier of changes.registryDependencies.added) {
      lines.push(
        `  + ${specifier}  new registry dependency, run: ${getAddCommand(specifier)}`,
      );
    }
    for (const change of changes.cssVars) {
      lines.push(
        `  ~ ${change.key}  ${change.from ?? "(unset)"} → ${change.to ?? "(removed)"}, update your CSS`,
      );
    }
    for (const change of changes.envVars) {
      if (change.from === null) {
        lines.push(`  + ${change.key}  new env var, add it to your .env`);
      }
    }
  }

  return { lines, missing };
}
