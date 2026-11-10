import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";

import { pgTable } from "@/db/utils";
import { generateId } from "@/lib/id";

// Every registry item we've seen, from the crawler or from someone inspecting it.
export const items = pgTable(
  "items",
  {
    id: varchar("id", { length: 30 })
      .$defaultFn(() => generateId())
      .primaryKey(),
    // `@shadcn/button`, `@acme/foo`, or a full URL for unlisted registries.
    specifier: varchar("specifier", { length: 512 }).notNull().unique(),
    namespace: varchar("namespace", { length: 128 }),
    name: varchar("name", { length: 256 }).notNull(),
    url: text("url"),
    latestHash: varchar("latest_hash", { length: 64 }),
    lastCheckedAt: timestamp("last_checked_at"),
    lastChangedAt: timestamp("last_changed_at"),
    lastError: text("last_error"),
    failureCount: integer("failure_count").notNull().default(0),
    // When older versions were imported from the registry's git history.
    backfilledAt: timestamp("backfilled_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .default(sql`current_timestamp`)
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("diagramcn_items_last_checked_at_idx").on(table.lastCheckedAt),
    index("diagramcn_items_namespace_idx").on(table.namespace),
  ],
);

// One row per distinct version of an item. File contents live in `blobs`,
// so the stored item references them by `contentHash`.
export const snapshots = pgTable(
  "snapshots",
  {
    id: varchar("id", { length: 30 })
      .$defaultFn(() => generateId())
      .primaryKey(),
    itemId: varchar("item_id", { length: 30 })
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    hash: varchar("hash", { length: 64 }).notNull(),
    item: jsonb("item").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    // `crawl` versions are full items. `git` versions come from the
    // registry's source history and only know the files, so dependency
    // and CSS changes can't be compared against them.
    origin: varchar("origin", { length: 16, enum: ["crawl", "git"] })
      .notNull()
      .default("crawl"),
    commitSha: varchar("commit_sha", { length: 40 }),
  },
  (table) => [
    index("diagramcn_snapshots_item_id_fetched_at_idx").on(
      table.itemId,
      table.fetchedAt,
    ),
  ],
);

// File contents, stored once per sha256 so unchanged files cost nothing.
export const blobs = pgTable("blobs", {
  hash: varchar("hash", { length: 64 }).primaryKey(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Saved stacks behind short links. Never edited: saving a different list
// creates a new stack, and saving the same list returns the existing one.
export const stacks = pgTable("stacks", {
  id: varchar("id", { length: 30 })
    .$defaultFn(() => generateId({ length: 8 }))
    .primaryKey(),
  // sha256 of the specifier list, so identical stacks share a link.
  hash: varchar("hash", { length: 64 }).notNull().unique(),
  specifiers: jsonb("specifiers").$type<string[]>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
export type Snapshot = typeof snapshots.$inferSelect;
export type Stack = typeof stacks.$inferSelect;
