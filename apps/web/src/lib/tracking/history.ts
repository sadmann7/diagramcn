import { blobs, items, snapshots } from "@diagramcn/db/schema";
import { structuredPatch } from "diff";
import { and, desc, eq, inArray, lt } from "drizzle-orm";

import { db } from "@/db";
import {
  compareSnapshots,
  compareVersions,
  getSnapshotFiles,
  type ItemChanges,
  type SnapshotItem,
} from "@/lib/tracking/compare";

const MAX_VERSIONS = 50;
const MAX_DIFF_LINES = 800;
const MAX_DIFF_CONTENT_LENGTH = 400_000;

export interface HistoryVersion {
  id: string;
  hash: string;
  fetchedAt: string;
  /** `git` versions were imported from the registry's source history. */
  origin: "crawl" | "git";
  commitSha: string | null;
  // Null for the first version recorded.
  changes: ItemChanges | null;
}

export interface ItemHistory {
  specifier: string;
  trackedSince: string;
  lastCheckedAt: string | null;
  lastError: string | null;
  /** Newest first. */
  versions: HistoryVersion[];
  /** True when older versions exist beyond `versions`. */
  hasMore: boolean;
}

export type ItemHistoryResult =
  | { status: "disabled" }
  | { status: "unavailable" }
  | { status: "untracked" }
  | { status: "tracked"; history: ItemHistory };

/** History of one item in one style (`""` outside `@shadcn`). */
export async function getItemHistory(
  specifier: string,
  style = "",
): Promise<ItemHistoryResult> {
  if (!db) return { status: "disabled" };

  const [item] = await db
    .select()
    .from(items)
    .where(and(eq(items.specifier, specifier), eq(items.style, style)))
    .limit(1);

  if (!item) return { status: "untracked" };

  // One extra row, so the oldest shown version can be compared to its predecessor.
  const rows = await db
    .select({
      id: snapshots.id,
      hash: snapshots.hash,
      item: snapshots.item,
      fetchedAt: snapshots.fetchedAt,
      origin: snapshots.origin,
      commitSha: snapshots.commitSha,
    })
    .from(snapshots)
    .where(eq(snapshots.itemId, item.id))
    .orderBy(desc(snapshots.fetchedAt))
    .limit(MAX_VERSIONS + 1);

  const shown = rows.slice(0, MAX_VERSIONS);
  const versions = shown.map((row, index) => {
    const previous = rows[index + 1];
    return {
      id: row.id,
      hash: row.hash,
      fetchedAt: row.fetchedAt.toISOString(),
      origin: row.origin,
      commitSha: row.commitSha,
      changes: previous
        ? compareVersions(
            { item: previous.item as SnapshotItem, origin: previous.origin },
            { item: row.item as SnapshotItem, origin: row.origin },
          )
        : null,
    };
  });

  return {
    status: "tracked",
    history: {
      specifier,
      trackedSince: item.createdAt.toISOString(),
      lastCheckedAt: item.lastCheckedAt?.toISOString() ?? null,
      lastError: item.lastError,
      versions,
      hasMore: rows.length > MAX_VERSIONS,
    },
  };
}

export interface DiffHunk {
  oldStart: number;
  newStart: number;
  lines: string[];
}

export interface FileDiff {
  path: string;
  status: "added" | "removed" | "modified";
  fromTarget: string | null;
  toTarget: string | null;
  hunks: DiffHunk[];
  /** Why the diff isn't shown in full, if it isn't. */
  note: string | null;
}

function createFileDiff(
  path: string,
  before: string,
  after: string,
): Pick<FileDiff, "hunks" | "note"> {
  if (
    before.length > MAX_DIFF_CONTENT_LENGTH ||
    after.length > MAX_DIFF_CONTENT_LENGTH
  ) {
    return { hunks: [], note: "File is too large to diff." };
  }

  const patch = structuredPatch(path, path, before, after, "", "", {
    context: 3,
  });

  const hunks: DiffHunk[] = [];
  let lineCount = 0;
  for (const hunk of patch.hunks) {
    if (lineCount >= MAX_DIFF_LINES) {
      return { hunks, note: `Diff truncated after ${MAX_DIFF_LINES} lines.` };
    }
    const lines = hunk.lines.slice(0, MAX_DIFF_LINES - lineCount);
    lineCount += lines.length;
    hunks.push({ oldStart: hunk.oldStart, newStart: hunk.newStart, lines });
  }

  return {
    hunks,
    note: hunks.length === 0 ? "Only the file's target or type changed." : null,
  };
}

/** Line diffs of every changed file between a version and the one before it. */
export async function getVersionFileDiffs(
  snapshotId: string,
): Promise<FileDiff[] | null> {
  if (!db) return null;

  const [snapshot] = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.id, snapshotId))
    .limit(1);

  if (!snapshot) return null;

  const [previous] = await db
    .select()
    .from(snapshots)
    .where(
      and(
        eq(snapshots.itemId, snapshot.itemId),
        lt(snapshots.fetchedAt, snapshot.fetchedAt),
      ),
    )
    .orderBy(desc(snapshots.fetchedAt))
    .limit(1);

  const previousItem = (previous?.item as SnapshotItem | undefined) ?? null;
  const nextItem = snapshot.item as SnapshotItem;
  const changes = compareSnapshots(previousItem, nextItem);

  const beforeFiles = new Map(
    getSnapshotFiles(previousItem).map((file) => [file.path, file]),
  );
  const afterFiles = new Map(
    getSnapshotFiles(nextItem).map((file) => [file.path, file]),
  );

  const hashes = new Set<string>();
  for (const change of changes.files) {
    const before = beforeFiles.get(change.path)?.contentHash;
    const after = afterFiles.get(change.path)?.contentHash;
    if (before) hashes.add(before);
    if (after) hashes.add(after);
  }

  const contents = new Map(
    hashes.size > 0
      ? (
          await db
            .select({ hash: blobs.hash, content: blobs.content })
            .from(blobs)
            .where(inArray(blobs.hash, [...hashes]))
        ).map((blob) => [blob.hash, blob.content])
      : [],
  );

  const getContent = (hash: string | null | undefined) =>
    (hash && contents.get(hash)) ?? "";

  return changes.files.map((change) => {
    const before = beforeFiles.get(change.path);
    const after = afterFiles.get(change.path);
    return {
      path: change.path,
      status: change.status,
      fromTarget: before?.target ?? null,
      toTarget: after?.target ?? null,
      ...createFileDiff(
        change.path,
        getContent(before?.contentHash),
        getContent(after?.contentHash),
      ),
    };
  });
}
