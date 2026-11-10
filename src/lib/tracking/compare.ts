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

function formatValue(value: unknown) {
  if (value === undefined) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function compareRecords(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix = "",
): ValueChange[] {
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys.flatMap((key) => {
    const from = formatValue(before[key]);
    const to = formatValue(after[key]);
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

function getListCount(change: ListChange) {
  return change.added.length + change.removed.length;
}

export function getChangeCount(changes: ItemChanges) {
  return (
    changes.files.length +
    getListCount(changes.dependencies) +
    getListCount(changes.devDependencies) +
    getListCount(changes.registryDependencies) +
    changes.cssVars.length +
    changes.envVars.length +
    changes.fields.length
  );
}

function getListSummary(label: string, change: ListChange) {
  const parts = [
    change.added.length ? `+${change.added.length}` : null,
    change.removed.length ? `−${change.removed.length}` : null,
  ].filter(Boolean);
  return parts.length ? `${label} ${parts.join(" ")}` : null;
}

/** One line describing a change, e.g. "2 files changed · deps +1". */
export function getChangeSummary(changes: ItemChanges) {
  if (getChangeCount(changes) === 0) return "Formatting only";

  const fileCounts = { added: 0, removed: 0, modified: 0 };
  for (const file of changes.files) fileCounts[file.status]++;

  return [
    fileCounts.modified
      ? `${fileCounts.modified} ${fileCounts.modified === 1 ? "file" : "files"} changed`
      : null,
    fileCounts.added ? `${fileCounts.added} added` : null,
    fileCounts.removed ? `${fileCounts.removed} removed` : null,
    getListSummary("deps", changes.dependencies),
    getListSummary("dev deps", changes.devDependencies),
    getListSummary("registry deps", changes.registryDependencies),
    changes.cssVars.length ? `${changes.cssVars.length} CSS vars` : null,
    changes.envVars.length ? `${changes.envVars.length} env vars` : null,
    changes.fields.length ? changes.fields.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export interface StoredVersion {
  item: SnapshotItem;
  origin: "crawl" | "git";
}

function getFilesOnly(item: SnapshotItem): SnapshotItem {
  return { files: item.files };
}

/**
 * Compares two stored versions. Versions imported from git history only
 * know their files, so against those only file changes are meaningful.
 */
export function compareVersions(
  previous: StoredVersion | null,
  next: StoredVersion,
) {
  if (previous && (previous.origin === "git" || next.origin === "git")) {
    return compareSnapshots(
      getFilesOnly(previous.item),
      getFilesOnly(next.item),
    );
  }
  return compareSnapshots(previous?.item ?? null, next.item);
}
