import type { Metadata } from "next";

import { inspectRegistry } from "@/lib/registry/inspect";
import { parseAddInput } from "@/lib/registry/specifier";
import { isTrackingEnabled } from "@/lib/tracking/track";

import { StackBuilder } from "../components/stack-builder";

interface StackPageProps {
  searchParams: Promise<{ q?: string }>;
}

export async function generateMetadata({
  searchParams,
}: StackPageProps): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const specifiers = parseAddInput(q);
  if (specifiers.length === 0) return { title: "Stack" };

  const image = `/api/og?q=${encodeURIComponent(specifiers.join(" "))}`;
  return {
    title: `Stack: ${specifiers.join(" + ")}`,
    description: `Install ${specifiers.length} shadcn registry items with one command.`,
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function StackPage({ searchParams }: StackPageProps) {
  const { q = "" } = await searchParams;
  const result = q ? await inspectRegistry(q) : null;

  return (
    <StackBuilder
      specifiers={result?.specifiers ?? []}
      result={result}
      canSave={isTrackingEnabled}
    />
  );
}
