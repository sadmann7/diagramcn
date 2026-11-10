import type { z } from "zod";

import { fetchPublicJson } from "@/lib/registry/fetch";
import {
  isUrlSpecifier,
  normalizeSpecifier,
  parseNamespacedSpecifier,
  SHADCN_NAMESPACE,
} from "@/lib/registry/specifier";
import { DEFAULT_SHADCN_STYLE } from "@/lib/registry/styles";
import {
  type RegistryIndexEntry,
  type RegistryItem,
  registryIndexSchema,
  registryItemSchema,
} from "@/lib/validations/registry";

const REGISTRIES_INDEX_URL = "https://ui.shadcn.com/r/registries.json";
const SHADCN_ITEM_URL = "https://ui.shadcn.com/r/styles/{style}/{name}.json";

const MAX_NODES = 150;
const MAX_DEPTH = 15;
const REGISTRIES_INDEX_TTL_MS = 60 * 60 * 1000;

export interface ResolveOptions {
  /** Style used for `@shadcn` items, e.g. `new-york-v4`. */
  shadcnStyle?: string;
  /** Value for `{style}` in third-party registry URL templates. */
  style?: string;
}

export interface RegistryInfo {
  namespace: string;
  homepage: string | null;
  description: string | null;
  health: RegistryIndexEntry["health"] | null;
}

export interface ResolvedNode {
  /** Canonical id: the resolved URL, or the specifier if it couldn't be resolved. */
  id: string;
  specifier: string;
  url: string | null;
  namespace: string | null;
  depth: number;
  /**
   * The style an `@shadcn` item was resolved in, e.g. `radix-nova`. Empty
   * for other registries. Items are tracked per specifier and style.
   */
  style: string;
  item: RegistryItem | null;
  error: string | null;
}

export interface ResolvedEdge {
  from: string;
  to: string;
}

export interface ResolvedGraph {
  roots: string[];
  nodes: ResolvedNode[];
  edges: ResolvedEdge[];
  registries: RegistryInfo[];
  truncated: boolean;
}

let registriesIndexPromise: Promise<Map<string, RegistryIndexEntry>> | null =
  null;
let registriesIndexFetchedAt = 0;

export function getRegistriesIndex() {
  if (Date.now() - registriesIndexFetchedAt > REGISTRIES_INDEX_TTL_MS) {
    registriesIndexPromise = null;
  }
  if (!registriesIndexPromise) registriesIndexFetchedAt = Date.now();
  registriesIndexPromise ??= fetchPublicJson(REGISTRIES_INDEX_URL)
    .then((data) => {
      const entries = registryIndexSchema.parse(data);
      return new Map(entries.map((entry) => [entry.name, entry]));
    })
    .catch((error: unknown) => {
      registriesIndexPromise = null;
      throw error;
    });
  return registriesIndexPromise;
}

function formatZodError(error: z.ZodError) {
  return error.issues
    .slice(0, 5)
    .map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join("; ");
}

async function resolveSpecifierUrl(
  specifier: string,
  options: Required<ResolveOptions>,
): Promise<{ url: string; namespace: string | null }> {
  if (isUrlSpecifier(specifier)) {
    return { url: specifier, namespace: null };
  }

  const parsed = parseNamespacedSpecifier(specifier);
  if (!parsed) {
    throw new Error(`Invalid registry item specifier: ${specifier}`);
  }

  const { namespace, name } = parsed;
  let template: string;

  if (namespace === SHADCN_NAMESPACE) {
    template = SHADCN_ITEM_URL.replace("{style}", options.shadcnStyle);
  } else {
    const index = await getRegistriesIndex();
    const entry = index.get(namespace);
    if (!entry) {
      throw new Error(
        `Unknown registry ${namespace}. It is not listed in the shadcn registry directory, so it needs to be configured in components.json.`,
      );
    }
    template = entry.url.replaceAll("{style}", options.style);
  }

  return { url: template.replaceAll("{name}", name), namespace };
}

/**
 * Turns a `registryDependencies` entry into a specifier. Bare names point to
 * the `@shadcn` namespace, relative paths resolve against the parent item.
 */
function getDependencySpecifier(dependency: string, parentUrl: string | null) {
  const trimmed = dependency.trim();
  if (
    parentUrl &&
    (trimmed.startsWith("./") || trimmed.startsWith("../")) &&
    trimmed.endsWith(".json")
  ) {
    return new URL(trimmed, parentUrl).toString();
  }
  return normalizeSpecifier(trimmed);
}

async function resolveNode(
  specifier: string,
  depth: number,
  options: Required<ResolveOptions>,
): Promise<ResolvedNode> {
  let url: string | null = null;
  let namespace: string | null = null;
  const style =
    parseNamespacedSpecifier(specifier)?.namespace === SHADCN_NAMESPACE
      ? options.shadcnStyle
      : "";

  try {
    ({ url, namespace } = await resolveSpecifierUrl(specifier, options));
    const data = await fetchPublicJson(url);
    const result = registryItemSchema.safeParse(data);

    if (!result.success) {
      return {
        id: url,
        specifier,
        url,
        namespace,
        depth,
        style,
        item: null,
        error: `Invalid registry item: ${formatZodError(result.error)}`,
      };
    }

    return {
      id: url,
      specifier,
      url,
      namespace,
      depth,
      style,
      item: result.data,
      error: null,
    };
  } catch (error) {
    return {
      id: url ?? specifier,
      specifier,
      url,
      namespace,
      depth,
      style,
      item: null,
      error: error instanceof Error ? error.message : "Failed to resolve item",
    };
  }
}

function getResolvedOptions(options: ResolveOptions): Required<ResolveOptions> {
  return {
    shadcnStyle: options.shadcnStyle ?? DEFAULT_SHADCN_STYLE,
    style: options.style ?? "new-york",
  };
}

/** Resolves and fetches a single item, without its dependencies. */
export function resolveRegistryItem(
  specifier: string,
  options: ResolveOptions = {},
) {
  return resolveNode(specifier, 0, getResolvedOptions(options));
}

/**
 * Resolves the full `registryDependencies` tree for a set of specifiers,
 * across registries, breadth first. Failures are recorded on the node
 * instead of failing the whole graph.
 */
export async function resolveRegistryGraph(
  specifiers: string[],
  options: ResolveOptions = {},
): Promise<ResolvedGraph> {
  const resolvedOptions = getResolvedOptions(options);

  const nodes = new Map<string, ResolvedNode>();
  const idBySpecifier = new Map<string, string>();
  const edges: ResolvedEdge[] = [];
  const roots: string[] = [];
  let truncated = false;

  let queue = specifiers.map((specifier) => ({
    specifier,
    parentId: null as string | null,
  }));

  for (let depth = 0; queue.length > 0; depth++) {
    const pending = new Map<string, string[]>();
    const nextQueue: typeof queue = [];

    for (const { specifier, parentId } of queue) {
      const knownId = idBySpecifier.get(specifier);
      if (knownId) {
        if (parentId) edges.push({ from: parentId, to: knownId });
        else if (!roots.includes(knownId)) roots.push(knownId);
        continue;
      }
      const parents = pending.get(specifier) ?? [];
      if (parentId) parents.push(parentId);
      pending.set(specifier, parents);
    }

    if (depth > MAX_DEPTH || nodes.size + pending.size > MAX_NODES) {
      truncated = pending.size > 0;
      break;
    }

    const resolved = await Promise.all(
      [...pending.keys()].map((specifier) =>
        resolveNode(specifier, depth, resolvedOptions),
      ),
    );

    for (const node of resolved) {
      const existing = nodes.get(node.id);
      const id = existing?.id ?? node.id;
      idBySpecifier.set(node.specifier, id);
      if (!existing) nodes.set(id, node);

      const parents = pending.get(node.specifier) ?? [];
      if (depth === 0 && !roots.includes(id)) roots.push(id);
      for (const parentId of parents) edges.push({ from: parentId, to: id });

      if (existing) continue;

      for (const dependency of node.item?.registryDependencies ?? []) {
        nextQueue.push({
          specifier: getDependencySpecifier(dependency, node.url),
          parentId: id,
        });
      }
    }

    queue = nextQueue;
  }

  const namespaces = new Set(
    [...nodes.values()]
      .map((node) => node.namespace)
      .filter((namespace): namespace is string => !!namespace),
  );

  const index = await getRegistriesIndex().catch(() => null);
  const registries: RegistryInfo[] = [...namespaces].map((namespace) => {
    const entry = index?.get(namespace);
    return {
      namespace,
      homepage:
        entry?.homepage ??
        (namespace === SHADCN_NAMESPACE ? "https://ui.shadcn.com" : null),
      description: entry?.description ?? null,
      health: entry?.health ?? null,
    };
  });

  const uniqueEdges = [
    ...new Map(
      edges.map((edge) => [`${edge.from}\n${edge.to}`, edge] as const),
    ).values(),
  ];

  return {
    roots,
    nodes: [...nodes.values()],
    edges: uniqueEdges,
    registries,
    truncated,
  };
}
