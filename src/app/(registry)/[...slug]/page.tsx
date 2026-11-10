import type { Metadata } from "next";

import { getItem, ItemView } from "../components/item-view";

interface ItemPageProps {
  params: Promise<{ slug: string[] }>;
}

/** `/@acme/data-table` → `@acme/data-table`, `/button` → `button`. */
async function getInput(params: ItemPageProps["params"]) {
  const { slug } = await params;
  return slug.map((segment) => decodeURIComponent(segment)).join("/");
}

export async function generateMetadata({
  params,
}: ItemPageProps): Promise<Metadata> {
  const { specifier, item } = await getItem(await getInput(params));
  return {
    title: specifier,
    description:
      item?.description ??
      `Version history of ${specifier}, and how to pull its upstream changes into your copy.`,
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  return <ItemView input={await getInput(params)} />;
}
