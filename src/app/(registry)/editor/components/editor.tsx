"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useRegistry } from "@/hooks/use-registry";
import { Diagram } from "./diagram";
import { TextEditor } from "./text-editor";

export function Editor() {
  const { registryUrl, registryJson, onRegistryJsonChange } = useRegistry();

  if (!registryUrl) {
    return <div>No registry URL found</div>;
  }

  return (
    <div className="h-[calc(100vh-60px)]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={0} maxSize={50}>
          <TextEditor
            height="100%"
            width="100%"
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
