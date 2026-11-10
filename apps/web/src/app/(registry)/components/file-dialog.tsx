"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@diagramcn/ui/components/dialog";

import type { PlannedFile } from "@/lib/registry/plan";

import { CodeBlock } from "@/components/code-block";

interface FileDialogProps {
  file: PlannedFile | null;
  onClose: () => void;
}

export function FileDialog({ file, onClose }: FileDialogProps) {
  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-base break-all">
            {file?.target ?? file?.path}
          </DialogTitle>
          <DialogDescription>
            {file?.itemName} · {file?.type} · from {file?.path}
          </DialogDescription>
        </DialogHeader>
        {file ? (
          <CodeBlock
            code={file.content ?? "// This file has no content."}
            language={file.path.split(".").pop()}
            className="max-h-[60svh] overflow-auto"
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
