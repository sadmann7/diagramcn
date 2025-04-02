"use client";

import { Button } from "@/components/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useEditor } from "@/hooks/use-editor";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRegistry } from "@/hooks/use-registry";
import { File } from "lucide-react";
import { RegistryInput } from "../../components/registry-input";
import { Diagram } from "./diagram";
import { TextEditor } from "./text-editor";

export function Editor() {
  const { registryUrl, registryJson, onRegistryJsonChange } = useRegistry();
  const isMobile = useIsMobile();
  const { isEditorVisible } = useEditor();

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

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-60px)]">
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="fixed right-4 bottom-4 z-10"
            >
              <File />
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full gap-0">
            <SheetHeader className="h-14">
              <SheetTitle>Edit Registry</SheetTitle>
            </SheetHeader>
            <TextEditor
              language="json"
              value={registryJson}
              onChange={onRegistryJsonChange}
            />
          </SheetContent>
        </Sheet>
        <Diagram />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-60px)]">
      <ResizablePanelGroup direction="horizontal">
        {isEditorVisible && (
          <>
            <ResizablePanel defaultSize={30} minSize={25} maxSize={50}>
              <TextEditor
                language="json"
                value={registryJson}
                onChange={onRegistryJsonChange}
              />
            </ResizablePanel>
            <ResizableHandle />
          </>
        )}
        <ResizablePanel defaultSize={isEditorVisible ? 70 : 100}>
          <Diagram />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
