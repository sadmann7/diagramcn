import { NextResponse } from "next/server";

import { getVersionFileDiffs } from "@/lib/tracking/history";

export async function GET(req: Request) {
  const snapshotId = new URL(req.url).searchParams.get("snapshot");

  if (!snapshotId) {
    return NextResponse.json(
      { error: "Pass a snapshot id as ?snapshot=" },
      { status: 400 },
    );
  }

  const diffs = await getVersionFileDiffs(snapshotId);

  if (!diffs) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Snapshots never change, so their diffs can be cached for good.
  return NextResponse.json(diffs, {
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  });
}
