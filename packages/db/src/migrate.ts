import { migrate } from "drizzle-orm/postgres-js/migrator";

import { createDb } from ".";

async function runMigrate() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  console.log("⏳ Running migrations...");
  const start = Date.now();

  const db = createDb(url);
  await migrate(db, { migrationsFolder: "drizzle" });
  await db.$client.end();

  console.log(`✅ Migrations completed in ${Date.now() - start}ms`);
}

runMigrate().catch((error: unknown) => {
  console.error("❌ Migration failed");
  console.error(error);
  process.exit(1);
});
