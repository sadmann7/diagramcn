import { rateLimits } from "@diagramcn/db/schema";
import { lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db as defaultDb, type Db } from "@/db";
import { sha256 } from "@/lib/tracking/snapshot";

export interface RateLimit {
  /** Requests allowed per window. */
  limit: number;
  windowMs: number;
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSeconds: number };

/** The client IP. Vercel sets `x-forwarded-for` itself, so it can't be spoofed there. */
export function getClientIp(req: Request) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/**
 * Counts one request against `name` for this client. Counters live in
 * Postgres, so the limit holds across serverless instances. Without a
 * database every request is allowed; the limited routes need one anyway.
 */
export async function checkRateLimit(
  req: Request,
  name: string,
  { limit, windowMs }: RateLimit,
  db: Db | null = defaultDb,
): Promise<RateLimitResult> {
  if (!db) return { ok: true };

  const now = new Date();
  const key = `${name}:${sha256(getClientIp(req)).slice(0, 32)}`;
  // Same format drizzle writes `timestamp` columns in, so comparisons don't
  // depend on the database's time zone.
  const nowValue = sql`${now.toISOString()}::timestamp`;
  const expired = sql`${rateLimits.resetAt} <= ${nowValue}`;

  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, resetAt: new Date(now.getTime() + windowMs) })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${expired} then 1 else ${rateLimits.count} + 1 end`,
        resetAt: sql`case when ${expired} then excluded.reset_at else ${rateLimits.resetAt} end`,
      },
    })
    .returning({ count: rateLimits.count, resetAt: rateLimits.resetAt });

  if (!row || row.count <= limit) return { ok: true };
  return {
    ok: false,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000),
    ),
  };
}

function formatWait(seconds: number) {
  if (seconds < 60) return `${seconds} ${seconds === 1 ? "second" : "seconds"}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
}

export function rateLimitedResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: `Too many requests. Try again in ${formatWait(retryAfterSeconds)}.`,
    },
    { status: 429, headers: { "retry-after": String(retryAfterSeconds) } },
  );
}

export async function deleteExpiredRateLimits(db: Db | null = defaultDb) {
  if (!db) return;
  await db.delete(rateLimits).where(lt(rateLimits.resetAt, new Date()));
}
