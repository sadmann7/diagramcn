import { NextResponse } from "next/server";

import { createStackItemResponse } from "@/lib/registry/stack-item";
import { SITE_URL } from "@/lib/site";
import { getStack } from "@/lib/stacks";

interface RouteContext {
  params: Promise<{ file: string }>;
}

/** A saved stack as one registry item: `shadcn add <origin>/r/<id>.json`. */
export async function GET(_req: Request, { params }: RouteContext) {
  const { file } = await params;
  const id = file.replace(/\.json$/, "");
  const stack = await getStack(id);

  if (!stack) {
    return NextResponse.json({ error: "Stack not found" }, { status: 404 });
  }

  return createStackItemResponse(stack.specifiers.join(" "), {
    shadcnStyle: stack.style ?? undefined,
    viewUrl: `${SITE_URL}/s/${stack.id}`,
  });
}
