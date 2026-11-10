import type { Metadata } from "next";

import { notFound } from "next/navigation";

import { inspectRegistry } from "@/lib/registry/inspect";
import { getStack } from "@/lib/stacks";

import { CanvasBuilder } from "../../components/canvas-builder";

interface SavedCanvasPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: SavedCanvasPageProps): Promise<Metadata> {
  const stack = await getStack((await params).id);
  if (!stack) return {};

  return {
    title: `Canvas: ${stack.specifiers.join(" + ")}`,
    description: `${stack.specifiers.length} shadcn registry items, how they fit together, and one command to install them.`,
  };
}

export default async function SavedCanvasPage({
  params,
}: SavedCanvasPageProps) {
  const stack = await getStack((await params).id);
  if (!stack) notFound();

  const result = await inspectRegistry(stack.specifiers.join(" "));

  return (
    <CanvasBuilder
      specifiers={result?.specifiers ?? stack.specifiers}
      result={result}
      savedId={stack.id}
      canSave
    />
  );
}
