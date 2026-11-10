import { pgTableCreator } from "drizzle-orm/pg-core";

/** Every table is prefixed, so the database can be shared with other apps. */
export const DATABASE_PREFIX = "diagramcn";

export const pgTable = pgTableCreator((name) => `${DATABASE_PREFIX}_${name}`);
