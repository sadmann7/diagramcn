import type { Metadata } from "next";

import { inspectRegistry } from "@/lib/registry/inspect";
import { parseAddInput } from "@/lib/registry/specifier";
import { isTrackingEnabled } from "@/lib/tracking/track";

import { CanvasBuilder } from "../components/canvas-builder";

interface CanvasPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: CanvasPageProps): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const specifiers = parseAddInput(q);
  if (specifiers.length === 0) return { title: "Canvas" };

  return {
    title: `Canvas: ${specifiers.join(" + ")}`,
    description: `${specifiers.length} shadcn registry items, how they fit together, and one command to install them.`,
  };
}

export default async function CanvasPage({ searchParams }: CanvasPageProps) {
  const { q = "" } = await searchParams;
  const result = q ? await inspectRegistry(q) : null;

  return (
    <CanvasBuilder
      specifiers={result?.specifiers ?? []}
      result={result}
      canSave={isTrackingEnabled}
    />
  );
}
