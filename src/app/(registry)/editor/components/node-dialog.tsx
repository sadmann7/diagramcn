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
import { useIsMobile } from "@/hooks/use-mobile";
import { useNode } from "@/hooks/use-node";
import { getIsPackageManagerCommand, packageManagers } from "@/lib/command";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";

export function NodeDialog() {
  const {
    nodeOpen,
    onNodeOpenChange,
    selectedNode,
    name,
    description,
    childrenCount,
    jsonPath,
    path,
    content,
    type,
    target,
    packageManager,
    onPackageManagerChange,
  } = useNode();
  const isMobile = useIsMobile();

  if (!selectedNode) return null;

  const nodeTitle =
    typeof selectedNode.text === "string"
      ? selectedNode.text
      : (name ?? "Node");

  const nodeDescription = description ?? `View content for ${nodeTitle}`;

  const isCommand = getIsPackageManagerCommand(content);

  console.log({ selectedNode, path, content, type, target });

  const dialogContent = (
    <div className="overflow-auto">
      {path ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="font-medium text-sm">Path:</h3>
            <CodeBlock code={path} language="plaintext" />
          </div>
          <div className="flex items-center gap-4">
            {type ? (
              <div className="flex w-full flex-col gap-2">
                <h3 className="font-medium text-sm">Type:</h3>
                <CodeBlock code={type} language="plaintext" />
              </div>
            ) : null}
            <div className="flex w-full flex-col gap-2">
              <h3 className="font-medium text-sm">Target:</h3>
              <CodeBlock
                code={target ?? JSON.stringify("")}
                language="plaintext"
              />
            </div>
          </div>
          {content ? (
            <div className="flex flex-col gap-2">
              <h3 className="font-medium text-sm">Content:</h3>
              <CodeBlock
                code={content}
                language={path.split(".").pop()}
                className="max-h-[50svh] overflow-auto"
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {isCommand ? (
            <div className="relative flex flex-col">
              <div className="rounded-t-md border-b bg-canvas px-4 pt-1.5">
                <Tabs
                  value={packageManager}
                  onValueChange={onPackageManagerChange}
                >
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
              {content ? (
                <CodeBlock
                  code={content}
                  className="max-h-[60svh] overflow-auto"
                  style={{
                    borderTopLeftRadius: isCommand ? "0" : "0.5rem",
                    borderTopRightRadius: isCommand ? "0" : "0.5rem",
                  }}
                  isCommand
                />
              ) : null}
            </div>
          ) : null}
          {type || jsonPath || childrenCount > 0 ? (
            <div className="flex flex-col gap-4">
              {type && (
                <div className="flex w-full flex-col gap-2">
                  <h3 className="font-medium text-sm">Type:</h3>
                  <CodeBlock code={type} />
                </div>
              )}
              <div className="flex items-center gap-4">
                {jsonPath ? (
                  <div className="flex w-full flex-col gap-2">
                    <h3 className="font-medium text-sm">JSON path:</h3>
                    <CodeBlock code={jsonPath} />
                  </div>
                ) : null}
                {childrenCount > 0 ? (
                  <div className="flex w-full flex-col gap-2">
                    <h3 className="font-medium text-sm">Children count:</h3>
                    <CodeBlock code={childrenCount.toString()} />
                  </div>
                ) : null}
              </div>
              {content && !isCommand && (
                <div className="flex w-full flex-col gap-2">
                  <h3 className="font-medium text-sm">Content:</h3>
                  <CodeBlock
                    code={content}
                    className="max-h-[50svh] overflow-auto"
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={nodeOpen} onOpenChange={onNodeOpenChange}>
        <DrawerContent className="gap-6">
          <DrawerHeader>
            <DrawerTitle>{nodeTitle}</DrawerTitle>
            <DrawerDescription className={cn(!description && "sr-only")}>
              {nodeDescription}
            </DrawerDescription>
          </DrawerHeader>
          <Slot className="px-4 pb-4">{dialogContent}</Slot>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={nodeOpen} onOpenChange={onNodeOpenChange}>
      <DialogContent className="gap-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{nodeTitle}</DialogTitle>
          <DialogDescription className={cn(!description && "sr-only")}>
            {nodeDescription}
          </DialogDescription>
        </DialogHeader>
        {dialogContent}
      </DialogContent>
    </Dialog>
  );
}
