import { NextResponse } from "next/server";

import { getVersionRegistryItem } from "@/lib/tracking/versions";

interface RouteContext {
  params: Promise<{ file: string }>;
}

/** One exact stored version of an item: `shadcn add <origin>/r/v/<id>.json`. */
export async function GET(_req: Request, { params }: RouteContext) {
  const { file } = await params;
  const item = await getVersionRegistryItem(file.replace(/\.json$/, ""));

  if (!item) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  // Versions never change.
  return NextResponse.json(item, {
    headers: { "cache-control": "public, max-age=31536000, immutable" },
  });
}
