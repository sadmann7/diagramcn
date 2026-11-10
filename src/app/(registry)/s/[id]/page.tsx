import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { inspectRegistry } from "@/lib/registry/inspect";
import { getStack } from "@/lib/stacks";

import { StackBuilder } from "../../components/stack-builder";

interface SavedStackPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SavedStackPageProps): Promise<Metadata> {
  const stack = await getStack((await params).id);
  if (!stack) return {};

  const image = `/api/og?q=${encodeURIComponent(stack.specifiers.join(" "))}`;
  return {
    title: `Stack: ${stack.specifiers.join(" + ")}`,
    description: `Install ${stack.specifiers.length} shadcn registry items with one command.`,
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function SavedStackPage({ params }: SavedStackPageProps) {
  const stack = await getStack((await params).id);
  if (!stack) notFound();

  const result = await inspectRegistry(stack.specifiers.join(" "));

  return (
    <StackBuilder
      specifiers={result?.specifiers ?? stack.specifiers}
      result={result}
      savedId={stack.id}
      canSave
    />
  );
}
