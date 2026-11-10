import { stableStringify } from "@/lib/stable-stringify";

/** A stored snapshot item: a registry item whose files carry `contentHash`. */
export type SnapshotItem = Record<string, unknown>;

export interface SnapshotFile {
  path: string;
  type: string | null;
  target: string | null;
  contentHash: string | null;
}

export interface ListChange {
  added: string[];
  removed: string[];
}

export interface FileChange {
  path: string;
  status: "added" | "removed" | "modified";
  /** For modified files: what changed besides content. */
  moved: boolean;
  contentChanged: boolean;
}

export interface ValueChange {
  key: string;
  from: string | null;
  to: string | null;
}

export interface ItemChanges {
  files: FileChange[];
  dependencies: ListChange;
  devDependencies: ListChange;
  registryDependencies: ListChange;
  cssVars: ValueChange[];
  envVars: ValueChange[];
  /** Top-level fields like description, docs, css or tailwind. */
  fields: string[];
}

const comparedKeys = new Set([
  "files",
  "dependencies",
  "devDependencies",
  "registryDependencies",
  "cssVars",
  "envVars",
]);

function getStrings(item: SnapshotItem | null, key: string) {
  const value = item?.[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function getRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function getSnapshotFiles(item: SnapshotItem | null): SnapshotFile[] {
  const files = item?.files;
  if (!Array.isArray(files)) return [];

  return files.flatMap((file) => {
    const record = getRecord(file);
    if (typeof record.path !== "string") return [];
    return [
      {
        path: record.path,
        type: typeof record.type === "string" ? record.type : null,
        target: typeof record.target === "string" ? record.target : null,
        contentHash:
          typeof record.contentHash === "string" ? record.contentHash : null,
      },
    ];
  });
}

function compareLists(
  previous: SnapshotItem | null,
  next: SnapshotItem,
  key: string,
): ListChange {
  const before = new Set(getStrings(previous, key));
  const after = new Set(getStrings(next, key));
  return {
    added: [...after].filter((entry) => !before.has(entry)),
    removed: [...before].filter((entry) => !after.has(entry)),
  };
}

function compareRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix = "",
): ValueChange[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.flatMap((key) => {
    const from = before[key] === undefined ? null : String(before[key]);
    const to = after[key] === undefined ? null : String(after[key]);
    return from === to ? [] : [{ key: `${prefix}${key}`, from, to }];
  });
}

function compareFiles(previous: SnapshotItem | null, next: SnapshotItem) {
  const before = new Map(
    getSnapshotFiles(previous).map((file) => [file.path, file]),
  );
  const after = new Map(
    getSnapshotFiles(next).map((file) => [file.path, file]),
  );
  const changes: FileChange[] = [];

  for (const [path, file] of after) {
    const old = before.get(path);
    if (!old) {
      changes.push({
        path,
        status: "added",
        moved: false,
        contentChanged: true,
      });
      continue;
    }
    const moved = old.target !== file.target || old.type !== file.type;
    const contentChanged = old.contentHash !== file.contentHash;
    if (moved || contentChanged) {
      changes.push({ path, status: "modified", moved, contentChanged });
    }
  }

  for (const path of before.keys()) {
    if (!after.has(path)) {
      changes.push({
        path,
        status: "removed",
        moved: false,
        contentChanged: true,
      });
    }
  }

  return changes;
}

/** What changed from `previous` to `next`. `previous` is null for the first version. */
export function compareSnapshots(
  previous: SnapshotItem | null,
  next: SnapshotItem,
): ItemChanges {
  const previousCssVars = getRecord(previous?.cssVars);
  const nextCssVars = getRecord(next.cssVars);

  const cssVars = ["theme", "light", "dark"].flatMap((scope) =>
    compareRecords(
      getRecord(previousCssVars[scope]),
      getRecord(nextCssVars[scope]),
      `${scope} --`,
    ),
  );

  const fieldKeys = [
    ...new Set([...Object.keys(previous ?? {}), ...Object.keys(next)]),
  ].filter((key) => !comparedKeys.has(key) && key !== "$schema");

  return {
    files: compareFiles(previous, next),
    dependencies: compareLists(previous, next, "dependencies"),
    devDependencies: compareLists(previous, next, "devDependencies"),
    registryDependencies: compareLists(previous, next, "registryDependencies"),
    cssVars,
    envVars: compareRecords(
      getRecord(previous?.envVars),
      getRecord(next.envVars),
    ),
    fields: previous
      ? fieldKeys.filter(
          (key) =>
            stableStringify(previous[key] ?? null) !==
            stableStringify(next[key] ?? null),
        )
      : [],
  };
}

export function getChangeCount(changes: ItemChanges) {
  const listCount = (change: ListChange) =>
    change.added.length + change.removed.length;

  return (
    changes.files.length +
    listCount(changes.dependencies) +
    listCount(changes.devDependencies) +
    listCount(changes.registryDependencies) +
    changes.cssVars.length +
    changes.envVars.length +
    changes.fields.length
  );
}
