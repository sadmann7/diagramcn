import { asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { blobs, items, snapshots } from "@/db/schema";
import { resolveRegistryItem } from "@/lib/registry/resolve";
import { normalizeSpecifier } from "@/lib/registry/specifier";
import { backfillItem } from "@/lib/tracking/backfill";
import { getSnapshotFiles, type SnapshotItem } from "@/lib/tracking/compare";
import { recordNode } from "@/lib/tracking/track";

export interface ItemVersion {
  id: string;
  hash: string;
  fetchedAt: string;
}

export type ItemVersionsResult =
  | { status: "disabled" }
  | { status: "not-found"; error: string }
  | { status: "ok"; specifier: string; versions: ItemVersion[] };

/**
 * Every stored version of an item, newest first. Untracked items are
 * fetched and recorded first, so syncing starts tracking them.
 */
export async function getItemVersions(
  input: string,
): Promise<ItemVersionsResult> {
  if (!db) return { status: "disabled" };

  const specifier = normalizeSpecifier(input);

  const findVersions = () =>
    db!
      .select({
        id: snapshots.id,
        hash: snapshots.hash,
        fetchedAt: snapshots.fetchedAt,
      })
      .from(snapshots)
      .innerJoin(items, eq(items.id, snapshots.itemId))
      .where(eq(items.specifier, specifier))
      .orderBy(desc(snapshots.fetchedAt));

  let rows = await findVersions();

  if (rows.length === 0) {
    const node = await resolveRegistryItem(specifier);
    if (!node.item) {
      return {
        status: "not-found",
        error: node.error ?? `Could not resolve ${specifier}`,
      };
    }
    await recordNode(node);
    rows = await findVersions();
  }

  // Older versions make installs from before tracking began mergeable.
  const backfill = await backfillItem(specifier).catch((error: unknown) => {
    console.error(`Failed to backfill ${specifier}:`, error);
    return null;
  });
  if (backfill?.status === "done" && backfill.added > 0) {
    rows = await findVersions();
  }

  return {
    status: "ok",
    specifier,
    versions: rows.map((row) => ({
      id: row.id,
      hash: row.hash,
      fetchedAt: row.fetchedAt.toISOString(),
    })),
  };
}

/**
 * One stored version as an installable registry item, with file contents
 * restored. Only files are kept: dependencies, CSS and env vars are left
 * out, so installing it just writes the files the way the CLI would.
 */
export async function getVersionRegistryItem(id: string) {
  if (!db) return null;

  const [snapshot] = await db
    .select({ item: snapshots.item })
    .from(snapshots)
    .where(eq(snapshots.id, id))
    .limit(1);

  if (!snapshot) return null;

  const item = snapshot.item as SnapshotItem;
  const files = getSnapshotFiles(item);
  const hashes = files.flatMap((file) =>
    file.contentHash ? [file.contentHash] : [],
  );

  const contents = new Map(
    hashes.length > 0
      ? (
          await db
            .select({ hash: blobs.hash, content: blobs.content })
            .from(blobs)
            .where(inArray(blobs.hash, hashes))
            .orderBy(asc(blobs.hash))
        ).map((blob) => [blob.hash, blob.content])
      : [],
  );

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: item.name,
    type: item.type,
    files: files.map((file) => ({
      path: file.path,
      type: file.type,
      ...(file.target ? { target: file.target } : {}),
      content: (file.contentHash && contents.get(file.contentHash)) ?? "",
    })),
  };
}
