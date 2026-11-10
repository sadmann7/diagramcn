import type { InstallPlan } from "@/lib/registry/plan";
import type { ResolvedGraph } from "@/lib/registry/resolve";

export type ConflictKind = "file" | "css-var" | "dependency" | "env-var";

export interface Conflict {
  id: string;
  kind: ConflictKind;
  /** The file, variable or package both items touch. */
  subject: string;
  detail: string;
  /** Node ids of every item involved, in install order. */
  itemIds: string[];
}

/** One edge on the canvas: every conflict between a pair of items. */
export interface ConflictPair {
  source: string;
  target: string;
  conflicts: Conflict[];
}

function parsePackageSpec(spec: string) {
  const match = spec.match(/^(@[^/@]+\/[^@]+|[^@]+)(?:@(.+))?$/);
  return { name: match?.[1] ?? spec, range: match?.[2] ?? null };
}

/** Groups `value → item ids` per key and keeps keys with differing values. */
function getClashes(entries: { key: string; value: string; itemId: string }[]) {
  const byKey = new Map<string, Map<string, string[]>>();
  for (const { key, value, itemId } of entries) {
    const values = byKey.get(key) ?? new Map<string, string[]>();
    const ids = values.get(value) ?? [];
    if (!ids.includes(itemId)) ids.push(itemId);
    values.set(value, ids);
    byKey.set(key, values);
  }

  return [...byKey.entries()].flatMap(([key, values]) => {
    const itemIds = [...new Set([...values.values()].flat())];
    return values.size > 1 && itemIds.length > 1
      ? [{ key, values: [...values.keys()], itemIds }]
      : [];
  });
}

/**
 * Places where items in one install disagree: different content for the
 * same file, different values for the same CSS or env variable, or
 * different version ranges for the same package. Only clashes between
 * two or more items count; an item never conflicts with itself.
 */
export function getConflicts(
  graph: ResolvedGraph,
  plan: Pick<InstallPlan, "files">,
): Conflict[] {
  const conflicts: Conflict[] = [];
  const nodes = graph.nodes.filter((node) => node.item);

  const files = getClashes(
    plan.files.flatMap((file) =>
      file.target
        ? [{ key: file.target, value: file.content ?? "", itemId: file.itemId }]
        : [],
    ),
  );
  for (const { key, itemIds } of files) {
    conflicts.push({
      id: `file:${key}`,
      kind: "file",
      subject: key,
      detail:
        "Different content for the same file. The last one installed wins.",
      itemIds,
    });
  }

  const cssVars = getClashes(
    nodes.flatMap((node) =>
      (["theme", "light", "dark"] as const).flatMap((scope) =>
        Object.entries(node.item?.cssVars?.[scope] ?? {}).map(
          ([name, value]) => ({
            key: `${scope} --${name}`,
            value,
            itemId: node.id,
          }),
        ),
      ),
    ),
  );
  for (const { key, values, itemIds } of cssVars) {
    conflicts.push({
      id: `css-var:${key}`,
      kind: "css-var",
      subject: key,
      detail: `Set to ${values.join(" and ")}. The last one installed wins.`,
      itemIds,
    });
  }

  const envVars = getClashes(
    nodes.flatMap((node) =>
      Object.entries(node.item?.envVars ?? {}).map(([name, value]) => ({
        key: name,
        value,
        itemId: node.id,
      })),
    ),
  );
  for (const { key, values, itemIds } of envVars) {
    conflicts.push({
      id: `env-var:${key}`,
      kind: "env-var",
      subject: key,
      detail: `Different defaults: ${values.map((value) => value || "(empty)").join(" and ")}.`,
      itemIds,
    });
  }

  // Unpinned specs (`zod`) accept whatever is installed, so only explicit
  // ranges can disagree.
  const dependencies = getClashes(
    nodes.flatMap((node) =>
      [
        ...(node.item?.dependencies ?? []),
        ...(node.item?.devDependencies ?? []),
      ].flatMap((spec) => {
        const { name, range } = parsePackageSpec(spec);
        return range ? [{ key: name, value: range, itemId: node.id }] : [];
      }),
    ),
  );
  for (const { key, values, itemIds } of dependencies) {
    conflicts.push({
      id: `dependency:${key}`,
      kind: "dependency",
      subject: key,
      detail: `Asks for ${values.join(" and ")}.`,
      itemIds,
    });
  }

  return conflicts;
}

/** Conflicts grouped into one entry per pair of items, for drawing edges. */
export function getConflictPairs(conflicts: Conflict[]): ConflictPair[] {
  const pairs = new Map<string, ConflictPair>();
  for (const conflict of conflicts) {
    const ids = [...conflict.itemIds].sort();
    for (const [index, source] of ids.entries()) {
      for (const target of ids.slice(index + 1)) {
        const key = `${source}\n${target}`;
        const pair = pairs.get(key) ?? { source, target, conflicts: [] };
        pair.conflicts.push(conflict);
        pairs.set(key, pair);
      }
    }
  }
  return [...pairs.values()];
}
