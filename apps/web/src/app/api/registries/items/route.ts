import { NextResponse } from "next/server";

import { listRegistryItems } from "@/lib/registry/browse";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const namespace = searchParams.get("namespace");

  if (!namespace?.startsWith("@")) {
    return NextResponse.json(
      { error: "Pass a namespace, e.g. ?namespace=@magicui" },
      { status: 400 },
    );
  }

  const items = await listRegistryItems(
    namespace,
    searchParams.get("style") ?? undefined,
  ).catch(() => null);

  if (!items) {
    return NextResponse.json(
      { error: `${namespace} doesn't publish a registry index` },
      { status: 404 },
    );
  }

  return NextResponse.json(items, {
    headers: { "cache-control": "public, s-maxage=3600" },
  });
}
