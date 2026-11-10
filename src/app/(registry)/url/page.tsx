import type { Metadata } from "next";

import { redirect } from "next/navigation";

import { getItem, ItemView } from "../components/item-view";

interface UrlItemPageProps {
  searchParams: Promise<{ q?: string; style?: string }>;
}

export async function generateMetadata({
  searchParams,
}: UrlItemPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q) return {};
  const { specifier, item } = await getItem(q);
  return { title: item?.name ?? specifier, description: item?.description };
}

/** The item page for items known only by URL: `/url?q=<item url>`. */
export default async function UrlItemPage({ searchParams }: UrlItemPageProps) {
  const { q, style } = await searchParams;
  if (!q) redirect("/");
  return <ItemView input={q} style={style} />;
}
