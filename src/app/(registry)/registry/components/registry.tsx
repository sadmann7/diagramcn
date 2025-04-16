"use client";

import { useRegistry } from "@/hooks/use-registry";
import { RegistryInput } from "../../components/registry-input";
import { MermaidDiagram } from "./mermaid-diagram";

export function Registry() {
  const { registryMermaid, isPending } = useRegistry();

  if (!registryMermaid) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 pt-40">
        <h1 className="max-w-lg text-pretty text-center font-semibold text-2xl tracking-tighter sm:text-3xl md:text-5xl">
          Type a shadcn/ui registry command or url
        </h1>
        <RegistryInput />
      </div>
    );
  }

  console.log({ registryMermaid });

  return (
    <div className="h-[calc(100vh-60px)] px-4">
      <MermaidDiagram code={registryMermaid} isPending={isPending} />
    </div>
  );
}
