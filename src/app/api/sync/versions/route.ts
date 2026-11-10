import { NextResponse } from "next/server";

import { getItemVersions } from "@/lib/tracking/versions";

export async function GET(req: Request) {
  const specifier = new URL(req.url).searchParams.get("specifier")?.trim();

  if (!specifier) {
    return NextResponse.json(
      { error: "Pass an item as ?specifier=, e.g. ?specifier=@shadcn/button" },
      { status: 400 },
    );
  }

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
