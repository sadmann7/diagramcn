import { blobs, items, snapshots } from "@diagramcn/db/schema";
import { and, asc, eq, isNotNull, ne, sql } from "drizzle-orm";

import { db as defaultDb, type Db } from "@/db";
import { env } from "@/env";
import { listRegistryItems } from "@/lib/registry/browse";
import { type ResolvedNode, resolveRegistryItem } from "@/lib/registry/resolve";
import { SHADCN_NAMESPACE } from "@/lib/registry/specifier";
import { shadcnStyles, TAILWIND_V3_STYLES } from "@/lib/registry/styles";
import {
  backfillItem,
  GitHubRateLimitError,
  getItemsToBackfill,
} from "@/lib/tracking/backfill";
import { createItemSnapshot } from "@/lib/tracking/snapshot";

export const isTrackingEnabled = defaultDb !== null;

/** `added` is an item's first version; `changed` a new one after that. */
type RecordResult = "added" | "changed" | "unchanged" | "failed";

function getItemName(node: ResolvedNode) {
  return node.item?.name ?? node.specifier.split("/").pop() ?? node.specifier;
}

/**
 * Upserts the item and stores a snapshot when its content hash differs from
 * the latest one. The hash swap and the snapshot insert share a transaction,
 * so concurrent recordings of the same version store it once.
 */
export async function recordNode(
  node: ResolvedNode,
  db: Db | null = defaultDb,
): Promise<RecordResult> {
  if (!db) return "unchanged";

  const now = new Date();

  if (!node.item) {
    await db
      .update(items)
      .set({
        lastCheckedAt: now,
        lastError: node.error ?? "Unknown error",
        failureCount: sql`${items.failureCount} + 1`,
      })
      .where(
        and(eq(items.specifier, node.specifier), eq(items.style, node.style)),
      );
    return "failed";
  }

  const snapshot = createItemSnapshot(node.item);

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(items)
      .values({
        specifier: node.specifier,
        style: node.style,
        namespace: node.namespace,
        name: getItemName(node),
        url: node.url,
        lastCheckedAt: now,
      })
      .onConflictDoUpdate({
        target: [items.specifier, items.style],
        set: {
          name: getItemName(node),
          url: node.url,
          lastCheckedAt: now,
          lastError: null,
          failureCount: 0,
        },
      })
      // The upsert leaves latestHash alone, so this is the previous one.
      .returning({ id: items.id, latestHash: items.latestHash });

    if (!row) throw new Error(`Failed to upsert ${node.specifier}`);

    const [changed] = await tx
      .update(items)
      .set({ latestHash: snapshot.hash, lastChangedAt: now })
      .where(
        and(
          eq(items.id, row.id),
          sql`${items.latestHash} is distinct from ${snapshot.hash}`,
        ),
      )
      .returning({ id: items.id });

    if (!changed) return "unchanged";

    if (snapshot.blobs.size > 0) {
      await tx
        .insert(blobs)
        .values(
          [...snapshot.blobs].map(([hash, content]) => ({ hash, content })),
        )
        .onConflictDoNothing();
    }

    await tx.insert(snapshots).values({
      itemId: row.id,
      hash: snapshot.hash,
      item: snapshot.item,
      fetchedAt: now,
    });

    return row.latestHash === null ? "added" : "changed";
  });
}

/** Records every successfully resolved node, e.g. after an inspection. */
export async function recordNodes(nodes: ResolvedNode[]) {
  await Promise.all(
    nodes
      .filter((node) => node.item)
      .map((node) =>
        recordNode(node).catch((error: unknown) => {
          console.error(`Failed to record ${node.specifier}:`, error);
        }),
      ),
  );
}

// Every current style, so any project can sync against real history. The
// Tailwind v3 styles are tracked once someone opens or syncs an item in them.
const SEEDED_STYLES = shadcnStyles
  .map((style) => style.name)
  .filter((name) => !TAILWIND_V3_STYLES.has(name));

/** Makes sure every official shadcn item is tracked, even if never inspected. */
async function seedShadcnItems(db: Db) {
  let seeded = 0;

  for (const style of SEEDED_STYLES) {
    const shadcnItems = await listRegistryItems(SHADCN_NAMESPACE, style);
    if (!shadcnItems?.length) continue;

    const inserted = await db
      .insert(items)
      .values(
        shadcnItems.map((item) => ({
          specifier: `${SHADCN_NAMESPACE}/${item.name}`,
          style,
          namespace: SHADCN_NAMESPACE,
          name: item.name,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: items.id });
    seeded += inserted.length;
  }

  return seeded;
}

// Bounds one registry's share of the daily crawl.
const MAX_ITEMS_PER_REGISTRY = 500;

/**
 * Tracks every item of each third-party registry someone has used. Items
 * are tracked once anyone opens, syncs or adds one, but a registry's other
 * items would otherwise never show up in its changes.
 */
async function seedFollowedRegistries(db: Db) {
  const rows = await db
    .selectDistinct({ namespace: items.namespace })
    .from(items)
    .where(
      and(isNotNull(items.namespace), ne(items.namespace, SHADCN_NAMESPACE)),
    );

  let seeded = 0;
  for (const { namespace } of rows) {
    if (!namespace) continue;
    const registryItems = await listRegistryItems(namespace).catch(() => null);
    if (!registryItems?.length) continue;

    const inserted = await db
      .insert(items)
      .values(
        registryItems.slice(0, MAX_ITEMS_PER_REGISTRY).map((item) => ({
          specifier: `${namespace}/${item.name}`,
          namespace,
          name: item.name,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: items.id });
    seeded += inserted.length;
  }

  return seeded;
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  fn: (value: T) => Promise<R>,
) {
  const results: R[] = [];
  let next = 0;

  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await fn(values[index] as T);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
}

export interface CrawlOptions {
  /** Most items to check in one run, least recently checked first. */
  limit?: number;
  concurrency?: number;
}

export interface CrawlResult {
  seeded: number;
  checked: number;
  /** Items whose first version was stored this run. */
  added: number;
  /** Items that changed upstream, e.g. `@shadcn/button (base-nova)`. */
  changed: string[];
  failed: { specifier: string; error: string }[];
  /** Items whose older versions were imported from git this run. */
  backfilled: string[];
  durationMs: number;
}

export async function crawl(
  { limit = 5000, concurrency = 8 }: CrawlOptions = {},
  db: Db | null = defaultDb,
): Promise<CrawlResult> {
  if (!db) throw new Error("DATABASE_URL is not set");

  const start = Date.now();
  const seeded =
    (await seedShadcnItems(db)) + (await seedFollowedRegistries(db));

  const due = await db
    .select({ specifier: items.specifier, style: items.style })
    .from(items)
    .orderBy(sql`${items.lastCheckedAt} asc nulls first`, asc(items.id))
    .limit(limit);

  const changed: string[] = [];
  const failed: CrawlResult["failed"] = [];
  let added = 0;

  await mapWithConcurrency(due, concurrency, async ({ specifier, style }) => {
    const label = style ? `${specifier} (${style})` : specifier;
    const node = await resolveRegistryItem(specifier, {
      shadcnStyle: style || undefined,
    });
    const result = await recordNode(node, db).catch((error: unknown) => {
      node.error = error instanceof Error ? error.message : "Failed to record";
      return "failed" as const;
    });

    if (result === "added") added++;
    if (result === "changed") changed.push(label);
    if (result === "failed") {
      failed.push({ specifier: label, error: node.error ?? "Unknown error" });
    }
  });

  // Import history a few items at a time, within GitHub's rate limit.
  const backfilled: string[] = [];
  for (const specifier of await getItemsToBackfill(
    env.GITHUB_TOKEN ? 50 : 5,
    db,
  )) {
    try {
      const result = await backfillItem(specifier, db);
      if (result.status === "done") backfilled.push(specifier);
    } catch (error) {
      if (error instanceof GitHubRateLimitError) break;
      failed.push({
        specifier,
        error: `Backfill: ${error instanceof Error ? error.message : "failed"}`,
      });
    }
  }

  return {
    seeded,
    backfilled,
    checked: due.length,
    added,
    changed,
    failed,
    durationMs: Date.now() - start,
  };
}
