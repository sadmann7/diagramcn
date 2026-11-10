"use client";

import { CircleAlert, Info, TriangleAlert } from "lucide-react";
import * as React from "react";

import type { InspectResult } from "@/lib/registry/inspect";
import type { Finding, PlannedFile, Severity } from "@/lib/registry/plan";

import { cn } from "@/lib/utils";

import { FileDialog } from "./file-dialog";

const severityIcons: Record<Severity, React.ElementType> = {
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

const severityClassNames: Record<Severity, string> = {
  error: "text-destructive",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-muted-foreground",
};

interface InstallPlanProps {
  result: InspectResult;
}

export function InstallPlan({ result }: InstallPlanProps) {
  const { graph, plan } = result;
  const [selectedFile, setSelectedFile] = React.useState<PlannedFile | null>(
    null,
  );

  const conflictedTargets = React.useMemo(
    () =>
      new Set(
        plan.findings
          .filter((finding) => finding.category === "conflict")
          .map((finding) => finding.target),
      ),
    [plan.findings],
  );

  return (
    <div className="flex flex-col gap-10 pb-16">
      <Section
        title="Findings"
        count={plan.findings.length}
        empty="Nothing stood out. The tree resolves cleanly with no conflicts or risky patterns."
      >
        <ul className="divide-y rounded-md border">
          {plan.findings.map((finding, index) => (
            <FindingRow key={index} finding={finding} />
          ))}
        </ul>
      </Section>

      <Section
        title="Files"
        count={plan.files.length}
        description="Paths assume the default aliases from components.json."
        empty="This install writes no files."
      >
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-canvas text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Target</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {plan.files.map((file) => (
                <tr
                  key={`${file.itemId}::${file.path}`}
                  className="cursor-pointer hover:bg-accent/50"
                  onClick={() => setSelectedFile(file)}
                >
                  <td className="px-3 py-2 font-mono text-xs">
                    <span
                      className={cn(
                        file.target &&
                          conflictedTargets.has(file.target) &&
                          "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {file.target ?? (
                        <span className="text-destructive">no target</span>
                      )}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                    {file.itemName}
                  </td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                    {file.type.replace("registry:", "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section
          title="Dependencies"
          count={plan.dependencies.length}
          empty="No npm dependencies."
        >
          <DependencyList dependencies={plan.dependencies} />
        </Section>
        <Section
          title="Dev dependencies"
          count={plan.devDependencies.length}
          empty="No dev dependencies."
        >
          <DependencyList dependencies={plan.devDependencies} />
        </Section>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section
          title="CSS variables"
          count={plan.cssVars.length}
          description="Merged into your global CSS file."
          empty="No CSS variables."
        >
          <ul className="max-h-80 divide-y overflow-y-auto rounded-md border font-mono text-xs">
            {plan.cssVars.map((cssVar) => (
              <li
                key={`${cssVar.scope}-${cssVar.name}`}
                className="flex items-baseline justify-between gap-4 px-3 py-1.5"
              >
                <span>
                  <span className="text-muted-foreground">{cssVar.scope} </span>
                  --{cssVar.name}
                </span>
                <span className="truncate text-right text-muted-foreground">
                  {cssVar.values.map((value) => value.value).join(" | ")}
                </span>
              </li>
            ))}
          </ul>
        </Section>
        <Section
          title="CSS rules"
          count={plan.cssRules.length}
          empty="No CSS rules."
        >
          <ul className="max-h-80 divide-y overflow-y-auto rounded-md border font-mono text-xs">
            {plan.cssRules.map((rule) => (
              <li
                key={rule.selector}
                className="flex justify-between gap-4 px-3 py-1.5"
              >
                <span className="truncate">{rule.selector}</span>
                <span className="text-muted-foreground">
                  {rule.definedBy.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {plan.envVars.length > 0 || plan.fonts.length > 0 ? (
        <div className="grid gap-10 lg:grid-cols-2">
          {plan.envVars.length > 0 ? (
            <Section
              title="Environment variables"
              count={plan.envVars.length}
              description="Added to your .env file."
            >
              <ul className="divide-y rounded-md border font-mono text-xs">
                {plan.envVars.map((envVar) => (
                  <li
                    key={`${envVar.name}-${envVar.value}`}
                    className="flex justify-between gap-4 px-3 py-1.5"
                  >
                    <span>{envVar.name}</span>
                    <span className="truncate text-muted-foreground">
                      {envVar.value || "(empty)"}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {plan.fonts.length > 0 ? (
            <Section title="Fonts" count={plan.fonts.length}>
              <ul className="divide-y rounded-md border text-sm">
                {plan.fonts.map((font) => (
                  <li
                    key={font.family}
                    className="flex justify-between px-3 py-1.5"
                  >
                    <span>{font.family}</span>
                    <span className="text-xs text-muted-foreground">
                      {font.definedBy}
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      ) : null}

      <Section title="Registries" count={graph.registries.length}>
        <ul className="divide-y rounded-md border text-sm">
          {graph.registries.map((registry) => (
            <li
              key={registry.namespace}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-mono text-xs">
                  {registry.homepage ? (
                    <a
                      href={registry.homepage}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline-offset-4 hover:underline"
                    >
                      {registry.namespace}
                    </a>
                  ) : (
                    registry.namespace
                  )}
                </span>
                {registry.description ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {registry.description}
                  </span>
                ) : null}
              </span>
              {registry.health ? (
                <span className="text-xs text-muted-foreground">
                  {registry.health.status}
                  {registry.health.score !== undefined
                    ? ` · score ${Math.round(registry.health.score)}`
                    : null}
                  {registry.health.availability30d !== undefined
                    ? ` · ${(registry.health.availability30d * 100).toFixed(1)}% uptime`
                    : null}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </Section>

      <FileDialog file={selectedFile} onClose={() => setSelectedFile(null)} />
    </div>
  );
}

interface SectionProps extends React.ComponentProps<"section"> {
  title: string;
  count?: number;
  description?: string;
  empty?: string;
}

function Section({
  title,
  count,
  description,
  empty,
  children,
  className,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn("flex min-w-0 flex-col gap-3", className)}
      {...props}
    >
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">
          {title}
          {count !== undefined ? (
            <span className="ml-2 font-normal text-muted-foreground tabular-nums">
              {count}
            </span>
          ) : null}
        </h2>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {count === 0 && empty ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        children
      )}
    </section>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const Icon = severityIcons[finding.severity];

  return (
    <li className="flex gap-3 px-3 py-2.5">
      <Icon
        aria-label={finding.severity}
        className={cn(
          "mt-0.5 size-4 shrink-0",
          severityClassNames[finding.severity],
        )}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-sm font-medium">
          {finding.title}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {finding.category}
          </span>
        </span>
        <span className="text-sm break-words text-muted-foreground">
          {finding.detail}
        </span>
        {finding.target ? (
          <span className="font-mono text-xs break-all text-muted-foreground">
            {finding.target}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function DependencyList({
  dependencies,
}: {
  dependencies: InspectResult["plan"]["dependencies"];
}) {
  return (
    <ul className="divide-y rounded-md border">
      {dependencies.map((dependency) => (
        <li
          key={dependency.name}
          className="flex items-baseline justify-between gap-4 px-3 py-1.5"
        >
          <a
            href={`https://www.npmjs.com/package/${dependency.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs underline-offset-4 hover:underline"
          >
            {dependency.name}
            {dependency.versions
              .map((version) => version.range)
              .filter(Boolean)
              .map((range) => (
                <span key={range} className="text-muted-foreground">
                  @{range}
                </span>
              ))}
          </a>
          <span className="truncate text-right text-xs text-muted-foreground">
            {dependency.versions
              .flatMap((version) => version.requiredBy)
              .join(", ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
