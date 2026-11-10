import { NextResponse } from "next/server";

import { inspectRegistry } from "@/lib/registry/inspect";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      { error: "Pass registry items as ?q=, e.g. ?q=@shadcn/button" },
      { status: 400 },
    );
  }

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
