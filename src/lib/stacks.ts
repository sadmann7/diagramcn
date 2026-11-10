import { eq } from "drizzle-orm";

import { db } from "@/db";
import { stacks } from "@/db/schema";
import { inspectRegistry } from "@/lib/registry/inspect";
import { parseAddInput } from "@/lib/registry/specifier";
import { sha256 } from "@/lib/tracking/snapshot";

export const MAX_STACK_ITEMS = 50;

export type SaveStackResult =
  | { status: "saved"; id: string }
  | { status: "invalid"; message: string; unresolved?: string[] }
  | { status: "disabled" };

/**
 * Saves a stack and returns its short id. Identical lists share one id, so
 * saving twice doesn't create duplicates. Every item must resolve, so links
 * never point at stacks the CLI can't install.
 */
export async function saveStack(input: string): Promise<SaveStackResult> {
  if (!db) return { status: "disabled" };

  const specifiers = parseAddInput(input);
  if (specifiers.length === 0) {
    return { status: "invalid", message: "No registry items found" };
  }
  if (specifiers.length > MAX_STACK_ITEMS) {
    return {
      status: "invalid",
      message: `A stack can have at most ${MAX_STACK_ITEMS} items`,
    };
  }

  const result = await inspectRegistry(specifiers.join(" "));
  const unresolved = (result?.graph.nodes ?? [])
    .filter((node) => node.depth === 0 && !node.item)
    .map((node) => node.specifier);

  if (!result || unresolved.length > 0) {
    return {
      status: "invalid",
      message: "Some items could not be resolved",
      unresolved,
    };
  }

  const hash = sha256(JSON.stringify(specifiers));

  const [inserted] = await db
    .insert(stacks)
    .values({ hash, specifiers })
    .onConflictDoNothing({ target: stacks.hash })
    .returning({ id: stacks.id });

  if (inserted) return { status: "saved", id: inserted.id };

  const [existing] = await db
    .select({ id: stacks.id })
    .from(stacks)
    .where(eq(stacks.hash, hash))
    .limit(1);

  if (!existing) throw new Error("Failed to save stack");
  return { status: "saved", id: existing.id };
}

export async function getStack(id: string) {
  if (!db) return null;

  const [stack] = await db
    .select()
    .from(stacks)
    .where(eq(stacks.id, id))
    .limit(1);

  return stack ?? null;
}
