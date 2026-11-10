import { blobs, items, snapshots } from "@diagramcn/db/schema";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { resolveRegistryItem } from "@/lib/registry/resolve";
import {
  normalizeSpecifier,
  parseNamespacedSpecifier,
  SHADCN_NAMESPACE,
} from "@/lib/registry/specifier";
import { getShadcnStyle } from "@/lib/registry/styles";
import { backfillItem } from "@/lib/tracking/backfill";
import {
  compareVersions,
  getSnapshotFiles,
  type ItemChanges,
  type SnapshotItem,
} from "@/lib/tracking/compare";
import { recordNode } from "@/lib/tracking/track";

export interface ItemVersion {
  id: string;
  hash: string;
  fetchedAt: string;
}

export type ItemVersionsResult =
  | { status: "disabled" }
  | { status: "not-found"; error: string }
  | {
      status: "ok";
      specifier: string;
      /** The `@shadcn` style the versions are in; empty elsewhere. */
      style: string;
      versions: ItemVersion[];
    };

/**
 * Every stored version of an item, newest first. Untracked items are
 * fetched and recorded first, so syncing starts tracking them. `@shadcn`
 * items are tracked per style, since each style serves different files.
 */
export async function getItemVersions(
  input: string,
  requestedStyle?: string,
): Promise<ItemVersionsResult> {
  if (!db) return { status: "disabled" };

  const specifier = normalizeSpecifier(input);
  const style =
    parseNamespacedSpecifier(specifier)?.namespace === SHADCN_NAMESPACE
      ? getShadcnStyle(requestedStyle)
      : "";

  const findVersions = () =>
    db!
      .select({
        id: snapshots.id,
        hash: snapshots.hash,
        fetchedAt: snapshots.fetchedAt,
      })
      .from(snapshots)
      .innerJoin(items, eq(items.id, snapshots.itemId))
      .where(and(eq(items.specifier, specifier), eq(items.style, style)))
      .orderBy(desc(snapshots.fetchedAt));

  let rows = await findVersions();

  if (rows.length === 0) {
    const node = await resolveRegistryItem(specifier, {
      shadcnStyle: style || undefined,
    });
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
    style,
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

export interface VersionRequirements {
  dependencies: string[];
  devDependencies: string[];
  registryDependencies: string[];
  envVars: string[];
}

export interface VersionChanges {
  /**
   * False when either version was imported from git history. Those only
   * know their files, so `changes` then covers files only.
   */
  complete: boolean;
  changes: ItemChanges;
  /** What `to` needs installed. Null when `to` was imported from git. */
  requires: VersionRequirements | null;
}

function getStrings(item: SnapshotItem, key: string) {
  const value = item[key];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

/** What changed between two stored versions of the same item. */
export async function getVersionChanges(
  fromId: string,
  toId: string,
): Promise<VersionChanges | null> {
  if (!db) return null;

  const rows = await db
    .select({
      id: snapshots.id,
      itemId: snapshots.itemId,
      item: snapshots.item,
      origin: snapshots.origin,
    })
    .from(snapshots)
    .where(inArray(snapshots.id, [fromId, toId]));

  const from = rows.find((row) => row.id === fromId);
  const to = rows.find((row) => row.id === toId);
  if (!from || !to || from.itemId !== to.itemId) return null;

  const item = to.item as SnapshotItem;
  const envVars = item.envVars;

  return {
    complete: from.origin === "crawl" && to.origin === "crawl",
    changes: compareVersions(
      { item: from.item as SnapshotItem, origin: from.origin },
      { item, origin: to.origin },
    ),
    requires:
      to.origin === "crawl"
        ? {
            dependencies: getStrings(item, "dependencies"),
            devDependencies: getStrings(item, "devDependencies"),
            registryDependencies: getStrings(item, "registryDependencies"),
            envVars:
              envVars && typeof envVars === "object" && !Array.isArray(envVars)
                ? Object.keys(envVars)
                : [],
          }
        : null,
  };
}
