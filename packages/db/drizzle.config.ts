import type { Config } from "drizzle-kit";

import { DATABASE_PREFIX } from "./src/utils";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

export default {
  schema: "./src/schema.ts",
  dialect: "postgresql",
  out: "./drizzle",
  dbCredentials: { url },
  tablesFilter: [`${DATABASE_PREFIX}_*`],
} satisfies Config;
