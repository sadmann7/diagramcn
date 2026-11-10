import { Layers, Loader } from "lucide-react";
import Link from "next/link";
import { after } from "next/server";
import { cache } from "react";

import { InstallCommand } from "@/components/install-command";
import { Button } from "@/components/ui/button";
import { resolveRegistryItem } from "@/lib/registry/resolve";
import {
  getCanvasHref,
  normalizeSpecifier,
  SHADCN_NAMESPACE,
} from "@/lib/registry/specifier";
import { getItemHistory } from "@/lib/tracking/history";
import { isTrackingEnabled, recordNode } from "@/lib/tracking/track";

import { ItemHistory } from "./item-history";
import { RegistryInput } from "./registry-input";

/** Deduped per request, so the page and its metadata share one fetch. */
export const getItem = cache((input: string) =>
  resolveRegistryItem(normalizeSpecifier(input)),
);

/** `@shadcn/button` → `button`, the way people type it. */
function getShortSpecifier(specifier: string) {
  return specifier.replace(new RegExp(`^${SHADCN_NAMESPACE}/`), "");
}

export async function ItemView({ input }: { input: string }) {
  const node = await getItem(input);
  const { specifier, item } = node;

  if (!item) {
    return (
      <div className="flex flex-col items-center gap-6 px-4 pt-32 sm:pt-40">
        <h1 className="max-w-lg text-center font-mono text-2xl font-semibold tracking-tighter break-all sm:text-3xl">
          {specifier}
        </h1>
        <p className="max-w-md text-center text-sm text-balance text-muted-foreground">
          {node.error ?? "This item couldn't be resolved."} Try a namespaced
          item like @shadcn/button or a registry item URL.
        </p>
        <RegistryInput defaultValue={input} autoFocus />
      </div>
    );
  }

  const history = await getItemHistory(specifier).catch((error: unknown) => {
    console.error(`Failed to load history for ${specifier}:`, error);
    return { status: "unavailable" } as const;
  });

  // Visiting an item starts tracking it, so it can be synced later.
  if (isTrackingEnabled && history.status === "untracked") {
    after(() => recordNode(node));
  }

  const short = getShortSpecifier(specifier);
  const fileCount = item.files?.length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pt-10 pb-16 sm:px-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {node.namespace ? (
              <Link
                href={`/changes?namespace=${encodeURIComponent(node.namespace)}`}
                className="w-fit text-sm text-muted-foreground hover:text-foreground"
              >
                {node.namespace}
              </Link>
            ) : null}
            <h1 className="font-mono text-2xl font-semibold tracking-tight break-all">
              {item.title ?? item.name}
            </h1>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={getCanvasHref([specifier])}>
              <Layers />
              Open in canvas
            </Link>
          </Button>
        </div>
        {item.description ? (
          <p className="max-w-2xl text-balance text-muted-foreground">
            {item.description}
          </p>
        ) : null}
        <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span>{item.type.replace("registry:", "")}</span>
          <span>
            {fileCount} {fileCount === 1 ? "file" : "files"}
          </span>
          {item.dependencies?.length ? (
            <span>
              {item.dependencies.length}{" "}
              {item.dependencies.length === 1 ? "package" : "packages"}
            </span>
          ) : null}
          {item.registryDependencies?.length ? (
            <span>
              {item.registryDependencies.length} registry{" "}
              {item.registryDependencies.length === 1
                ? "dependency"
                : "dependencies"}
            </span>
          ) : null}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="text-sm font-semibold">Install</h2>
          <InstallCommand command={`shadcn@latest add ${short}`} />
        </section>
        <section className="flex min-w-0 flex-col gap-2">
          <h2 className="text-sm font-semibold">Pull upstream changes</h2>
          <InstallCommand command={`diagramcn sync ${short}`} />
          <p className="text-xs text-muted-foreground">
            Merges what changed upstream into your copy and keeps your edits.
          </p>
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">History</h2>
        <ItemHistory result={history} />
      </section>
    </div>
  );
}

export function ItemSkeleton() {
  return (
    <div className="flex justify-center pt-40">
      <Loader className="size-5 animate-spin text-muted-foreground" />
    </div>
  );
}
