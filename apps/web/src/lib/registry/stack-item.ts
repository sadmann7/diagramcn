import { NextResponse } from "next/server";

import { siteConfig } from "@/config/site";
import { inspectRegistry } from "@/lib/registry/inspect";
import { SHADCN_NAMESPACE } from "@/lib/registry/specifier";

interface StackItemOptions {
  shadcnStyle?: string;
  style?: string;
  /** Where the stack can be viewed, shown by the CLI after installing. */
  viewUrl?: string;
}

/**
 * Serves a set of registry items as a single registry item, so one
 * `shadcn add <url>` installs all of them. Items are listed as
 * `registryDependencies`: `@shadcn` items by bare name so the CLI uses the
 * project's own style, everything else by resolved URL so it works without
 * configuring namespaces in components.json.
 */
export async function createStackItemResponse(
  query: string,
  { shadcnStyle, style, viewUrl }: StackItemOptions = {},
) {
  const result = await inspectRegistry(query, shadcnStyle, style);

  if (!result) {
    return NextResponse.json(
      { error: "No registry items found in the query" },
      { status: 400 },
    );
  }

  const roots = result.graph.roots.flatMap((id) => {
    const node = result.graph.nodes.find((node) => node.id === id);
    return node ? [node] : [];
  });

  const unresolved = roots.filter((node) => !node.item || !node.url);
  if (unresolved.length > 0) {
    return NextResponse.json(
      {
        error: "Some items could not be resolved",
        items: unresolved.map((node) => ({
          specifier: node.specifier,
          error: node.error,
        })),
      },
      { status: 422 },
    );
  }

  const registryDependencies = roots.map((node) =>
    node.namespace === SHADCN_NAMESPACE && node.item
      ? node.item.name
      : (node.url as string),
  );

  const url =
    viewUrl ??
    `${siteConfig.url}/canvas?q=${encodeURIComponent(result.specifiers.join(" "))}`;

  return NextResponse.json(
    {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      name: "stack",
      type: "registry:item",
      title: "diagramcn canvas",
      description: result.specifiers.join(", "),
      registryDependencies,
      docs: `Installed a diagramcn canvas of ${roots.length} items. View it at ${url}`,
    },
    { headers: { "cache-control": "public, s-maxage=300" } },
  );
}
