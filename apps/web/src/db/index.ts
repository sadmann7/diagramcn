import { createDb, type Db } from "@diagramcn/db";

import { env } from "@/env";

export type { Db };

/** Null when DATABASE_URL isn't set; change tracking is skipped then. */
export const db: Db | null = env.DATABASE_URL
  ? createDb(env.DATABASE_URL)
  : null;
