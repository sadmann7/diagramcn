"use client";

import { Focus, Maximize, Minus, Plus } from "lucide-react";
import { ActionButton } from "@/components/action-button";
import { Portal } from "@/components/portal";
import { useDiagram } from "@/hooks/use-diagram";
import { cn } from "@/lib/utils";

interface DiagramToolbarProps {
  orientation?: "horizontal" | "vertical";
}

export function DiagramToolbar({
  orientation = "horizontal",
}: DiagramToolbarProps) {
  const { zoomIn, zoomOut, centerView, focusFirstNode } = useDiagram();

  return (
    <div
      role="toolbar"
      aria-orientation={orientation}
      className={cn(
        "absolute top-4 right-4 flex rounded bg-accent/60 shadow-md backdrop-blur-sm",
        orientation === "vertical" && "flex-col",
      )}
    >
      <ActionButton
        tooltip="Focus first node"
        className={cn(
          orientation === "horizontal" ? "rounded-r-none" : "rounded-b-none",
        )}
        onClick={() => focusFirstNode()}
      >
        <Focus />
      </ActionButton>
      <ActionButton
        tooltip="Reset view"
        className="rounded-none"
        onClick={() => centerView()}
      >
        <Maximize />
      </ActionButton>
      <ActionButton
        tooltip="Zoom out"
        className="rounded-none"
        onClick={() => zoomOut()}
      >
        <Minus />
      </ActionButton>
      <ActionButton
        tooltip="Zoom in"
        className={cn(
          orientation === "horizontal" ? "rounded-l-none" : "rounded-t-none",
        )}
        onClick={() => zoomIn()}
      >
        <Plus />
      </ActionButton>
    </div>
  );
}
