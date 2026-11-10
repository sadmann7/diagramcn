import { Button } from "@diagramcn/ui/components/button";
import { ArrowRight, Layers } from "lucide-react";
import Link from "next/link";

import { InstallCommand } from "@/components/install-command";
import { getItemHref } from "@/lib/registry/specifier";
import { getRecentChanges } from "@/lib/tracking/changes";

import { RegistryInput } from "./components/registry-input";

const sampleOutput = `@shadcn/button
  installed Dec 12, 2025 (detected) → upstream Nov 10, 2026
  ✓ components/ui/button.tsx  merged, kept your edits
  + cn  needed upstream, not installed
  + radix-ui  needed upstream, not installed

Install the new dependencies:
  npm install cn radix-ui`;

const steps = [
  {
    title: "Every version, tracked",
    description:
      "diagramcn keeps every version of the registry items it tracks. @shadcn history goes back to early 2025.",
  },
  {
    title: "Your version, found",
    description:
      "It works out which version you installed from diagramcn-lock.json, or by comparing your files to each one.",
  },
  {
    title: "A real three-way merge",
    description:
      "Upstream's changes land on top of yours with git merge-file. Overlapping edits get conflict markers, and new packages are listed.",
  },
];

// Recent changes come from the daily crawl, so hourly is fresh enough.
export const revalidate = 3600;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeZone: "UTC",
});

export default async function IndexPage() {
  const changes = await getRecentChanges({ limit: 6 }).catch(() => null);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-20 px-4 pt-24 pb-24 sm:px-6 sm:pt-32">
      <section className="flex flex-col items-center gap-6 text-center">
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tighter text-balance md:text-5xl">
          Update shadcn components without losing your edits
        </h1>
        <p className="max-w-xl text-balance text-muted-foreground">
          <code className="font-mono text-sm">shadcn add</code> can only keep
          your copy or overwrite it. diagramcn merges what changed upstream into
          the components you&apos;ve edited, from any registry.
        </p>
        <div className="w-full max-w-md text-left">
          <InstallCommand command={`diagramcn sync button`} />
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] md:items-center">
        <pre className="overflow-x-auto rounded-md border bg-canvas p-4 font-mono text-xs leading-relaxed text-canvas-foreground">
          {sampleOutput}
        </pre>
        <ol className="flex flex-col gap-5">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums">
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-semibold">{step.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Look up an item
          </h2>
          <p className="text-sm text-muted-foreground">
            See its versions, what changed in each, and the command to pull
            those changes in.
          </p>
        </div>
        <RegistryInput className="max-w-none" />
      </section>

      {changes && changes.length > 0 ? (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">
              Changed upstream recently
            </h2>
            <Link
              href="/changes"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              All changes
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
          <ul className="divide-y rounded-md border">
            {changes.map((change) => (
              <li key={change.snapshotId}>
                <Link
                  href={getItemHref(change.specifier, change.style)}
                  className="flex flex-col gap-0.5 px-3 py-2.5 hover:bg-accent/50 sm:flex-row sm:items-baseline sm:gap-3"
                >
                  <span className="font-mono text-sm">{change.specifier}</span>
                  <span className="flex-1 truncate text-xs text-muted-foreground">
                    {change.summary}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateFormatter.format(new Date(change.fetchedAt))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col items-start gap-4 rounded-md border p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold tracking-tight">Mixing registries?</h2>
          <p className="text-sm text-muted-foreground">
            Lay items from any registry out on the canvas to see where they
            clash, then install them with one command.
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/canvas" />}
        >
          <Layers />
          Open the canvas
        </Button>
      </section>
    </div>
  );
}
