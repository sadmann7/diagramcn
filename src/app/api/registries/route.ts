import { NextResponse } from "next/server";

import { listRegistries } from "@/lib/registry/browse";

export async function GET() {
  try {
    return NextResponse.json(await listRegistries(), {
      headers: { "cache-control": "public, s-maxage=3600" },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load the registry directory" },
      { status: 502 },
    );
  }
}
