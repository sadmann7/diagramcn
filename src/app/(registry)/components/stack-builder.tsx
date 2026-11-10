"use client";

import { Check, Link2, Loader, Plus, Rss, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import type { InspectResult } from "@/lib/registry/inspect";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";
import {
  getStackHref,
  getStackItemUrl,
  parseAddInput,
} from "@/lib/registry/specifier";
import { cn } from "@/lib/utils";

import { InspectSummary, InspectTabs, InstallCommand } from "./inspector";
import { RegistryBrowser } from "./registry-browser";

const suggestions = [
  "@shadcn/sidebar-07",
  "@shadcn/dashboard-01",
  "@magicui/marquee",
  "@diceui/kanban",
];

function subscribeToNothing() {
  return () => {};
}

/** The current origin, so stack URLs work on localhost and previews too. */
function useOrigin() {
  return React.useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => siteConfig.url,
  );
}

interface StackBuilderProps {
  specifiers: string[];
  result: InspectResult | null;
  /** Set on a saved stack's page (`/s/<id>`). */
  savedId?: string;
  /** Whether stacks can be saved to short links on this deployment. */
  canSave?: boolean;
}

export function StackBuilder({
  specifiers,
  result,
  savedId,
  canSave,
}: StackBuilderProps) {
  const router = useRouter();
  const origin = useOrigin();
  const [isPending, startTransition] = React.useTransition();
  const [optimisticSpecifiers, setOptimisticSpecifiers] =
    React.useOptimistic(specifiers);
  const [input, setInput] = React.useState("");

  const onSpecifiersChange = React.useCallback(
    (next: string[]) => {
      startTransition(() => {
        setOptimisticSpecifiers(next);
        // Saved stacks never change, so editing one leaves its page.
        if (savedId) router.push(getStackHref(next), { scroll: false });
        else router.replace(getStackHref(next), { scroll: false });
      });
    },
    [router, savedId, setOptimisticSpecifiers],
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

  const onInputSubmit = React.useCallback(() => {
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

  const rootsBySpecifier = React.useMemo(() => {
    const roots = new Map<string, InspectResult["graph"]["nodes"][number]>();
    for (const node of result?.graph.nodes ?? []) {
      if (node.depth === 0) roots.set(node.specifier, node);
    }
    return roots;
  }, [result]);

  const hasUnresolved = specifiers.some(
    (specifier) => !rootsBySpecifier.get(specifier)?.item,
  );
  const isStale = isPending || optimisticSpecifiers !== specifiers;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-8 pb-16 sm:px-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {savedId ? "Saved stack" : "Build a stack"}
        </h1>
        {savedId ? (
          <p className="max-w-2xl text-sm text-balance text-muted-foreground">
            This link always installs these exact items. Editing the stack
            starts a new one.
          </p>
        ) : null}
        <p
          className={cn(
            "max-w-2xl text-sm text-balance text-muted-foreground",
            savedId && "sr-only",
          )}
        >
          Pick items from any shadcn registry, check how they fit together, then
          install all of them with one command.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">
            Items
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {optimisticSpecifiers.length}
            </span>
          </h2>
          {optimisticSpecifiers.length > 0 ? (
            <div className="flex gap-2">
              <ShareButton
                specifiers={optimisticSpecifiers}
                savedId={savedId}
                canSave={!!canSave && !hasUnresolved}
                disabled={isStale}
              />
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/changes?q=${encodeURIComponent(optimisticSpecifiers.join(" "))}`}
                  title="Changes to these items and everything they depend on"
                >
                  <Rss />
                  Changes
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSpecifiersChange([])}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </div>

        {optimisticSpecifiers.length > 0 ? (
          <ul className="divide-y rounded-md border">
            {optimisticSpecifiers.map((specifier) => {
              const node = rootsBySpecifier.get(specifier);
              const item = node?.item;

              return (
                <li
                  key={specifier}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-mono text-sm">
                        {specifier}
                      </span>
                      {item ? (
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {item.type.replace("registry:", "")} ·{" "}
                          {item.files?.length ?? 0}{" "}
                          {item.files?.length === 1 ? "file" : "files"}
                        </span>
                      ) : null}
                    </span>
                    {node?.error ? (
                      <span className="truncate text-xs text-destructive">
                        {node.error}
                      </span>
                    ) : item?.description ? (
                      <span className="truncate text-xs text-muted-foreground">
                        {item.description}
                      </span>
                    ) : !node ? (
                      <span className="text-xs text-muted-foreground">
                        Resolving...
                      </span>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${specifier}`}
                    className="size-7 shrink-0"
                    onClick={() => onRemove(specifier)}
                  >
                    <X />
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-dashed px-3 py-4 text-sm">
            <span className="text-muted-foreground">
              No items yet. Browse below, or start with
            </span>
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
        )}

        <div className="relative">
          <Input
            aria-label="Add registry items"
            placeholder="Add items: @magicui/marquee, a URL, or a shadcn add command"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onInputSubmit();
              }
            }}
            className="h-10 pr-10 font-mono text-sm"
            spellCheck={false}
            autoComplete="off"
          />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Add"
            className="absolute top-0 right-0 h-full rounded-l-none text-muted-foreground hover:text-foreground hover:dark:bg-transparent"
            onClick={onInputSubmit}
          >
            <Plus />
          </Button>
        </div>

        <RegistryBrowser
          specifiers={optimisticSpecifiers}
          onAdd={(specifier) => onAdd([specifier])}
        />
      </section>

      {optimisticSpecifiers.length > 0 ? (
        <section
          aria-busy={isStale}
          className={cn(
            "flex flex-col gap-6 transition-opacity",
            isStale && "pointer-events-none opacity-50",
          )}
        >
          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              Install
              {isStale ? (
                <Loader className="size-3.5 animate-spin text-muted-foreground" />
              ) : null}
            </h2>
            {hasUnresolved && !isStale ? (
              <p className="text-sm text-destructive">
                Remove the items that couldn&apos;t be resolved to get an
                install command.
              </p>
            ) : (
              <InstallCommand
                getCommand={(dlx) =>
                  savedId
                    ? `${dlx} shadcn@latest add ${origin}/r/${savedId}.json`
                    : `${dlx} shadcn@latest add "${getStackItemUrl(origin, specifiers)}"`
                }
              />
            )}
            {result ? <InspectSummary result={result} /> : null}
          </div>
          {result ? <InspectTabs result={result} /> : null}
        </section>
      ) : null}
    </div>
  );
}

interface ShareButtonProps {
  specifiers: string[];
  savedId?: string;
  canSave: boolean;
  disabled: boolean;
}

/**
 * Copies the stack's link. Unsaved stacks are saved first when possible, so
 * the copied link is a short `/s/<id>` one.
 */
function ShareButton({
  specifiers,
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
      await copy(`${origin}/s/${savedId}`, "Stack link copied");
      return;
    }

    if (!canSave) {
      await copy(`${origin}${getStackHref(specifiers)}`, "Stack link copied");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/stacks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q: specifiers.join(" ") }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save stack");

      await copy(`${origin}/s/${data.id}`, "Stack saved and link copied");
      router.push(`/s/${data.id}`, { scroll: false });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save stack",
      );
    } finally {
      setIsSaving(false);
    }
  }, [canSave, copy, origin, router, savedId, specifiers]);

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
