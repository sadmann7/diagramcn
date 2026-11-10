import Link from "next/link";

import { getInspectHref } from "@/lib/registry/specifier";

import { RegistryInput } from "./components/registry-input";

const examples = [
  ["@shadcn/sidebar-07"],
  ["@shadcn/dashboard-01"],
  ["@magicui/marquee"],
  ["@shadcn/sidebar-07", "@shadcn/dashboard-01"],
];

export default function IndexPage() {
  return (
    <div className="flex flex-col items-center px-4 pt-32 pb-16 sm:pt-40">
      <div className="flex w-full flex-col items-center gap-6">
        <div className="flex max-w-2xl flex-col items-center gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tighter text-balance md:text-5xl">
            See what shadcn add does before you run it
          </h1>
          <p className="text-balance text-muted-foreground">
            Paste a command, an item, or a URL. Get the full dependency graph
            across registries, every file it writes, the packages it installs,
            and anything worth a second look.
          </p>
        </div>
        <RegistryInput autoFocus />
        <div className="flex max-w-2xl flex-wrap justify-center gap-2 text-sm">
          <span className="text-muted-foreground">Try</span>
          {examples.map((specifiers) => (
            <Link
              key={specifiers.join(" ")}
              href={getInspectHref(specifiers)}
              className="rounded-sm border bg-canvas px-2 py-0.5 font-mono text-xs text-canvas-foreground transition-colors hover:border-ring"
            >
              {specifiers.join(" + ")}
            </Link>
          ))}
        </div>
        <Link
          href="/stack"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Installing several items? Build a stack and get one command.
        </Link>
      </div>
    </div>
  );
}
