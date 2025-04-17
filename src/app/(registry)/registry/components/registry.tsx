"use client";

import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useRegistry } from "@/hooks/use-registry";
import * as React from "react";
import { RegistryInput } from "../../components/registry-input";
import { Diagram } from "./diagram";
import { MermaidDiagram } from "./mermaid-diagram";

export function Registry() {
  const { registryMermaid, registryData, isPending } = useRegistry();
  const [isJsonDiagram, setIsJsonDiagram] = React.useState(false);

  if (!registryMermaid || !registryData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-40">
        <h1 className="max-w-lg text-pretty text-center font-semibold text-2xl tracking-tighter sm:text-3xl md:text-5xl">
          Type a shadcn/ui registry command or url
        </h1>
        <RegistryInput />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100svh-60px)] px-4 sm:px-6">
      <Tooltip delayDuration={700}>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsJsonDiagram(!isJsonDiagram)}
            className="-top-12 absolute right-24 z-50 flex w-fit select-none items-center gap-2 rounded-sm border p-2 text-xs"
          >
            <span>Json mode</span>
            <Switch
              checked={isJsonDiagram}
              onCheckedChange={setIsJsonDiagram}
              className="bg-accent"
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Toggle between Mermaid and JSON diagram view</p>
        </TooltipContent>
      </Tooltip>
      {isJsonDiagram ? (
        <Diagram />
      ) : (
        <MermaidDiagram
          code={registryMermaid}
          registryData={registryData}
          isPending={isPending}
        />
      )}
    </div>
  );
}
