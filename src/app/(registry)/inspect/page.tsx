import type { Metadata } from "next";

import { getInspectSummary, inspectRegistry } from "@/lib/registry/inspect";

import { InspectView } from "../components/inspect-view";

interface InspectPageProps {
  searchParams: Promise<{
    q?: string;
    style?: string;
    shadcnStyle?: string;
    tab?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: InspectPageProps): Promise<Metadata> {
  const { q = "" } = await searchParams;
  const result = q ? await inspectRegistry(q) : null;
  if (!result) return { title: "Inspect" };

  const summary = getInspectSummary(result);
  const image = `/api/og?q=${encodeURIComponent(result.specifiers.join(" "))}`;
  return {
    title: result.specifiers.join(" + "),
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
    description: `${summary.items} items, ${summary.files} files, ${summary.dependencies} packages, ${summary.errors} errors, ${summary.warnings} warnings.`,
  };
}

export default async function InspectPage({ searchParams }: InspectPageProps) {
  const { q = "", style, shadcnStyle, tab } = await searchParams;
  return (
    <InspectView input={q} style={style} shadcnStyle={shadcnStyle} tab={tab} />
  );
}
