import { useDiagram } from "@/hooks/use-diagram";
import { isContentImage } from "@/lib/diagram";
import { cn } from "@/lib/utils";
import type { Node } from "@/types";
import React, { useMemo } from "react";
import type { NodeProps } from "reaflow";
import { TextRenderer } from "./text-renderer";

interface CustomNodeProps extends NodeProps {
  node: Node;
  x: number;
  y: number;
  hasCollapse?: boolean;
}

function TextNodeImpl({ node, x, y, hasCollapse = false }: CustomNodeProps) {
  const {
    id,
    text,
    width,
    height,
    data: { isParent, childrenCount, type },
  } = node;

  const isImage = useMemo(() => {
    return typeof text === "string" && isContentImage(text);
  }, [text]);

  const value = useMemo(() => {
    if (typeof text === "string") {
      return text.replaceAll('"', "");
    }
    return text.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n");
  }, [text]);

  const childrenCountText = useMemo(() => {
    if (type === "object") return `{${childrenCount}}`;
    if (type === "array") return `[${childrenCount}]`;
    return "";
  }, [childrenCount, type]);

  return (
    <foreignObject width={width} height={height} x={0} y={0}>
      {isImage ? (
        <div className="p-1">
          <img
            src={text as string}
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
          data-key={JSON.stringify(text)}
          className={cn(
            "flex h-full w-full items-center overflow-hidden",
            isParent && hasCollapse
              ? "justify-between"
              : isParent
              ? "justify-center"
              : "justify-start",
            !hasCollapse && "px-2.5"
          )}
        >
          <div
            className={cn(
              "overflow-hidden text-ellipsis whitespace-nowrap font-mono text-sm",
              type === "property" &&
                "font-semibold text-blue-600 dark:text-blue-400",
              type === "array" &&
                "font-semibold text-orange-600 dark:text-orange-400",
              type === "object" &&
                "font-semibold text-green-600 dark:text-green-400"
            )}
          >
            <TextRenderer>{value}</TextRenderer>
          </div>
          {isParent && childrenCount > 0 && (
            <span className="ml-2 text-muted-foreground text-xs">
              {childrenCountText}
            </span>
          )}
          {isParent && hasCollapse && (
            <button
              aria-label="Toggle collapse"
              onClick={(event) => {
                event.stopPropagation();
                //TODO: Handle collapse toggle
                useDiagram().collapseNodes(id);
              }}
              className={cn(
                "inline-flex h-full w-9 shrink-0 items-center justify-center border-border border-l",
                "bg-black/5 text-foreground hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
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
    prev.node.data.childrenCount === next.node.data.childrenCount
);
