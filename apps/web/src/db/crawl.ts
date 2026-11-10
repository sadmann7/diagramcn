import { crawl } from "@/lib/tracking/track";

async function runCrawl() {
  const limit = Number(process.argv[2]) || undefined;

  console.log("⏳ Crawling registry items...");

  const result = await crawl({ limit });

  console.log(
    `✅ Checked ${result.checked} items in ${result.durationMs}ms (${result.seeded} newly tracked)`,
  );
  console.log(`   ${result.added} first versions stored`);
  console.log(`   ${result.changed.length} changed upstream`);
  for (const specifier of result.changed) console.log(`   ~ ${specifier}`);
  console.log(
    `   ${result.backfilled.length} items got older versions from git history`,
  );
  for (const failure of result.failed) {
    console.log(`   ✗ ${failure.specifier}: ${failure.error}`);
  }

  process.exit(0);
}

runCrawl().catch((error) => {
  console.error("❌ Crawl failed");
  console.error(error);
  process.exit(1);
});
