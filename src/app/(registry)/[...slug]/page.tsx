import type { Metadata } from "next";

import { getItem, ItemView } from "../components/item-view";

interface ItemPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<{ style?: string }>;
}

/** `/@acme/data-table` → `@acme/data-table`, `/button` → `button`. */
async function getInput(params: ItemPageProps["params"]) {
  const { slug } = await params;
  return slug.map((segment) => decodeURIComponent(segment)).join("/");
}

export async function generateMetadata({
  params,
  searchParams,
}: ItemPageProps): Promise<Metadata> {
  const { style } = await searchParams;
  const { specifier, item } = await getItem(await getInput(params), style);
  return {
    title: specifier,
    description:
      item?.description ??
      `Version history of ${specifier}, and how to pull its upstream changes into your copy.`,
  };
}

export default async function ItemPage({
  params,
  searchParams,
}: ItemPageProps) {
  const { style } = await searchParams;
  return <ItemView input={await getInput(params)} style={style} />;
}
