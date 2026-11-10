import { NextResponse } from "next/server";

import { env } from "@/env";
import { deleteExpiredRateLimits } from "@/lib/rate-limit";
import { crawl, isTrackingEnabled } from "@/lib/tracking/track";

export const maxDuration = 300;

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

  const result = await crawl();
  await deleteExpiredRateLimits();
  console.log(
    `Crawled ${result.checked} items in ${result.durationMs}ms: ${result.changed.length} changed, ${result.failed.length} failed`,
  );

  return NextResponse.json(result);
}
