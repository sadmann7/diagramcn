import { DEFAULT_SHADCN_STYLE } from "@/lib/registry/styles";

export const SHADCN_NAMESPACE = "@shadcn";

// CLI flags of `shadcn add` that consume the next token as their value.
const flagsWithValue = new Set(["-c", "--cwd", "-p", "--path"]);

const urlPattern = /^https?:\/\//i;
const namespacedPattern = /^@[a-z0-9][\w.-]*\/[\w./-]+$/i;
const namePattern = /^[a-z0-9][\w.-]*$/i;

export function isUrlSpecifier(specifier: string) {
  return urlPattern.test(specifier);
}

export function getIsValidSpecifier(specifier: string) {
  return (
    isUrlSpecifier(specifier) ||
    namespacedPattern.test(specifier) ||
    namePattern.test(specifier)
  );
}

/**
 * Normalizes a single specifier the way the shadcn CLI does: bare names
 * belong to the built-in `@shadcn` namespace.
 */
export function normalizeSpecifier(specifier: string) {
  const trimmed = specifier.trim();
  if (isUrlSpecifier(trimmed) || trimmed.startsWith("@")) return trimmed;
  return `${SHADCN_NAMESPACE}/${trimmed}`;
}

export function parseNamespacedSpecifier(specifier: string) {
  const match = specifier.match(/^(@[^/]+)\/(.+)$/);
  if (!match) return null;
  const [, namespace, name] = match;
  if (!namespace || !name) return null;
  return { namespace, name };
}

/**
 * Extracts registry item specifiers from whatever the user pasted:
 * `npx shadcn@latest add @acme/foo bar --overwrite`, `bunx --bun shadcn add`,
 * a list of names, or registry item URLs.
 */
export function parseAddInput(input: string): string[] {
  const tokens = input
    .trim()
    .split(/\s+/)
    .map((token) => token.replace(/^["'`]|["'`]$/g, ""))
    .filter(Boolean);

  const shadcnIndex = tokens.findIndex((token) =>
    /^shadcn(@[\w.-]+)?$/.test(token),
  );

  let candidates = tokens;
  if (shadcnIndex !== -1) {
    const rest = tokens.slice(shadcnIndex + 1);
    // Only `add` and `view` take registry items; `init`, `build`, etc. don't.
    const commandIndex = rest.findIndex(
      (token) => token === "add" || token === "view",
    );
    candidates = commandIndex === -1 ? [] : rest.slice(commandIndex + 1);
  }

  const specifiers: string[] = [];
  for (let index = 0; index < candidates.length; index++) {
    const token = candidates[index];
    if (!token) continue;
    if (token.startsWith("-")) {
      if (flagsWithValue.has(token)) index++;
      continue;
    }
    if (!getIsValidSpecifier(token)) continue;
    specifiers.push(normalizeSpecifier(token));
  }

  return [...new Set(specifiers)];
}

/**
 * An item's page: `/@acme/foo`. Items from unlisted registries are known by
 * their URL, which can't be a path, so theirs takes it as a query.
 */
export function getItemHref(specifier: string, style?: string) {
  const query =
    style && style !== DEFAULT_SHADCN_STYLE ? `style=${style}` : null;
  return parseNamespacedSpecifier(specifier)
    ? `/${specifier}${query ? `?${query}` : ""}`
    : `/url?q=${encodeURIComponent(specifier)}${query ? `&${query}` : ""}`;
}

export function getAddCommand(dlx: string, specifiers: string[]) {
  return `${dlx} shadcn@latest add ${specifiers.join(" ")}`;
}

export function getCanvasHref(specifiers: string[], style?: string) {
  const search = new URLSearchParams();
  if (specifiers.length > 0) search.set("q", specifiers.join(" "));
  if (style && style !== DEFAULT_SHADCN_STYLE) search.set("style", style);
  const query = search.toString().replaceAll("+", "%20");
  return query ? `/canvas?${query}` : "/canvas";
}

/** URL of the single registry item that installs the whole stack. */
export function getStackItemUrl(origin: string, specifiers: string[]) {
  return `${origin}/api/stack?q=${encodeURIComponent(specifiers.join(" "))}`;
}
