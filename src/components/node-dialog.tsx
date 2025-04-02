"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDiagram } from "@/hooks/use-diagram";
import { useDialog } from "@/hooks/use-dialog";
import * as React from "react";

export function NodeDialog() {
  const { open, variant, onOpenChange } = useDialog();
  const { selectedNode } = useDiagram();
  const [content, setContent] = React.useState<string>("");

  React.useEffect(() => {
    if (!selectedNode || !open || variant !== "node") return;

    // Check if it's the schema node (root node)
    if (selectedNode.path === "{Root}" && Array.isArray(selectedNode.text)) {
      const schemaName = selectedNode.text.find(([key]) => key === "$schema");
      const schemaNameValue = schemaName ? schemaName[1] : "";
      console.log({ schemaName, schemaNameValue });
      setContent(`pnpm dlx shadcn@latest add "${schemaNameValue}"`);
      return;
    }

    // Handle parent nodes (like arrays or objects with children)
    if (selectedNode.data.isParent) {
      const info = {
        type: selectedNode.data.type,
        path: selectedNode.path,
        childrenCount: selectedNode.data.childrenCount,
      };
      setContent(JSON.stringify(info, null, 2));
      return;
    }

    // Check if it's a registry dependency
    if (selectedNode.path?.includes("{Root}.registryDependencies")) {
      const componentName =
        typeof selectedNode.text === "string" ? selectedNode.text : "";
      console.log({ componentName });
      setContent(`pnpm dlx shadcn@latest add ${componentName}`);
      return;
    }

    // Check if it's a regular dependency
    if (selectedNode.path?.includes("{Root}.dependencies")) {
      const packageName =
        typeof selectedNode.text === "string" ? selectedNode.text : "";
      setContent(`pnpm add ${packageName}`);
      return;
    }

    // Check if it's a file node
    if (selectedNode.path?.includes("{Root}.files")) {
      if (Array.isArray(selectedNode.text)) {
        const [filePath, fileContent, type, target] = selectedNode.text;
        setContent(
          `File Path: ${filePath}\n\n\`\`\`${type}\n${fileContent}\n\`\`\`\n\nType: ${type}\nTarget: ${target}`,
        );
        return;
      }
    }
  }, [selectedNode, open, variant]);

  if (!selectedNode || variant !== "node") return null;

  return (
    <Dialog open={open} onOpenChange={(open) => onOpenChange(variant, open)}>
      <DialogContent className="sm:max-w-2xl">
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
        <pre className="prose dark:prose-invert mt-4 max-h-[500px] overflow-auto rounded-lg bg-muted p-4">
          <code>{content}</code>
        </pre>
      </DialogContent>
    </Dialog>
  );
}
