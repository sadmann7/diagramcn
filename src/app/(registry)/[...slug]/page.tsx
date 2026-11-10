import type { Metadata } from "next";

import { getInspectSummary, inspectRegistry } from "@/lib/registry/inspect";

import { InspectView } from "../components/inspect-view";

interface ItemPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ style?: string; shadcnStyle?: string }>;
}

/** `/@acme/data-table` → `@acme/data-table`, `/button` → `button`. */
async function getSpecifier(params: ItemPageProps["params"]) {
  const { slug } = await params;
  return slug.map((segment) => decodeURIComponent(segment)).join("/");
}

export async function generateMetadata({
  params,
}: ItemPageProps): Promise<Metadata> {
  const result = await inspectRegistry(await getSpecifier(params));
  if (!result) return {};

  const summary = getInspectSummary(result);
  const image = `/api/og?q=${encodeURIComponent(result.specifiers.join(" "))}`;
  return {
    title: result.specifiers.join(" + "),
    openGraph: { images: [image] },
    twitter: { card: "summary_large_image", images: [image] },
    description: `What shadcn add ${result.specifiers.join(" ")} installs: ${summary.items} items, ${summary.files} files, ${summary.dependencies} packages, ${summary.errors} errors, ${summary.warnings} warnings.`,
  };
}

export default async function ItemPage({
  params,
  searchParams,
}: ItemPageProps) {
  const { style, shadcnStyle } = await searchParams;
  return (
    <InspectView
      input={await getSpecifier(params)}
      style={style}
      shadcnStyle={shadcnStyle}
    />
  );
}
