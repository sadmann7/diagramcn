import { items, snapshots } from "@diagramcn/db/schema";
import { sql } from "drizzle-orm";

import { db } from "@/db";
import { inspectRegistry } from "@/lib/registry/inspect";
import {
  compareVersions,
  getChangeSummary,
  type ItemChanges,
  type SnapshotItem,
} from "@/lib/tracking/compare";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface ChangeEvent {
  snapshotId: string;
  specifier: string;
  style: string;
  namespace: string | null;
  name: string;
  fetchedAt: string;
  summary: string;
  changes: ItemChanges;
}

export interface ChangesFilter {
  namespace?: string;
  /** Only these items, e.g. everything in a stack. */
  specifiers?: string[];
  /** Only this `@shadcn` style. Every style when unset. */
  style?: string;
  /** Only changes before this time, for pagination. */
  before?: Date;
  limit?: number;
}

interface ChangeRow extends Record<string, unknown> {
  snapshot_id: string;
  specifier: string;
  style: string;
  namespace: string | null;
  name: string;
  fetched_at: Date | string;
  item: SnapshotItem;
  origin: "crawl" | "git";
  previous_item: SnapshotItem;
  previous_origin: "crawl" | "git";
}

/**
 * Recent versions that changed something, newest first. First versions
 * aren't changes, so the inner lateral join (which needs a previous
 * version) leaves them out.
 */
export async function getRecentChanges({
  namespace,
  specifiers,
  style,
  before,
  limit = DEFAULT_LIMIT,
}: ChangesFilter = {}): Promise<ChangeEvent[] | null> {
  if (!db) return null;
  if (specifiers && specifiers.length === 0) return [];

  const conditions = [
    namespace ? sql`${items.namespace} = ${namespace}` : null,
    // Other registries have no style, so they always match.
    style ? sql`${items.style} in ('', ${style})` : null,
    specifiers
      ? sql`${items.specifier} in (${sql.join(
          specifiers.map((specifier) => sql`${specifier}`),
          sql`, `,
        )})`
      : null,
    before
      ? sql`${snapshots.fetchedAt} < (${before.toISOString()}::timestamptz at time zone 'UTC')`
      : null,
  ].filter((condition) => condition !== null);

  const rows = await db.execute<ChangeRow>(sql`
    select
      ${snapshots.id} as snapshot_id,
      ${items.specifier} as specifier,
      ${items.style} as style,
      ${items.namespace} as namespace,
      ${items.name} as name,
      -- timestamp columns hold UTC; raw rows would otherwise parse as local time
      ${snapshots.fetchedAt} at time zone 'UTC' as fetched_at,
      ${snapshots.item} as item,
      ${snapshots.origin} as origin,
      previous.item as previous_item,
      previous.origin as previous_origin
    from ${snapshots}
    inner join ${items} on ${items.id} = ${snapshots.itemId}
    inner join lateral (
      select p.item, p.origin
      from ${snapshots} p
      where p.item_id = ${snapshots.itemId}
        and p.fetched_at < ${snapshots.fetchedAt}
      order by p.fetched_at desc
      limit 1
    ) previous on true
    ${conditions.length > 0 ? sql`where ${sql.join(conditions, sql` and `)}` : sql``}
    order by ${snapshots.fetchedAt} desc
    limit ${Math.min(limit, MAX_LIMIT)}
  `);

  return rows.map((row) => {
    const changes = compareVersions(
      { item: row.previous_item, origin: row.previous_origin },
      { item: row.item, origin: row.origin },
    );
    return {
      snapshotId: row.snapshot_id,
      specifier: row.specifier,
      style: row.style,
      namespace: row.namespace,
      name: row.name,
      fetchedAt: new Date(row.fetched_at).toISOString(),
      summary: getChangeSummary(changes),
      changes,
    };
  });
}

/** Namespaces that have at least one tracked item, for filtering. */
export async function getTrackedNamespaces(): Promise<string[]> {
  if (!db) return [];

  const rows = await db
    .selectDistinct({ namespace: items.namespace })
    .from(items)
    .orderBy(items.namespace);

  return rows.flatMap((row) => (row.namespace ? [row.namespace] : []));
}

/**
 * The items a query follows: what it names plus everything those depend on,
 * since a change to `button` affects every stack that uses it.
 */
export async function getFollowedSpecifiers(query: string, style?: string) {
  const result = await inspectRegistry(query, style);
  if (!result) return null;

  return {
    roots: result.specifiers,
    specifiers: result.graph.nodes
      .filter((node) => node.item)
      .map((node) => node.specifier),
  };
}
