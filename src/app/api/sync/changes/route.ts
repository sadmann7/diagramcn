import { NextResponse } from "next/server";

import { getVersionChanges } from "@/lib/tracking/versions";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!from || !to) {
    return NextResponse.json(
      { error: "Pass two version ids as ?from=&to=" },
      { status: 400 },
    );
  }

  const changes = await getVersionChanges(from, to);

  if (!changes) {
    return NextResponse.json(
      { error: "Versions not found, or not of the same item" },
      { status: 404 },
    );
  }

  // Versions never change, so neither does the comparison.
  return NextResponse.json(changes, {
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  });
}
