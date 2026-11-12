import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchRegistryJson, RegistryFetchError } from "@/lib/registry-fetch";
import { registryItemSchema } from "@/lib/validations/registry";

const requestSchema = z.object({
  url: z.string().url({
    message: "Please provide a valid URL",
  }),
});

export async function POST(req: Request) {
  try {
    const { url } = requestSchema.parse(await req.json());

    const data = registryItemSchema.parse(await fetchRegistryJson(url));
    return NextResponse.json(data);
  } catch (error) {
    if (error instanceof RegistryFetchError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch registry data" },
      { status: 500 },
    );
  }
}
