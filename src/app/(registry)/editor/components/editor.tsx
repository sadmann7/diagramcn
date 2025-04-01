"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useRegistry } from "@/hooks/use-registry";
import { RegistryInput } from "../../components/registry-input";
import { Diagram } from "./diagram";
import { TextEditor } from "./text-editor";

export function Editor() {
  const { registryUrl, registryJson, onRegistryJsonChange } = useRegistry();

  if (!registryUrl || !registryJson) {
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
    <div className="h-[calc(100vh-60px)]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={0} maxSize={50}>
          <TextEditor
            language="json"
            value={registryJson}
            onChange={onRegistryJsonChange}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={75}>
          <Diagram />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
