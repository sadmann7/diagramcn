"use client";

import { NodeContent } from "@/app/(registry)/editor/components/node-content";
import { Button } from "@/components/ui/button";
import { useBranch } from "@/hooks/use-branch";
import { useDiagram } from "@/hooks/use-diagram";
import { isContentImage } from "@/lib/diagram";
import { cn } from "@/lib/utils";
import type { Node } from "@/types";
import { Link2, Link2Off, Unlink2 } from "lucide-react";
import * as React from "react";
import type { NodeProps } from "reaflow";

interface CustomNodeProps extends NodeProps {
  node: Node;
  x: number;
  y: number;
  collapsible?: boolean;
}

function TextNodeImpl({ node, x, y, collapsible = false }: CustomNodeProps) {
  const { onBranchToggle } = useBranch();
  const { collapsedParents, collapseNodes, expandNodes } = useDiagram();

  const isCollapsed = React.useMemo(() => {
    return collapsedParents.includes(node.id);
  }, [collapsedParents, node.id]);

  const isImage = React.useMemo(() => {
    return typeof node.text === "string" && isContentImage(node.text);
  }, [node.text]);

  const value = React.useMemo(() => {
    if (typeof node.text === "string") {
      return node.text.replaceAll('"', "");
    }
    return node.text.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n");
  }, [node.text]);

  const childrenCountText = React.useMemo(() => {
    if (node.data.type === "object") return `{${node.data.childrenCount}}`;
    if (node.data.type === "array") return `[${node.data.childrenCount}]`;

    return "";
  }, [node.data.childrenCount, node.data.type]);

  const onCollapseToggle = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (isCollapsed) {
        expandNodes(node.id);
      } else {
        collapseNodes(node.id);
      }

      onBranchToggle();
    },
    [collapseNodes, expandNodes, node.id, isCollapsed, onBranchToggle],
  );

  return (
    <foreignObject
      className={cn(
        "pointer-events-none overflow-hidden font-medium font-mono text-[11px]",
        "searched:rounded searched:border-2 searched:border-green-500 searched:bg-green-500/10",
        "[&_.highlight]:bg-yellow-500/15",
      )}
      style={{ width: node.width, height: node.height }}
    >
      {isImage ? (
        <div className="p-1">
          <img
            src={node.text as string}
            alt=""
            width={70}
            height={70}
            loading="lazy"
            className="rounded bg-muted object-contain"
          />
        </div>
      ) : (
        <div
          data-x={x}
          data-y={y}
          data-key={JSON.stringify(node.text)}
          className={cn(
            "flex size-full items-center overflow-hidden",
            node.data.isParent && collapsible
              ? "justify-between"
              : node.data.isParent
                ? "justify-center"
                : "justify-start",
            !collapsible && "px-2.5",
          )}
        >
          <div
            className={cn(
              "truncate",
              collapsible && "px-2.5",
              node.data.type === "property" &&
                "font-semibold text-blue-600 dark:text-blue-400",
              node.data.type === "array" &&
                "font-semibold text-orange-600 dark:text-orange-400",
              node.data.type === "object" &&
                "font-semibold text-green-600 dark:text-green-400",
            )}
          >
            <NodeContent>{value}</NodeContent>
          </div>
          {node.data.isParent && node.data.childrenCount > 0 && (
            <span className="text-muted-foreground text-xs">
              {childrenCountText}
            </span>
          )}
          {node.data.isParent && collapsible && (
            <Button
              aria-label={isCollapsed ? "Expand" : "Collapse"}
              variant="ghost"
              size="icon"
              className="pointer-events-auto cursor-pointer rounded-none border-l text-muted-foreground"
              onClick={onCollapseToggle}
            >
              {isCollapsed ? <Link2Off /> : <Link2 />}
            </Button>
          )}
        </div>
      )}
    </foreignObject>
  );
}

export const TextNode = React.memo(
  TextNodeImpl,
  (prev: CustomNodeProps, next: CustomNodeProps) =>
    prev.node.text === next.node.text &&
    prev.node.width === next.node.width &&
    prev.node.data.childrenCount === next.node.data.childrenCount,
);
