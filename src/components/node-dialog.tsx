"use client";

import { CodeBlock } from "@/components/code-block";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDiagram } from "@/hooks/use-diagram";
import { useDialog } from "@/hooks/use-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNode } from "@/hooks/use-node";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

const packageManagers = ["pnpm", "npm", "yarn", "bun"];

export function NodeDialog() {
  const { open, variant, onOpenChange } = useDialog();
  const { selectedNode } = useDiagram();
  const isMobile = useIsMobile();
  const {
    textContent,
    path,
    content,
    type,
    target,
    packageManager,
    setPackageManager,
    resetState,
  } = useNode();

  React.useEffect(() => {
    if (!selectedNode || !open || variant !== "node") {
      resetState();
    }
  }, [selectedNode, open, variant, resetState]);

  if (!selectedNode || variant !== "node") return null;

  const isInstaller = textContent.includes("add");

  const dialogContent = (
    <div className="overflow-auto">
      {path ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-sm">Path:</h3>
            <CodeBlock
              code={path}
              language="plaintext"
              className="rounded-lg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <h3 className="font-medium text-sm">Type:</h3>
              <CodeBlock
                code={type}
                language="plaintext"
                className="rounded-lg"
              />
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-medium text-sm">Target:</h3>
              <CodeBlock
                code={target}
                language="plaintext"
                className="rounded-lg"
              />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-sm">Content:</h3>
            <CodeBlock
              code={content}
              language={path.split(".").pop()}
              className="max-h-[50svh] overflow-auto rounded-lg"
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          {isInstaller ? (
            <div className="rounded-t-md border-b bg-canvas px-4 pt-1.5">
              <Tabs value={packageManager} onValueChange={setPackageManager}>
                <TabsList className="gap-3 bg-transparent p-0">
                  {packageManagers.map((packageManager) => (
                    <TabsTrigger
                      key={packageManager}
                      value={packageManager}
                      className="rounded-none border-0 border-transparent border-b p-0 data-[state=active]:border-b-foreground data-[state=active]:bg-transparent dark:data-[state=active]:border-b-foreground dark:data-[state=active]:bg-transparent"
                    >
                      {packageManager}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          ) : null}
          <CodeBlock
            code={textContent}
            className="max-h-[60svh] overflow-auto"
            style={{
              borderTopLeftRadius: isInstaller ? "0" : "0.5rem",
              borderTopRightRadius: isInstaller ? "0" : "0.5rem",
            }}
            isInstaller={isInstaller}
          />
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(open) => onOpenChange(variant, open)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              {typeof selectedNode.text === "string"
                ? selectedNode.text
                : "Node"}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {selectedNode.data.type === "object" && selectedNode.data.isParent
                ? "Registry Component"
                : "Regular Dependency"}
            </DrawerDescription>
          </DrawerHeader>
          <Slot className="px-4 pb-4">{dialogContent}</Slot>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(open) => onOpenChange(variant, open)}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {typeof selectedNode.text === "string" ? selectedNode.text : "Node"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {selectedNode.data.type === "object" && selectedNode.data.isParent
              ? "Registry Component"
              : "Regular Dependency"}
          </DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
