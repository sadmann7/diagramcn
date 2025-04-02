"use client";

import { CodeBlock } from "@/components/code-block";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDiagram } from "@/hooks/use-diagram";
import { useDialog } from "@/hooks/use-dialog";
import * as React from "react";

const packageManagers = ["pnpm", "npm", "yarn", "bun"];

export function NodeDialog() {
  const { open, variant, onOpenChange } = useDialog();
  const { selectedNode } = useDiagram();
  const [textContent, setTextContent] = React.useState("");
  const [path, setPath] = React.useState("");
  const [content, setContent] = React.useState("");
  const [type, setType] = React.useState("");
  const [target, setTarget] = React.useState("");
  const [packageManager, setPackageManager] = React.useState("pnpm");

  React.useEffect(() => {
    if (!selectedNode || !open || variant !== "node") return;

    // Reset all states
    setPath("");
    setContent("");
    setType("");
    setTarget("");

    // Check if it's the schema node (root node)
    if (selectedNode.path === "{Root}" && Array.isArray(selectedNode.text)) {
      const schemaName = selectedNode.text.find(([key]) => key === "$schema");
      const schemaNameValue = schemaName ? schemaName[1] : "";
      console.log({ schemaName, schemaNameValue });
      setTextContent(
        `${packageManager} dlx shadcn@latest add "${schemaNameValue}"`,
      );
      return;
    }

    // Handle parent nodes (like arrays or objects with children)
    if (selectedNode.data.isParent) {
      const info = {
        type: selectedNode.data.type,
        path: selectedNode.path,
        childrenCount: selectedNode.data.childrenCount,
      };
      setTextContent(JSON.stringify(info, null, 2));
      return;
    }

    // Check if it's a registry dependency
    if (selectedNode.path?.includes("{Root}.registryDependencies")) {
      const componentName =
        typeof selectedNode.text === "string" ? selectedNode.text : "";
      console.log({ componentName });
      setTextContent(
        `${packageManager} dlx shadcn@latest add ${componentName}`,
      );
      return;
    }

    // Check if it's a regular dependency
    if (selectedNode.path?.includes("{Root}.dependencies")) {
      const packageName =
        typeof selectedNode.text === "string" ? selectedNode.text : "";
      setTextContent(`${packageManager} add ${packageName}`);
      return;
    }

    // Check if it's a file node
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
  }, [selectedNode, open, variant, packageManager]);

  const isInstaller = textContent.includes("add");

  if (!selectedNode || variant !== "node") return null;

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
      </DialogContent>
    </Dialog>
  );
}
