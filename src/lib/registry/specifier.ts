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
 * Shareable path for a set of specifiers. A single namespaced item gets a
 * pretty permalink (`/@acme/foo`), everything else goes through `/inspect`.
 */
export function getInspectHref(specifiers: string[]) {
  const [first] = specifiers;
  if (specifiers.length === 1 && first && parseNamespacedSpecifier(first)) {
    return `/${first}`;
  }
  return `/inspect?q=${encodeURIComponent(specifiers.join(" "))}`;
}

export function getAddCommand(dlx: string, specifiers: string[]) {
  return `${dlx} shadcn@latest add ${specifiers.join(" ")}`;
}

export function getStackHref(specifiers: string[]) {
  if (specifiers.length === 0) return "/stack";
  return `/stack?q=${encodeURIComponent(specifiers.join(" "))}`;
}

/** URL of the single registry item that installs the whole stack. */
export function getStackItemUrl(origin: string, specifiers: string[]) {
  return `${origin}/api/stack?q=${encodeURIComponent(specifiers.join(" "))}`;
}
