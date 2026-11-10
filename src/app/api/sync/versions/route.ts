import { NextResponse } from "next/server";

import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { getItemVersions } from "@/lib/tracking/versions";

// The CLI asks once per item, and untracked items get fetched and stored.
const LIMIT = { limit: 120, windowMs: 10 * 60 * 1000 };

export async function GET(req: Request) {
  const specifier = new URL(req.url).searchParams.get("specifier")?.trim();

  if (!specifier) {
    return NextResponse.json(
      { error: "Pass an item as ?specifier=, e.g. ?specifier=@shadcn/button" },
      { status: 400 },
    );
  }

  const rateLimit = await checkRateLimit(req, "sync-versions", LIMIT);
  if (!rateLimit.ok) return rateLimitedResponse(rateLimit.retryAfterSeconds);

  const result = await getItemVersions(specifier);

  switch (result.status) {
    case "ok":
      return NextResponse.json({
        specifier: result.specifier,
        versions: result.versions,
      });
    case "not-found":
      return NextResponse.json({ error: result.error }, { status: 404 });
    case "disabled":
      return NextResponse.json(
        { error: "Change tracking isn't enabled on this deployment" },
        { status: 503 },
      );
  }
}
