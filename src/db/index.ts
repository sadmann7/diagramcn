import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";

import * as schema from "./schema";

function createDb(url: string) {
  return drizzle(postgres(url), { schema });
}

export type Db = ReturnType<typeof createDb>;

/** Null when DATABASE_URL isn't set; change tracking is skipped then. */
export const db: Db | null = env.DATABASE_URL
  ? createDb(env.DATABASE_URL)
  : null;
