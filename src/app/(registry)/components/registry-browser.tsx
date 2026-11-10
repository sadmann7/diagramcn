"use client";

import { Check, Loader, Plus } from "lucide-react";
import * as React from "react";

import type { BrowseItem, BrowseRegistry } from "@/lib/registry/browse";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MAX_VISIBLE_REGISTRIES = 60;

type Loadable<T> =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: T };

function useJson<T>(url: string | null) {
  const [state, setState] = React.useState<Loadable<T>>({ status: "loading" });

  React.useEffect(() => {
    if (!url) return;
    const controller = new AbortController();
    setState({ status: "loading" });

    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Request failed");
        setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Request failed",
        });
      });

    return () => controller.abort();
  }, [url]);

  return state;
}

interface RegistryBrowserProps {
  specifiers: string[];
  onAdd: (specifier: string) => void;
}

export function RegistryBrowser({ specifiers, onAdd }: RegistryBrowserProps) {
  const [registryQuery, setRegistryQuery] = React.useState("");
  const [itemQuery, setItemQuery] = React.useState("");
  const [namespace, setNamespace] = React.useState("@shadcn");

  const registries = useJson<BrowseRegistry[]>("/api/registries");
  const items = useJson<BrowseItem[]>(
    `/api/registries/items?namespace=${encodeURIComponent(namespace)}`,
  );

  const filteredRegistries = React.useMemo(() => {
    if (registries.status !== "ready") return [];
    const query = registryQuery.trim().toLowerCase();
    return registries.data
      .filter(
        (registry) =>
          !query ||
          registry.namespace.toLowerCase().includes(query) ||
          registry.description?.toLowerCase().includes(query),
      )
      .slice(0, MAX_VISIBLE_REGISTRIES);
  }, [registries, registryQuery]);

  const filteredItems = React.useMemo(() => {
    if (items.status !== "ready") return [];
    const query = itemQuery.trim().toLowerCase();
    return items.data.filter(
      (item) =>
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query),
    );
  }, [items, itemQuery]);

  const onNamespaceSelect = React.useCallback((next: string) => {
    setNamespace(next);
    setItemQuery("");
  }, []);

  return (
    <div className="grid overflow-hidden rounded-md border md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="flex min-w-0 flex-col border-b md:border-r md:border-b-0">
        <div className="border-b p-2">
          <Input
            aria-label="Search registries"
            placeholder="Search registries..."
            value={registryQuery}
            onChange={(event) => setRegistryQuery(event.target.value)}
            className="h-8"
          />
        </div>
        <ul className="h-80 overflow-y-auto p-1">
          {registries.status === "loading" ? (
            <BrowserStatus>
              <Loader className="size-4 animate-spin" />
            </BrowserStatus>
          ) : registries.status === "error" ? (
            <BrowserStatus>{registries.message}</BrowserStatus>
          ) : filteredRegistries.length === 0 ? (
            <BrowserStatus>No registries match.</BrowserStatus>
          ) : (
            filteredRegistries.map((registry) => (
              <li key={registry.namespace}>
                <button
                  type="button"
                  onClick={() => onNamespaceSelect(registry.namespace)}
                  className={cn(
                    "flex w-full flex-col rounded-sm px-2 py-1.5 text-left hover:bg-accent",
                    registry.namespace === namespace && "bg-accent",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-mono text-xs">
                      {registry.namespace}
                    </span>
                    {registry.itemCount !== null ? (
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {registry.itemCount}
                      </span>
                    ) : null}
                  </span>
                  {registry.description ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {registry.description}
                    </span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
      <div className="flex min-w-0 flex-col">
        <div className="border-b p-2">
          <Input
            aria-label={`Search ${namespace} items`}
            placeholder={`Search ${namespace}...`}
            value={itemQuery}
            onChange={(event) => setItemQuery(event.target.value)}
            className="h-8"
          />
        </div>
        <ul className="h-80 overflow-y-auto p-1">
          {items.status === "loading" ? (
            <BrowserStatus>
              <Loader className="size-4 animate-spin" />
            </BrowserStatus>
          ) : items.status === "error" ? (
            <BrowserStatus>
              {items.message}. Type item names in the field above instead, e.g.{" "}
              {namespace}/item-name.
            </BrowserStatus>
          ) : filteredItems.length === 0 ? (
            <BrowserStatus>No items match.</BrowserStatus>
          ) : (
            filteredItems.map((item) => {
              const specifier = `${namespace}/${item.name}`;
              const isAdded = specifiers.includes(specifier);

              return (
                <li key={item.name}>
                  <button
                    type="button"
                    disabled={isAdded}
                    onClick={() => onAdd(specifier)}
                    className="group flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left hover:bg-accent disabled:opacity-60 disabled:hover:bg-transparent"
                  >
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate font-mono text-xs">
                          {item.name}
                        </span>
                        {item.type ? (
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {item.type.replace("registry:", "")}
                          </span>
                        ) : null}
                      </span>
                      {item.description ? (
                        <span className="truncate text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      ) : null}
                    </span>
                    {isAdded ? (
                      <Check
                        aria-label="Added"
                        className="size-4 shrink-0 text-muted-foreground"
                      />
                    ) : (
                      <Plus
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
                      />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

function BrowserStatus({ children }: React.PropsWithChildren) {
  return (
    <li className="flex h-full items-center justify-center p-4 text-center text-xs text-balance text-muted-foreground">
      {children}
    </li>
  );
}
