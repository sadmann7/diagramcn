import { inspectRegistry } from "@/lib/registry/inspect";
import { getItemHistory } from "@/lib/tracking/history";

import { Inspector } from "./inspector";
import { RegistryInput } from "./registry-input";

interface InspectViewProps {
  input: string;
  shadcnStyle?: string;
  style?: string;
  /** Tab to open first, e.g. `history`. */
  tab?: string;
}

export async function InspectView({
  input,
  shadcnStyle,
  style,
  tab,
}: InspectViewProps) {
  const result = input
    ? await inspectRegistry(input, shadcnStyle, style)
    : null;

  if (!result) {
    return (
      <div className="flex flex-col items-center gap-6 px-4 pt-32 sm:pt-40">
        <h1 className="max-w-lg text-center text-2xl font-semibold tracking-tighter text-balance sm:text-3xl">
          No registry items found
        </h1>
        <p className="max-w-md text-center text-sm text-balance text-muted-foreground">
          Try a namespaced item like @shadcn/button, a registry item URL, or a
          full shadcn add command.
        </p>
        <RegistryInput defaultValue={input} autoFocus />
      </div>
    );
  }

  // History only makes sense for one item that resolved, since unresolved
  // items are never recorded.
  const [specifier] = result.specifiers;
  const isSingleResolvedItem =
    result.specifiers.length === 1 &&
    result.graph.nodes.some((node) => node.depth === 0 && node.item);
  const history =
    isSingleResolvedItem && specifier
      ? await getItemHistory(specifier).catch((error: unknown) => {
          console.error(`Failed to load history for ${specifier}:`, error);
          return { status: "unavailable" } as const;
        })
      : undefined;

  return <Inspector result={result} history={history} defaultTab={tab} />;
}
