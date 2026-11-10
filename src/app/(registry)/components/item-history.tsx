"use client";

import { ChevronRight, Loader, Rss, TriangleAlert } from "lucide-react";
import * as React from "react";

import type { ItemChanges } from "@/lib/tracking/compare";
import type {
  FileDiff,
  HistoryVersion,
  ItemHistoryResult,
} from "@/lib/tracking/history";

import { getChangeSummary } from "@/lib/tracking/compare";
import { cn } from "@/lib/utils";

// Fixed locale and time zone so server and client render the same text.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatDate(value: string) {
  return `${dateFormatter.format(new Date(value))} UTC`;
}

interface ItemHistoryProps {
  result: ItemHistoryResult;
}

export function ItemHistory({ result }: ItemHistoryProps) {
  if (result.status === "disabled") {
    return (
      <HistoryNotice>
        Change tracking isn&apos;t enabled on this deployment.
      </HistoryNotice>
    );
  }

  if (result.status === "unavailable") {
    return (
      <HistoryNotice>
        History couldn&apos;t be loaded right now. Try again in a bit.
      </HistoryNotice>
    );
  }

  if (result.status === "untracked") {
    return (
      <HistoryNotice>
        This item wasn&apos;t tracked yet. It is now, so future changes will
        show up here.
      </HistoryNotice>
    );
  }

  const { history } = result;
  const changedVersions = history.versions.filter((version) => version.changes);

  return (
    <div className="flex flex-col gap-4 pb-16">
      <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
        <span>Tracked since {formatDate(history.trackedSince)}</span>
        {history.lastCheckedAt ? (
          <span>Last checked {formatDate(history.lastCheckedAt)}</span>
        ) : null}
        <span>
          {changedVersions.length}{" "}
          {changedVersions.length === 1 ? "change" : "changes"}
        </span>
        <a
          href={`/changes/feed.xml?q=${encodeURIComponent(history.specifier)}`}
          title="Changes to this item and everything it depends on"
          className="flex items-center gap-1 hover:text-foreground"
        >
          <Rss className="size-3.5" />
          RSS
        </a>
      </p>

      {history.lastError ? (
        <p className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-400">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          The last check failed: {history.lastError}
        </p>
      ) : null}

      {changedVersions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No changes since tracking started.
        </p>
      ) : null}

      <ol className="divide-y rounded-md border">
        {history.versions.map((version) => (
          <VersionRow key={version.id} version={version} />
        ))}
      </ol>

      {history.hasMore ? (
        <p className="text-xs text-muted-foreground">
          Showing the {history.versions.length} most recent versions.
        </p>
      ) : null}
    </div>
  );
}

function HistoryNotice({ children }: React.PropsWithChildren) {
  return <p className="pb-16 text-sm text-muted-foreground">{children}</p>;
}

function VersionRow({ version }: { version: HistoryVersion }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { changes } = version;

  return (
    <li>
      <div className="flex items-center">
        <button
          type="button"
          aria-expanded={isOpen}
          disabled={!changes}
          onClick={() => setIsOpen((open) => !open)}
          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left enabled:hover:bg-accent/50"
        >
          <ChevronRight
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              isOpen && "rotate-90",
              !changes && "invisible",
            )}
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
            <span className="text-sm whitespace-nowrap">
              {formatDate(version.fetchedAt)}
            </span>
            <span className="truncate text-xs text-muted-foreground">
              {changes ? getChangeSummary(changes) : "First version seen"}
            </span>
          </span>
          {version.origin === "crawl" ? (
            <code className="shrink-0 font-mono text-xs text-muted-foreground">
              {version.hash.slice(0, 7)}
            </code>
          ) : null}
        </button>
        {version.origin === "git" && version.commitSha ? (
          <a
            href={`https://github.com/shadcn-ui/ui/commit/${version.commitSha}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Imported from shadcn/ui's git history (files only)"
            className="shrink-0 px-3 font-mono text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            git {version.commitSha.slice(0, 7)}
          </a>
        ) : null}
      </div>
      {isOpen && changes ? (
        <VersionDetails versionId={version.id} changes={changes} />
      ) : null}
    </li>
  );
}

type DiffState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; diffs: FileDiff[] };

function VersionDetails({
  versionId,
  changes,
}: {
  versionId: string;
  changes: ItemChanges;
}) {
  const [state, setState] = React.useState<DiffState>({ status: "loading" });

  React.useEffect(() => {
    if (changes.files.length === 0) return;
    const controller = new AbortController();

    fetch(`/api/history/diff?snapshot=${encodeURIComponent(versionId)}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Request failed");
        setState({ status: "ready", diffs: data });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Request failed",
        });
      });

    return () => controller.abort();
  }, [versionId, changes.files.length]);

  const lists = [
    ["Dependencies", changes.dependencies],
    ["Dev dependencies", changes.devDependencies],
    ["Registry dependencies", changes.registryDependencies],
  ] as const;

  const valueGroups = [
    ["CSS variables", changes.cssVars],
    ["Environment variables", changes.envVars],
  ] as const;

  return (
    <div className="flex flex-col gap-4 border-t bg-canvas/50 px-3 py-3 sm:px-10">
      {lists.map(([label, change]) =>
        change.added.length || change.removed.length ? (
          <ChangeGroup key={label} title={label}>
            {change.added.map((entry) => (
              <ChangeLine key={`+${entry}`} kind="added">
                {entry}
              </ChangeLine>
            ))}
            {change.removed.map((entry) => (
              <ChangeLine key={`-${entry}`} kind="removed">
                {entry}
              </ChangeLine>
            ))}
          </ChangeGroup>
        ) : null,
      )}

      {valueGroups.map(([label, values]) =>
        values.length > 0 ? (
          <ChangeGroup key={label} title={label}>
            {values.map((value) => (
              <li key={value.key} className="font-mono text-xs break-all">
                <span>{value.key}</span>{" "}
                {value.from !== null ? (
                  <span className="text-red-600 line-through dark:text-red-400">
                    {value.from}
                  </span>
                ) : null}{" "}
                <span className="text-emerald-600 dark:text-emerald-400">
                  {value.to ?? "(removed)"}
                </span>
              </li>
            ))}
          </ChangeGroup>
        ) : null,
      )}

      {changes.fields.length > 0 ? (
        <ChangeGroup title="Other fields">
          <li className="font-mono text-xs">{changes.fields.join(", ")}</li>
        </ChangeGroup>
      ) : null}

      {changes.files.length > 0 ? (
        <ChangeGroup title="Files">
          {state.status === "loading" ? (
            <li className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader className="size-3.5 animate-spin" /> Loading diffs...
            </li>
          ) : state.status === "error" ? (
            <li className="text-xs text-destructive">{state.message}</li>
          ) : (
            state.diffs.map((diff) => (
              <li key={diff.path}>
                <FileDiffView diff={diff} />
              </li>
            ))
          )}
        </ChangeGroup>
      ) : null}
    </div>
  );
}

function ChangeGroup({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
      <ul className="flex flex-col gap-1">{children}</ul>
    </section>
  );
}

function ChangeLine({
  kind,
  children,
}: React.PropsWithChildren<{ kind: "added" | "removed" }>) {
  return (
    <li
      className={cn(
        "font-mono text-xs",
        kind === "added"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400",
      )}
    >
      {kind === "added" ? "+ " : "− "}
      {children}
    </li>
  );
}

const statusClassNames: Record<FileDiff["status"], string> = {
  added: "text-emerald-600 dark:text-emerald-400",
  removed: "text-red-600 dark:text-red-400",
  modified: "text-amber-600 dark:text-amber-400",
};

function FileDiffView({ diff }: { diff: FileDiff }) {
  const isMoved =
    diff.status === "modified" && diff.fromTarget !== diff.toTarget;

  return (
    <div className="overflow-hidden rounded-md border bg-background">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b px-3 py-1.5">
        <span className="font-mono text-xs break-all">{diff.path}</span>
        <span className={cn("text-xs", statusClassNames[diff.status])}>
          {diff.status}
        </span>
        {isMoved ? (
          <span className="font-mono text-xs text-muted-foreground">
            {diff.fromTarget ?? "default"} → {diff.toTarget ?? "default"}
          </span>
        ) : null}
      </div>
      {diff.hunks.length > 0 ? (
        <pre className="max-h-[60svh] overflow-auto py-1 font-mono text-xs leading-5">
          {diff.hunks.map((hunk) => (
            <React.Fragment key={`${hunk.oldStart}-${hunk.newStart}`}>
              <div className="px-3 text-muted-foreground">
                @@ −{hunk.oldStart} +{hunk.newStart} @@
              </div>
              {hunk.lines.map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    "px-3 whitespace-pre",
                    line.startsWith("+") &&
                      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                    line.startsWith("-") &&
                      "bg-red-500/10 text-red-700 dark:text-red-300",
                    line.startsWith("\\") && "text-muted-foreground",
                  )}
                >
                  {line || " "}
                </div>
              ))}
            </React.Fragment>
          ))}
        </pre>
      ) : null}
      {diff.note ? (
        <p className="px-3 py-1.5 text-xs text-muted-foreground">{diff.note}</p>
      ) : null}
    </div>
  );
}
