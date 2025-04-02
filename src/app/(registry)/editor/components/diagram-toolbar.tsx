"use client";

import { Portal } from "@/components/portal";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDiagram } from "@/hooks/use-diagram";
import { cn } from "@/lib/utils";
import { Focus, Maximize, Minus, Plus } from "lucide-react";

interface DiagramToolbarProps {
  orientation?: "horizontal" | "vertical";
}

export function DiagramToolbar({
  orientation = "horizontal",
}: DiagramToolbarProps) {
  const { zoomIn, zoomOut, centerView, focusFirstNode } = useDiagram();

  return (
    <Portal>
      <div
        role="toolbar"
        aria-orientation={orientation}
        className={cn(
          "absolute right-4 bottom-4 flex rounded-sm border border-border/70 bg-canvas shadow-md backdrop-blur-md",
          orientation === "vertical" && "flex-col",
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-8",
                orientation === "horizontal"
                  ? "rounded-r-none"
                  : "rounded-b-none",
              )}
              onClick={() => zoomIn()}
            >
              <Plus />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            sideOffset={4}
            className="rounded border bg-background text-accent-foreground [&>span]:hidden"
          >
            <p>Zoom in</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-8 rounded-none")}
              onClick={() => zoomOut()}
            >
              <Minus />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            sideOffset={4}
            className="rounded border bg-background text-accent-foreground [&>span]:hidden"
          >
            <p>Zoom out</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("size-8 rounded-none")}
              onClick={() => centerView()}
            >
              <Maximize />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            sideOffset={4}
            className="rounded border bg-background text-accent-foreground [&>span]:hidden"
          >
            <p>Center view</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-8",
                orientation === "horizontal"
                  ? "rounded-l-none"
                  : "rounded-t-none",
              )}
              onClick={() => focusFirstNode()}
            >
              <Focus />
            </Button>
          </TooltipTrigger>
          <TooltipContent
            sideOffset={4}
            className="rounded border bg-background text-accent-foreground [&>span]:hidden"
          >
            <p>Focus first node</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </Portal>
  );
}
