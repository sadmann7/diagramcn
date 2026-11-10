import { NextResponse } from "next/server";

import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { inspectRegistry } from "@/lib/registry/inspect";

// Each inspection fetches the whole dependency graph and records it.
const LIMIT = { limit: 60, windowMs: 60 * 1000 };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Pass registry items as ?q=, e.g. ?q=@shadcn/button" },
      { status: 400 },
    );
  }

  const rateLimit = await checkRateLimit(req, "inspect", LIMIT);
  if (!rateLimit.ok) return rateLimitedResponse(rateLimit.retryAfterSeconds);

  const result = await inspectRegistry(
    query,
    searchParams.get("shadcnStyle") ?? undefined,
    searchParams.get("style") ?? undefined,
  );

  if (!result) {
    return NextResponse.json(
      { error: "No registry items found in the query" },
      { status: 400 },
    );
  }

  return NextResponse.json(result, {
    headers: { "cache-control": "public, s-maxage=300" },
  });
}
