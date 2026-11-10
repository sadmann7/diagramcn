import { NextResponse } from "next/server";
import { z } from "zod";

import { checkRateLimit, rateLimitedResponse } from "@/lib/rate-limit";
import { saveStack } from "@/lib/stacks";

// Each save resolves every item and may store a new stack.
const LIMIT = { limit: 20, windowMs: 10 * 60 * 1000 };

const requestSchema = z.object({
  q: z.string().min(1).max(10_000),
});

export async function POST(req: Request) {
  const body = requestSchema.safeParse(await req.json().catch(() => null));

  if (!body.success) {
    return NextResponse.json(
      { error: "Pass the stack's items as { q }" },
      { status: 400 },
    );
  }

  const rateLimit = await checkRateLimit(req, "stacks", LIMIT);
  if (!rateLimit.ok) return rateLimitedResponse(rateLimit.retryAfterSeconds);

  const result = await saveStack(body.data.q);

  switch (result.status) {
    case "saved":
      return NextResponse.json({ id: result.id });
    case "invalid":
      return NextResponse.json(
        { error: result.message, unresolved: result.unresolved },
        { status: 422 },
      );
    case "disabled":
      return NextResponse.json(
        { error: "Saving stacks isn't enabled on this deployment" },
        { status: 503 },
      );
  }
}
