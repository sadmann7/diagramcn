import type { Metadata } from "next";

import { cn } from "@diagramcn/ui/lib/utils";
import { Rss } from "lucide-react";
import Link from "next/link";

import { ALL_STYLES, StylePicker } from "@/components/style-picker";
import { getItemHref } from "@/lib/registry/specifier";
import { getShadcnStyleLabel, isShadcnStyle } from "@/lib/registry/styles";
import {
  type ChangeEvent,
  getFollowedSpecifiers,
  getRecentChanges,
  getTrackedNamespaces,
} from "@/lib/tracking/changes";
import { isTrackingEnabled } from "@/lib/tracking/track";

const PAGE_SIZE = 50;

const dayFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "full",
  timeZone: "UTC",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeStyle: "short",
  timeZone: "UTC",
});

interface ChangesPageProps {
  searchParams: Promise<{
    namespace?: string;
    q?: string;
    style?: string;
    before?: string;
  }>;
}

function getChangesHref(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const query = search.toString();
  return query ? `/changes?${query}` : "/changes";
}

export async function generateMetadata({
  searchParams,
}: ChangesPageProps): Promise<Metadata> {
  const { namespace, q } = await searchParams;
  const feed = `/changes/feed.xml${
    q
      ? `?q=${encodeURIComponent(q)}`
      : namespace
        ? `?namespace=${encodeURIComponent(namespace)}`
        : ""
  }`;

  return {
    title: namespace ? `${namespace} changes` : "Changes",
    description: "What changed in shadcn registry items, version by version.",
    alternates: { types: { "application/rss+xml": feed } },
  };
}

export default async function ChangesPage({ searchParams }: ChangesPageProps) {
  const { namespace, q, before, style: requestedStyle } = await searchParams;
  // Every style unless one is picked, since most history is in one style.
  const style = isShadcnStyle(requestedStyle) ? requestedStyle : undefined;
  const styleParam = style;

  if (!isTrackingEnabled) {
    return (
      <ChangesLayout>
        <p className="text-sm text-muted-foreground">
          Change tracking isn&apos;t enabled on this deployment.
        </p>
      </ChangesLayout>
    );
  }

  const followed = q ? await getFollowedSpecifiers(q, style) : null;
  const beforeDate = before ? new Date(before) : undefined;

  const [changes, namespaces] = await Promise.all([
    getRecentChanges({
      namespace: followed ? undefined : namespace,
      specifiers: followed?.specifiers,
      style,
      before:
        beforeDate && !Number.isNaN(beforeDate.getTime())
          ? beforeDate
          : undefined,
      limit: PAGE_SIZE,
    }),
    getTrackedNamespaces(),
  ]);

  const feedHref = getChangesHref({
    q: followed ? followed.roots.join(" ") : undefined,
    namespace: followed ? undefined : namespace,
    style: styleParam,
  }).replace("/changes", "/changes/feed.xml");

  const days = new Map<string, ChangeEvent[]>();
  for (const change of changes ?? []) {
    const day = dayFormatter.format(new Date(change.fetchedAt));
    days.set(day, [...(days.get(day) ?? []), change]);
  }

  const lastChange = changes?.at(-1);

  return (
    <ChangesLayout feedHref={feedHref}>
      <div className="flex w-full max-w-64 flex-col gap-1.5 text-sm">
        <span className="text-muted-foreground">shadcn style</span>
        <StylePicker value={style ?? ALL_STYLES} allowAll className="w-full" />
      </div>

      {followed ? (
        <p className="text-sm text-muted-foreground">
          Following{" "}
          <span className="font-mono text-foreground">
            {followed.roots.join(", ")}
          </span>{" "}
          and the {followed.specifiers.length - followed.roots.length} items
          they depend on.{" "}
          <Link
            href={getChangesHref({ style: styleParam })}
            className="underline underline-offset-4"
          >
            Show all
          </Link>
        </p>
      ) : (
        <nav
          aria-label="Filter by registry"
          className="flex flex-wrap gap-2 text-xs"
        >
          {[undefined, ...namespaces].map((value) => (
            <Link
              key={value ?? "all"}
              href={getChangesHref({ namespace: value, style: styleParam })}
              aria-current={value === namespace ? "page" : undefined}
              className={cn(
                "rounded-sm border px-2 py-0.5 font-mono transition-colors hover:border-ring",
                value === namespace
                  ? "border-foreground bg-foreground text-background hover:border-foreground"
                  : "bg-canvas text-canvas-foreground",
              )}
            >
              {value ?? "all"}
            </Link>
          ))}
        </nav>
      )}

      {days.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          {before
            ? "No older changes."
            : "No changes yet. Items are checked daily, and changes show up here once a new version is found."}
        </p>
      ) : (
        [...days].map(([day, dayChanges]) => (
          <section key={day} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold">{day}</h2>
            <ul className="divide-y rounded-md border">
              {dayChanges.map((change) => (
                <li key={change.snapshotId}>
                  <Link
                    href={getItemHref(change.specifier, change.style)}
                    className="flex flex-col gap-0.5 px-3 py-2 hover:bg-accent/50 sm:flex-row sm:items-baseline sm:gap-3"
                  >
                    <span className="truncate font-mono text-sm">
                      {change.specifier}
                    </span>
                    {change.style && !style ? (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {getShadcnStyleLabel(change.style)}
                      </span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {change.summary}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {timeFormatter.format(new Date(change.fetchedAt))} UTC
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      {changes?.length === PAGE_SIZE && lastChange ? (
        <Link
          href={getChangesHref({
            namespace: followed ? undefined : namespace,
            q: followed ? followed.roots.join(" ") : undefined,
            style: styleParam,
            before: lastChange.fetchedAt,
          })}
          className="self-start text-sm underline underline-offset-4"
        >
          Older changes
        </Link>
      ) : null}
    </ChangesLayout>
  );
}

function ChangesLayout({
  feedHref,
  children,
}: React.PropsWithChildren<{ feedHref?: string }>) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Changes
          </h1>
          <p className="max-w-2xl text-sm text-balance text-muted-foreground">
            shadcn registry items change without versions or changelogs.
            diagramcn checks tracked items daily and records what changed.
          </p>
        </div>
        {feedHref ? (
          <a
            href={feedHref}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Rss className="size-4" />
            RSS
          </a>
        ) : null}
      </div>
      {children}
    </div>
  );
}
