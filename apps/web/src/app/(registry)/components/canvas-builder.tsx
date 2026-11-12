"use client";

import { Button } from "@diagramcn/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@diagramcn/ui/components/dialog";
import { Input } from "@diagramcn/ui/components/input";
import { cn } from "@diagramcn/ui/lib/utils";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Library,
  Link2,
  Loader,
  Plus,
  Rss,
  TriangleAlert,
  X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import type { InspectResult } from "@/lib/registry/inspect";
import type { PlannedFile } from "@/lib/registry/plan";
import type { ResolvedNode } from "@/lib/registry/resolve";

import { InstallCommand } from "@/components/install-command";
import { StylePicker } from "@/components/style-picker";
import {
  type Conflict,
  type ConflictKind,
  getConflictPairs,
  getConflicts,
} from "@/lib/registry/conflicts";
import {
  getCanvasHref,
  getItemHref,
  getStackItemUrl,
  parseAddInput,
  SHADCN_NAMESPACE,
} from "@/lib/registry/specifier";
import {
  DEFAULT_SHADCN_STYLE,
  getShadcnStyleLabel,
} from "@/lib/registry/styles";
import { SITE_URL } from "@/lib/site";

import { getNodeLabel, getRegistryColor } from "./canvas-graph";
import { FileDialog } from "./file-dialog";
import { RegistryBrowser } from "./registry-browser";

// React Flow measures the DOM, so it only renders on the client.
const CanvasGraph = dynamic(
  () => import("./canvas-graph").then((mod) => mod.CanvasGraph),
  {
    ssr: false,
    loading: () => <CanvasStatus>Loading canvas...</CanvasStatus>,
  },
);

const suggestions = [
  "@shadcn/sidebar-07",
  "@magicui/marquee",
  "@diceui/kanban",
  "@shadcn/dashboard-01",
];

const conflictLabels: Record<ConflictKind, string> = {
  file: "File",
  "css-var": "CSS variable",
  "env-var": "Env variable",
  dependency: "Package version",
};

function subscribeToNothing() {
  return () => {};
}

/** The current origin, so links work on localhost and previews too. */
function useOrigin() {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => SITE_URL,
  );
}

function pluralize(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

/** `@shadcn/button` → `button`, the way people type it. */
function getShortSpecifier(specifier: string) {
  return specifier.startsWith(`${SHADCN_NAMESPACE}/`)
    ? specifier.slice(SHADCN_NAMESPACE.length + 1)
    : specifier;
}

interface CanvasBuilderProps {
  specifiers: string[];
  result: InspectResult | null;
  /** Style `@shadcn` items are shown in. */
  shadcnStyle: string;
  /** Set on a saved canvas's page (`/s/<id>`). */
  savedId?: string;
  /** Whether canvases can be saved to short links on this deployment. */
  canSave?: boolean;
}

export function CanvasBuilder({
  specifiers,
  result,
  shadcnStyle,
  savedId,
  canSave,
}: CanvasBuilderProps) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [optimisticSpecifiers, setOptimisticSpecifiers] =
    React.useOptimistic(specifiers);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [highlight, setHighlight] = React.useState<string[] | null>(null);

  const onSpecifiersChange = React.useCallback(
    (next: string[]) => {
      setSelectedId(null);
      setHighlight(null);
      startTransition(() => {
        setOptimisticSpecifiers(next);
        // Saved canvases never change, so editing one leaves its page.
        const href = getCanvasHref(next, shadcnStyle);
        if (savedId) router.push(href, { scroll: false });
        else router.replace(href, { scroll: false });
      });
    },
    [router, savedId, setOptimisticSpecifiers, shadcnStyle],
  );

  const onAdd = React.useCallback(
    (added: string[]) => {
      const next = [...new Set([...optimisticSpecifiers, ...added])];
      if (next.length === optimisticSpecifiers.length) return;
      onSpecifiersChange(next);
    },
    [optimisticSpecifiers, onSpecifiersChange],
  );

  const onRemove = React.useCallback(
    (specifier: string) => {
      onSpecifiersChange(
        optimisticSpecifiers.filter((current) => current !== specifier),
      );
    },
    [optimisticSpecifiers, onSpecifiersChange],
  );

  const onSelect = React.useCallback((id: string | null) => {
    setSelectedId(id);
    setHighlight(null);
  }, []);

  const conflicts = React.useMemo(
    () => (result ? getConflicts(result.graph, result.plan) : []),
    [result],
  );
  const conflictPairs = React.useMemo(
    () => getConflictPairs(conflicts),
    [conflicts],
  );

  const nodesById = React.useMemo(
    () => new Map(result?.graph.nodes.map((node) => [node.id, node]) ?? []),
    [result],
  );
  const rootsBySpecifier = React.useMemo(() => {
    const roots = new Map<string, ResolvedNode>();
    for (const node of result?.graph.nodes ?? []) {
      if (node.depth === 0) roots.set(node.specifier, node);
    }
    return roots;
  }, [result]);

  const hasUnresolved = specifiers.some(
    (specifier) => !rootsBySpecifier.get(specifier)?.item,
  );
  const isStale = isPending || optimisticSpecifiers !== specifiers;
  const selected = selectedId ? nodesById.get(selectedId) : undefined;

  return (
    <div className="flex flex-col lg:h-[calc(100svh-3.5rem)] lg:flex-row">
      <aside className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b p-4 lg:w-72 lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight">
            {savedId ? "Saved canvas" : "Canvas"}
          </h1>
          <p className="text-sm text-balance text-muted-foreground">
            {savedId
              ? "This link always installs these exact items. Editing it starts a new canvas."
              : "Mix items from any shadcn registry, see where they clash, then install them together."}
          </p>
        </div>

        <AddItems
          onAdd={onAdd}
          specifiers={optimisticSpecifiers}
          shadcnStyle={shadcnStyle}
        />

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-muted-foreground">shadcn style</span>
          {savedId ? (
            <span>{getShadcnStyleLabel(shadcnStyle)}</span>
          ) : (
            <StylePicker value={shadcnStyle} className="w-full" />
          )}
        </div>

        {optimisticSpecifiers.length > 0 ? (
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Items
                <span className="ml-2 font-normal text-muted-foreground tabular-nums">
                  {optimisticSpecifiers.length}
                </span>
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => onSpecifiersChange([])}
              >
                Clear
              </Button>
            </div>
            <ul className="flex flex-col gap-1">
              {optimisticSpecifiers.map((specifier) => {
                const node = rootsBySpecifier.get(specifier);
                return (
                  <li
                    key={specifier}
                    className={cn(
                      "group flex items-center gap-2 rounded-md border px-2 py-1.5",
                      node && node.id === selectedId && "border-ring",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-2 shrink-0 rounded-full",
                        getRegistryColor(node?.namespace ?? null),
                      )}
                    />
                    <button
                      type="button"
                      disabled={!node}
                      onClick={() => node && onSelect(node.id)}
                      className="flex min-w-0 flex-1 flex-col text-left"
                    >
                      <span className="truncate font-mono text-xs">
                        {specifier}
                      </span>
                      {node?.error ? (
                        <span className="truncate text-xs text-destructive">
                          {node.error}
                        </span>
                      ) : !node ? (
                        <span className="text-xs text-muted-foreground">
                          Resolving...
                        </span>
                      ) : null}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${specifier}`}
                      className="size-6 shrink-0"
                      onClick={() => onRemove(specifier)}
                    >
                      <X />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">Start with</h2>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onAdd([suggestion])}
                  className="rounded-sm border bg-canvas px-2 py-0.5 font-mono text-xs text-canvas-foreground transition-colors hover:border-ring"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
        )}
      </aside>

      <div
        aria-busy={isStale}
        className="relative h-[70svh] min-w-0 shrink-0 bg-canvas lg:h-auto lg:flex-1 lg:shrink"
      >
        {result && optimisticSpecifiers.length > 0 ? (
          <CanvasGraph
            // A new set of items gets a fresh layout and fits the view.
            key={result.specifiers.join(" ")}
            graph={result.graph}
            conflictPairs={conflictPairs}
            selectedId={selectedId}
            highlight={highlight}
            onSelect={onSelect}
          />
        ) : (
          <CanvasStatus>
            {isStale
              ? "Resolving..."
              : "Add items from the left. Everything they pull in shows up here, with conflicts in red."}
          </CanvasStatus>
        )}
        {isStale && result ? (
          <div className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-xs shadow-xs">
            <Loader className="size-3.5 animate-spin" />
            Resolving...
          </div>
        ) : null}
      </div>

      <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-t lg:w-96 lg:border-t-0 lg:border-l">
        {result && selected ? (
          <ItemDetails
            node={selected}
            result={result}
            conflicts={conflicts}
            nodesById={nodesById}
            onSelect={onSelect}
            onRemove={selected.depth === 0 ? onRemove : undefined}
          />
        ) : result && optimisticSpecifiers.length > 0 ? (
          <PlanPanel
            result={result}
            specifiers={optimisticSpecifiers}
            shadcnStyle={shadcnStyle}
            conflicts={conflicts}
            nodesById={nodesById}
            highlight={highlight}
            onHighlight={setHighlight}
            savedId={savedId}
            canSave={!!canSave && !hasUnresolved}
            hasUnresolved={hasUnresolved}
            isStale={isStale}
          />
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            The install plan shows up here once you add items.
          </p>
        )}
      </aside>
    </div>
  );
}

function CanvasStatus({ children }: React.PropsWithChildren) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <p className="max-w-xs text-center text-sm text-balance text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

interface AddItemsProps {
  specifiers: string[];
  shadcnStyle: string;
  onAdd: (specifiers: string[]) => void;
}

function AddItems({ specifiers, shadcnStyle, onAdd }: AddItemsProps) {
  const [input, setInput] = React.useState("");
  const [isBrowsing, setIsBrowsing] = React.useState(false);

  const onSubmit = React.useCallback(() => {
    const added = parseAddInput(input);
    if (added.length === 0) {
      toast.error("No registry items found", {
        description:
          "Try @magicui/marquee, an item URL, or a shadcn add command.",
      });
      return;
    }
    onAdd(added);
    setInput("");
  }, [input, onAdd]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Input
          aria-label="Add registry items"
          placeholder="@magicui/marquee, a URL..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onSubmit();
            }
          }}
          className="h-9 pr-9 font-mono text-xs"
          spellCheck={false}
          autoComplete="off"
        />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Add"
          className="absolute top-0 right-0 h-full rounded-l-none text-muted-foreground hover:text-foreground hover:dark:bg-transparent"
          onClick={onSubmit}
        >
          <Plus />
        </Button>
      </div>
      <Button variant="outline" size="sm" onClick={() => setIsBrowsing(true)}>
        <Library />
        Browse registries
      </Button>
      <Dialog open={isBrowsing} onOpenChange={setIsBrowsing}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Browse registries</DialogTitle>
            <DialogDescription>
              Every registry in the shadcn directory. Pick items from as many as
              you like.
            </DialogDescription>
          </DialogHeader>
          <RegistryBrowser
            specifiers={specifiers}
            shadcnStyle={shadcnStyle}
            onAdd={(specifier) => onAdd([specifier])}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PanelSection({
  title,
  children,
  className,
}: React.PropsWithChildren<{ title: React.ReactNode; className?: string }>) {
  return (
    <section className={cn("flex flex-col gap-2 border-b p-4", className)}>
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function ItemList({
  ids,
  nodesById,
}: {
  ids: string[];
  nodesById: Map<string, ResolvedNode>;
}) {
  return (
    <span className="font-mono">
      {ids
        .map((id) => {
          const node = nodesById.get(id);
          if (!node) return id;
          return node.namespace
            ? `${node.namespace}/${getNodeLabel(node)}`
            : getNodeLabel(node);
        })
        .join(", ")}
    </span>
  );
}

interface PlanPanelProps {
  result: InspectResult;
  specifiers: string[];
  shadcnStyle: string;
  conflicts: Conflict[];
  nodesById: Map<string, ResolvedNode>;
  highlight: string[] | null;
  onHighlight: (ids: string[] | null) => void;
  savedId?: string;
  canSave: boolean;
  hasUnresolved: boolean;
  isStale: boolean;
}

function PlanPanel({
  result,
  specifiers,
  shadcnStyle,
  conflicts,
  nodesById,
  highlight,
  onHighlight,
  savedId,
  canSave,
  hasUnresolved,
  isStale,
}: PlanPanelProps) {
  const origin = useOrigin();
  const { graph, plan } = result;
  const pulledIn = graph.nodes.length - graph.roots.length;
  const packages = plan.dependencies.length + plan.devDependencies.length;
  const checks = plan.findings.filter(
    (finding) => finding.severity !== "info" && finding.category !== "conflict",
  );

  return (
    <div
      className={cn(
        "flex flex-col transition-opacity",
        isStale && "opacity-50",
      )}
    >
      <PanelSection title="Overview">
        <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
          <span>{pluralize(graph.roots.length, "item", "items")}</span>
          {pulledIn > 0 ? <span>+{pulledIn} pulled in</span> : null}
          <span>
            {pluralize(graph.registries.length, "registry", "registries")}
          </span>
          <span>{pluralize(plan.files.length, "file", "files")}</span>
          <span>{pluralize(packages, "package", "packages")}</span>
        </p>
      </PanelSection>

      <PanelSection
        title={
          <span className="flex items-center gap-2">
            Conflicts
            <span
              className={cn(
                "font-normal tabular-nums",
                conflicts.length > 0
                  ? "text-destructive"
                  : "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {conflicts.length > 0 ? conflicts.length : "none"}
            </span>
          </span>
        }
      >
        {conflicts.length > 0 ? (
          <ul className="flex flex-col gap-1">
            {conflicts.map((conflict) => {
              const isActive = highlight?.join() === conflict.itemIds.join();
              return (
                <li key={conflict.id}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      onHighlight(isActive ? null : conflict.itemIds)
                    }
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left text-xs hover:border-ring",
                      isActive && "border-destructive",
                    )}
                  >
                    <span className="flex items-baseline gap-2">
                      <span className="shrink-0 text-muted-foreground">
                        {conflictLabels[conflict.kind]}
                      </span>
                      <span className="truncate font-mono">
                        {conflict.subject}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      <ItemList ids={conflict.itemIds} nodesById={nodesById} />.{" "}
                      {conflict.detail}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            These items don&apos;t write the same files or set the same
            variables differently.
          </p>
        )}
      </PanelSection>

      {checks.length > 0 ? (
        <PanelSection title={`Checks · ${checks.length}`}>
          <ul className="flex flex-col gap-1.5 text-xs">
            {checks.map((finding, index) => (
              <li key={index} className="flex gap-2">
                <TriangleAlert
                  className={cn(
                    "mt-0.5 size-3 shrink-0",
                    finding.severity === "error"
                      ? "text-destructive"
                      : "text-amber-600 dark:text-amber-400",
                  )}
                />
                <span>
                  <span className="font-medium">{finding.title}.</span>{" "}
                  <span className="text-muted-foreground">
                    {finding.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}

      <PanelSection title="Install">
        {hasUnresolved ? (
          <p className="text-sm text-destructive">
            Remove the items that couldn&apos;t be resolved to get an install
            command.
          </p>
        ) : (
          <InstallCommand
            command={
              savedId
                ? `shadcn@latest add ${origin}/r/${savedId}.json`
                : `shadcn@latest add "${getStackItemUrl(origin, specifiers)}"`
            }
          />
        )}
        <div className="flex flex-wrap gap-2">
          <ShareButton
            specifiers={specifiers}
            shadcnStyle={shadcnStyle}
            savedId={savedId}
            canSave={canSave}
            disabled={isStale}
          />
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={`/changes?q=${encodeURIComponent(specifiers.join(" "))}${shadcnStyle === DEFAULT_SHADCN_STYLE ? "" : `&style=${shadcnStyle}`}`}
                title="Changes to these items and everything they depend on"
              />
            }
          >
            <Rss />
            Changes
          </Button>
        </div>
      </PanelSection>

      <PanelSection title="Keep it in sync" className="border-b-0">
        <InstallCommand
          command={`diagramcn sync ${specifiers.map(getShortSpecifier).join(" ")}`}
        />
        <p className="text-xs text-muted-foreground">
          Later, this pulls upstream changes from every registry into your
          copies and keeps your edits.
        </p>
      </PanelSection>
    </div>
  );
}

interface ItemDetailsProps {
  node: ResolvedNode;
  result: InspectResult;
  conflicts: Conflict[];
  nodesById: Map<string, ResolvedNode>;
  onSelect: (id: string | null) => void;
  onRemove?: (specifier: string) => void;
}

function ItemDetails({
  node,
  result,
  conflicts,
  nodesById,
  onSelect,
  onRemove,
}: ItemDetailsProps) {
  const [openFile, setOpenFile] = React.useState<PlannedFile | null>(null);
  const { item } = node;
  const files = result.plan.files.filter((file) => file.itemId === node.id);
  const itemConflicts = conflicts.filter((conflict) =>
    conflict.itemIds.includes(node.id),
  );
  const findings = result.plan.findings.filter(
    (finding) => finding.itemId === node.id && finding.severity !== "info",
  );
  const dependsOn = result.graph.edges
    .filter((edge) => edge.from === node.id)
    .flatMap((edge) => nodesById.get(edge.to) ?? []);
  const usedBy = result.graph.edges
    .filter((edge) => edge.to === node.id)
    .flatMap((edge) => nodesById.get(edge.from) ?? []);
  const packages = [
    ...(item?.dependencies ?? []),
    ...(item?.devDependencies ?? []).map((spec) => `${spec} (dev)`),
  ];

  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-2 border-b p-4">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 w-fit px-2 text-xs text-muted-foreground"
          onClick={() => onSelect(null)}
        >
          <ArrowLeft />
          Plan
        </Button>
        <span className="text-xs text-muted-foreground">
          {node.namespace ?? "URL"}
          {node.depth > 0 ? " · pulled in by another item" : ""}
        </span>
        <h2 className="font-mono text-base font-semibold break-all">
          {item?.title ?? getNodeLabel(node)}
        </h2>
        {item?.description ? (
          <p className="text-sm text-muted-foreground">{item.description}</p>
        ) : null}
        {node.error ? (
          <p className="text-sm text-destructive">{node.error}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {item ? (
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link href={getItemHref(node.specifier, node.style)} />}
            >
              <ExternalLink />
              History
            </Button>
          ) : null}
          {onRemove ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onRemove(node.specifier)}
            >
              <X />
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      {itemConflicts.length > 0 ? (
        <PanelSection title={`Conflicts · ${itemConflicts.length}`}>
          <ul className="flex flex-col gap-1.5 text-xs">
            {itemConflicts.map((conflict) => (
              <li key={conflict.id} className="flex flex-col gap-0.5">
                <span>
                  <span className="text-muted-foreground">
                    {conflictLabels[conflict.kind]}
                  </span>{" "}
                  <span className="font-mono">{conflict.subject}</span>
                </span>
                <span className="text-muted-foreground">
                  With{" "}
                  <ItemList
                    ids={conflict.itemIds.filter((id) => id !== node.id)}
                    nodesById={nodesById}
                  />
                  . {conflict.detail}
                </span>
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}

      {findings.length > 0 ? (
        <PanelSection title={`Checks · ${findings.length}`}>
          <ul className="flex flex-col gap-1.5 text-xs">
            {findings.map((finding, index) => (
              <li key={index}>
                <span className="font-medium">{finding.title}.</span>{" "}
                <span className="text-muted-foreground">{finding.detail}</span>
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}

      {files.length > 0 ? (
        <PanelSection title={`Files · ${files.length}`}>
          <ul className="flex flex-col gap-0.5">
            {files.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => setOpenFile(file)}
                  className="w-full truncate rounded-sm px-1 py-0.5 text-left font-mono text-xs hover:bg-accent"
                  title={file.path}
                >
                  {file.target ?? file.path}
                </button>
              </li>
            ))}
          </ul>
        </PanelSection>
      ) : null}

      {packages.length > 0 ? (
        <PanelSection title={`Packages · ${packages.length}`}>
          <p className="font-mono text-xs break-all text-muted-foreground">
            {packages.join(", ")}
          </p>
        </PanelSection>
      ) : null}

      {dependsOn.length > 0 || usedBy.length > 0 ? (
        <PanelSection title="Registry dependencies" className="border-b-0">
          <RelatedItems
            label="Pulls in"
            nodes={dependsOn}
            onSelect={onSelect}
          />
          <RelatedItems
            label="Pulled in by"
            nodes={usedBy}
            onSelect={onSelect}
          />
        </PanelSection>
      ) : null}

      <FileDialog file={openFile} onClose={() => setOpenFile(null)} />
    </div>
  );
}

interface RelatedItemsProps {
  label: string;
  nodes: ResolvedNode[];
  onSelect: (id: string) => void;
}

function RelatedItems({ label, nodes, onSelect }: RelatedItemsProps) {
  if (nodes.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {nodes.map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelect(node.id)}
            className="rounded-sm border px-1.5 py-0.5 font-mono text-xs hover:border-ring"
          >
            {getNodeLabel(node)}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ShareButtonProps {
  specifiers: string[];
  shadcnStyle: string;
  savedId?: string;
  canSave: boolean;
  disabled: boolean;
}

/**
 * Copies the canvas's link. Unsaved canvases are saved first when
 * possible, so the copied link is a short `/s/<id>` one.
 */
function ShareButton({
  specifiers,
  shadcnStyle,
  savedId,
  canSave,
  disabled,
}: ShareButtonProps) {
  const router = useRouter();
  const origin = useOrigin();
  const [isCopied, setIsCopied] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);

  const copy = React.useCallback(async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success(message);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  }, []);

  const onClick = React.useCallback(async () => {
    if (savedId) {
      await copy(`${origin}/s/${savedId}`, "Canvas link copied");
      return;
    }

    if (!canSave) {
      await copy(
        `${origin}${getCanvasHref(specifiers, shadcnStyle)}`,
        "Canvas link copied",
      );
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/stacks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: specifiers.join(" "), style: shadcnStyle }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save canvas");

      await copy(`${origin}/s/${data.id}`, "Canvas saved and link copied");
      router.push(`/s/${data.id}`, { scroll: false });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save canvas",
      );
    } finally {
      setIsSaving(false);
    }
  }, [canSave, copy, origin, router, savedId, shadcnStyle, specifiers]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled || isSaving}
    >
      {isSaving ? (
        <Loader className="animate-spin" />
      ) : isCopied ? (
        <Check />
      ) : (
        <Link2 />
      )}
      {savedId || !canSave ? "Copy link" : "Save link"}
    </Button>
  );
}
