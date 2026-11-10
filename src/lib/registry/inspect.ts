import { after } from "next/server";
import { cache } from "react";

import { createInstallPlan, type InstallPlan } from "@/lib/registry/plan";
import {
  type ResolvedGraph,
  type ResolveOptions,
  resolveRegistryGraph,
} from "@/lib/registry/resolve";
import { parseAddInput } from "@/lib/registry/specifier";
import { isTrackingEnabled, recordNodes } from "@/lib/tracking/track";

export interface InspectResult {
  specifiers: string[];
  graph: ResolvedGraph;
  plan: InstallPlan;
}

async function inspectImpl(
  input: string,
  shadcnStyle?: string,
  style?: string,
): Promise<InspectResult | null> {
  const specifiers = parseAddInput(input);
  if (specifiers.length === 0) return null;

  const options: ResolveOptions = { shadcnStyle, style };
  const graph = await resolveRegistryGraph(specifiers, options);

  // Every inspection doubles as a check for changes. Custom styles resolve
  // different content for the same specifier, so only defaults are recorded.
  if (isTrackingEnabled && !shadcnStyle && !style) {
    after(() => recordNodes(graph.nodes));
  }
  return { specifiers, graph, plan: createInstallPlan(graph) };
}

/** Deduped per request, so the page, metadata and OG image share one resolve. */
export const inspectRegistry = cache(inspectImpl);

export function getInspectSummary({ graph, plan }: InspectResult) {
  return {
    items: graph.nodes.length,
    files: plan.files.length,
    dependencies: plan.dependencies.length + plan.devDependencies.length,
    errors: plan.findings.filter((finding) => finding.severity === "error")
      .length,
    warnings: plan.findings.filter((finding) => finding.severity === "warning")
      .length,
  };
}
