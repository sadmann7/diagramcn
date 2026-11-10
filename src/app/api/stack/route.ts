import { NextResponse } from "next/server";

import { createStackItemResponse } from "@/lib/registry/stack-item";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
    return NextResponse.json(
      {
        error:
          "Pass registry items as ?q=, e.g. ?q=@shadcn/sidebar-07 @magicui/marquee",
      },
      { status: 400 },
    );
  }

  return createStackItemResponse(query, {
    shadcnStyle: searchParams.get("shadcnStyle") ?? undefined,
    style: searchParams.get("style") ?? undefined,
  });
}
