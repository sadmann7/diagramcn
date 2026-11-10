import { z } from "zod";

import { fetchPublicJson } from "@/lib/registry/fetch";
import { getRegistriesIndex } from "@/lib/registry/resolve";
import { SHADCN_NAMESPACE } from "@/lib/registry/specifier";
import { getShadcnStyle } from "@/lib/registry/styles";

// Lists every item in a style, including blocks, unlike r/index.json. Each
// style ships its own set of items.
const SHADCN_REGISTRY_URL =
  "https://ui.shadcn.com/r/styles/{style}/registry.json";

// Types that aren't meant to be added on their own.
const hiddenTypes = new Set([
  "registry:style",
  "registry:base",
  "registry:example",
  "registry:internal",
]);

const browseItemSchema = z.looseObject({
  name: z.string(),
  type: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});

const registryJsonSchema = z.looseObject({
  items: z.array(z.unknown()),
});

export interface BrowseRegistry {
  namespace: string;
  description: string | null;
  status: string | null;
  itemCount: number | null;
}

export interface BrowseItem {
  name: string;
  type: string | null;
  description: string | null;
}

export async function listRegistries(): Promise<BrowseRegistry[]> {
  const index = await getRegistriesIndex();

  const registries = [...index.values()]
    .filter((entry) => !entry.health?.hidden)
    .sort((a, b) => (b.ranking?.score ?? 0) - (a.ranking?.score ?? 0))
    .map((entry) => ({
      namespace: entry.name,
      description: entry.description ?? null,
      status: entry.health?.status ?? null,
      itemCount: entry.ranking?.itemCount ?? null,
    }));

  return [
    {
      namespace: SHADCN_NAMESPACE,
      description: "The official shadcn/ui components and blocks.",
      status: "healthy",
      itemCount: null,
    },
    ...registries,
  ];
}

/**
 * Lists a registry's items from its `registry.json` index, the same file
 * `shadcn search` reads. Returns null when the registry doesn't publish one.
 */
export async function listRegistryItems(
  namespace: string,
  shadcnStyle?: string,
): Promise<BrowseItem[] | null> {
  let url = SHADCN_REGISTRY_URL.replace("{style}", getShadcnStyle(shadcnStyle));

  if (namespace !== SHADCN_NAMESPACE) {
    const entry = (await getRegistriesIndex()).get(namespace);
    if (!entry) return null;

    url = entry.url
      .replaceAll("{name}", "registry")
      .replaceAll("{style}", "new-york");
  }

  const data = await fetchPublicJson(url).catch(() => null);
  const result = registryJsonSchema.safeParse(data);
  if (!result.success) return null;

  return result.data.items.flatMap((raw) => {
    const result = browseItemSchema.safeParse(raw);
    if (!result.success) return [];

    const { name, type, title, description } = result.data;
    if ((type && hiddenTypes.has(type)) || name === "index") return [];

    return [
      {
        name,
        type: type ?? null,
        description: description ?? title ?? null,
      },
    ];
  });
}
