"use client";

import { Check, Link2 } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";
import { toast } from "sonner";

import type { InspectResult } from "@/lib/registry/inspect";

import { CodeBlock } from "@/components/code-block";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { siteConfig } from "@/config/site";
import { diagramActions } from "@/hooks/use-diagram";
import { getPackageManagerCommands, packageManagers } from "@/lib/command";
import { getFilesMermaid, getItemsMermaid } from "@/lib/registry/mermaid";
import { getAddCommand, getInspectHref } from "@/lib/registry/specifier";
import { cn } from "@/lib/utils";

import { InstallPlan } from "./install-plan";
import { RegistryInput } from "./registry-input";

// Both renderers touch the DOM at import time.
const Diagram = dynamic(() => import("./diagram").then((mod) => mod.Diagram), {
  ssr: false,
});
const MermaidDiagram = dynamic(
  () => import("./mermaid-diagram").then((mod) => mod.MermaidDiagram),
  { ssr: false },
);

interface InspectorProps {
  result: InspectResult;
}

export function Inspector({ result }: InspectorProps) {
  const { specifiers } = result;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-6 sm:px-6">
      <RegistryInput
        defaultValue={specifiers.join(" ")}
        className="max-w-none"
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-mono text-xl font-semibold tracking-tight break-all">
            {specifiers.join(" + ")}
          </h1>
          <ShareButton specifiers={specifiers} />
        </div>
        <InspectSummary result={result} />
      </div>

      <InstallCommand getCommand={(dlx) => getAddCommand(dlx, specifiers)} />

      <InspectTabs result={result} />
    </div>
  );
}

export function InspectSummary({ result }: { result: InspectResult }) {
  const { graph, plan } = result;

  const errorCount = plan.findings.filter(
    (finding) => finding.severity === "error",
  ).length;
  const warningCount = plan.findings.filter(
    (finding) => finding.severity === "warning",
  ).length;

  const summary = [
    `${graph.nodes.length} ${graph.nodes.length === 1 ? "item" : "items"}`,
    `${plan.files.length} files`,
    `${plan.dependencies.length + plan.devDependencies.length} packages`,
    `${graph.registries.length} ${graph.registries.length === 1 ? "registry" : "registries"}`,
  ];

  return (
    <p className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
      {summary.map((part) => (
        <span key={part}>{part}</span>
      ))}
      <span
        className={cn(
          errorCount > 0
            ? "text-destructive"
            : warningCount > 0
              ? "text-amber-600 dark:text-amber-400"
              : "text-emerald-600 dark:text-emerald-400",
        )}
      >
        {errorCount > 0
          ? `${errorCount} ${errorCount === 1 ? "error" : "errors"}`
          : warningCount > 0
            ? `${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`
            : "no issues"}
      </span>
    </p>
  );
}

interface InstallCommandProps {
  getCommand: (dlx: string) => string;
}

export function InstallCommand({ getCommand }: InstallCommandProps) {
  const [packageManager, setPackageManager] =
    React.useState<(typeof packageManagers)[number]>("pnpm");

  return (
    <div className="flex flex-col">
      <div className="rounded-t-md border border-b-0 bg-canvas px-4 pt-1.5">
        <Tabs
          value={packageManager}
          onValueChange={(value) =>
            setPackageManager(value as typeof packageManager)
          }
        >
          <TabsList className="gap-3 bg-transparent p-0">
            {packageManagers.map((packageManager) => (
              <TabsTrigger
                key={packageManager}
                value={packageManager}
                className="rounded-none border-0 border-b border-transparent p-0 data-[state=active]:border-b-foreground data-[state=active]:bg-transparent dark:data-[state=active]:border-b-foreground dark:data-[state=active]:bg-transparent"
              >
                {packageManager}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>
      <CodeBlock
        code={getCommand(getPackageManagerCommands(packageManager).dlx)}
        language="bash"
        className="rounded-b-md border border-t-0"
        style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
        isCommand
      />
    </div>
  );
}

export function InspectTabs({ result }: { result: InspectResult }) {
  const { specifiers, plan } = result;

  return (
    <Tabs defaultValue="plan" className="gap-6">
      <TabsList>
        <TabsTrigger value="plan">Install plan</TabsTrigger>
        <TabsTrigger value="items">Item graph</TabsTrigger>
        <TabsTrigger value="files">File graph</TabsTrigger>
        <TabsTrigger value="json">JSON</TabsTrigger>
      </TabsList>
      <TabsContent value="plan">
        <InstallPlan result={result} />
      </TabsContent>
      <TabsContent value="items">
        <GraphPanel>
          <MermaidDiagram
            code={getItemsMermaid(result)}
            files={plan.files}
            fileName={`${specifiers[0] ?? "registry"}-items`}
          />
        </GraphPanel>
      </TabsContent>
      <TabsContent value="files">
        <GraphPanel>
          {plan.files.length > 0 ? (
            <MermaidDiagram
              code={getFilesMermaid(result)}
              files={plan.files}
              fileName={`${specifiers[0] ?? "registry"}-files`}
            />
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              No files to show.
            </p>
          )}
        </GraphPanel>
      </TabsContent>
      <TabsContent value="json">
        <ItemJson result={result} />
      </TabsContent>
    </Tabs>
  );
}

function GraphPanel({ children }: React.PropsWithChildren) {
  return (
    <div className="mb-16 h-[70svh] overflow-hidden rounded-md border bg-canvas">
      {children}
    </div>
  );
}

function ItemJson({ result }: { result: InspectResult }) {
  const items = result.graph.nodes.filter((node) => node.item);
  const [selectedId, setSelectedId] = React.useState(items[0]?.id);
  const selected = items.find((node) => node.id === selectedId);

  React.useEffect(() => {
    if (!selected?.item) return;
    diagramActions.setDiagram(JSON.stringify(selected.item, null, 2));
    return () => diagramActions.clearDiagram();
  }, [selected]);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">No items resolved.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        aria-label="Registry item"
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="h-9 w-full max-w-sm rounded-md border bg-background px-2 font-mono text-sm"
      >
        {items.map((node) => (
          <option key={node.id} value={node.id}>
            {node.namespace ? `${node.namespace}/` : ""}
            {node.item?.name}
          </option>
        ))}
      </select>
      <GraphPanel>
        <Diagram />
      </GraphPanel>
    </div>
  );
}

function ShareButton({ specifiers }: { specifiers: string[] }) {
  const [copied, setCopied] = React.useState<"link" | "badge" | null>(null);

  const onCopy = React.useCallback(
    async (kind: "link" | "badge") => {
      const href = `${siteConfig.url}${getInspectHref(specifiers)}`;
      const badge = `${siteConfig.url}/api/badge?q=${encodeURIComponent(specifiers.join(" "))}`;
      const text = kind === "link" ? href : `[![diagramcn](${badge})](${href})`;

      try {
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        toast.success(
          kind === "link" ? "Link copied" : "Badge markdown copied",
        );
        setTimeout(() => setCopied(null), 2000);
      } catch {
        toast.error("Failed to copy to clipboard");
      }
    },
    [specifiers],
  );

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => onCopy("link")}>
        {copied === "link" ? <Check /> : <Link2 />}
        Copy link
      </Button>
      <Button variant="outline" size="sm" onClick={() => onCopy("badge")}>
        {copied === "badge" ? <Check /> : null}
        Copy badge
      </Button>
    </div>
  );
}
