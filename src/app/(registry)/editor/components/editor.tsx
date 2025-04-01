"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useRegistry } from "@/hooks/use-registry";
import * as React from "react";
import { TextEditor } from "./text-editor";

export function Editor() {
  const { registryUrl, registryJson, onRegistryJsonChange } = useRegistry();

  if (!registryUrl) {
    return <div>No registry URL found</div>;
  }

  return (
    <div className="h-[calc(100vh-56px)]">
      <ResizablePanelGroup direction="horizontal">
        <ResizablePanel defaultSize={25} minSize={25}>
          <TextEditor
            height="100%"
            width="100%"
            language="json"
            value={registryJson}
            onValueChange={onRegistryJsonChange}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 14,
              tabSize: 2,
              automaticLayout: true,
            }}
          />
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={60}>
          <div>Diagram</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
