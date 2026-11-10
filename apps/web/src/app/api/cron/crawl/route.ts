import { NextResponse } from "next/server";

import { env } from "@/env";
import { deleteExpiredRateLimits } from "@/lib/rate-limit";
import { crawl, isTrackingEnabled } from "@/lib/tracking/track";

export const maxDuration = 300;

// Runs hourly (see vercel.json). Registry indexes are re-read for new
// items once a day, in this run.
const SEED_HOUR_UTC = 6;

export async function GET(req: Request) {
  const authorization = req.headers.get("authorization");
  const isAuthorized = env.CRON_SECRET
    ? authorization === `Bearer ${env.CRON_SECRET}`
    : env.NODE_ENV === "development";

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isTrackingEnabled) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set" },
      { status: 503 },
    );
  }

  const result = await crawl({
    seed: new Date().getUTCHours() === SEED_HOUR_UTC,
  });
  await deleteExpiredRateLimits();
  console.log(
    `Crawled ${result.checked} items in ${result.durationMs}ms: ${result.added} new, ${result.changed.length} changed, ${result.failed.length} failed`,
  );

  return NextResponse.json(result);
}
