import { pgTableCreator } from "drizzle-orm/pg-core";

import { DATABASE_PREFIX } from "@/lib/constants";

export const pgTable = pgTableCreator((name) => `${DATABASE_PREFIX}_${name}`);
