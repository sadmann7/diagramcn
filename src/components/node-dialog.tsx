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
import { useIsMobile } from "@/hooks/use-mobile";
import { useNode } from "@/hooks/use-node";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

const packageManagers = ["pnpm", "npm", "yarn", "bun"];

export function NodeDialog() {
  const { isNodeOpen, onNodeOpenChange } = useNode();
  const { selectedNode } = useDiagram();
  const [name, setName] = React.useState<string | null>(null);
  const [description, setDescription] = React.useState<string | null>(null);
  const [childrenCount, setChildrenCount] = React.useState(0);
  const [jsonPath, setJsonPath] = React.useState<string | null>(null);
  const [path, setPath] = React.useState<string | null>(null);
  const [content, setContent] = React.useState<string | null>(null);
  const [type, setType] = React.useState<string | null>(null);
  const [target, setTarget] = React.useState("");
  const [packageManager, setPackageManager] = React.useState("pnpm");
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!selectedNode || !isNodeOpen) return;

    setName(null);
    setDescription(null);
    setJsonPath(null);
    setChildrenCount(0);
    setPath(null);
    setContent(null);
    setType(null);
    setTarget("");

    if (selectedNode.path === "{Root}" && Array.isArray(selectedNode.text)) {
      const schemaEntry = selectedNode.text.find(([key]) => key === "$schema");
      const nameEntry = selectedNode.text.find(([key]) => key === "name");
      const typeEntry = selectedNode.text.find(([key]) => key === "type");
      const descriptionEntry = selectedNode.text.find(
        ([key]) => key === "description",
      );

      setContent(
        schemaEntry ? `pnpm dlx shadcn@latest add "${schemaEntry[1]}"` : null,
      );
      setJsonPath(selectedNode.path ?? null);

      setName(nameEntry ? nameEntry[1] : null);
      setType(typeEntry ? typeEntry[1] : null);
      setDescription(descriptionEntry ? descriptionEntry[1] : null);
      return;
    }

    if (selectedNode.data.isParent) {
      setContent(JSON.stringify(selectedNode.text, null, 2));
      setJsonPath(selectedNode.path ?? null);
      setChildrenCount(selectedNode.data.childrenCount ?? 0);
      return;
    }

    if (selectedNode.path?.includes("{Root}.registryDependencies")) {
      const componentName =
        typeof selectedNode.text === "string" ? selectedNode.text : null;
      setContent(
        componentName ? `pnpm dlx shadcn@latest add ${componentName}` : null,
      );
      return;
    }

    if (selectedNode.path?.includes("{Root}.dependencies")) {
      const packageName =
        typeof selectedNode.text === "string" ? selectedNode.text : null;
      setContent(packageName ? `pnpm add ${packageName}` : null);
      return;
    }

    if (selectedNode.path?.includes("{Root}.files")) {
      if (Array.isArray(selectedNode.text) && selectedNode.text.length >= 4) {
        const [path, content, type, target] = selectedNode.text;
        setPath(String(path).replace(/^path,\s*/, ""));
        setContent(String(content).replace(/^content,\s*/, ""));
        setType(String(type).replace(/^type,\s*/, ""));
        setTarget(String(target).replace(/^target,\s*/, ""));
        return;
      }
    }

    setContent(
      selectedNode.text ? JSON.stringify(selectedNode.text, null, 2) : null,
    );
    setJsonPath(selectedNode.path ?? null);
    setChildrenCount(selectedNode.data.childrenCount ?? 0);
  }, [selectedNode, isNodeOpen]);

  if (!selectedNode) return null;

  const nodeTitle =
    typeof selectedNode.text === "string"
      ? selectedNode.text
      : (name ?? "Node");

  const nodeDescription = description ?? "No description available";

  const isInstaller = content?.includes("add");

  const dialogContent = React.useMemo(() => {
    return (
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
                  code={target === "" ? JSON.stringify("") : target}
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
            {isInstaller ? (
              <div className="relative flex flex-col">
                <div className="rounded-t-md border-b bg-canvas px-4 pt-1.5">
                  <Tabs
                    value={packageManager}
                    onValueChange={setPackageManager}
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
                      borderTopLeftRadius: isInstaller ? "0" : "0.5rem",
                      borderTopRightRadius: isInstaller ? "0" : "0.5rem",
                    }}
                    isInstaller
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
                {content && !isInstaller && (
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
  }, [
    path,
    content,
    isInstaller,
    type,
    jsonPath,
    childrenCount,
    target,
    packageManager,
  ]);

  if (isMobile) {
    return (
      <Drawer open={isNodeOpen} onOpenChange={onNodeOpenChange}>
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
    <Dialog open={isNodeOpen} onOpenChange={onNodeOpenChange}>
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
