import { TextRenderer } from "@/components/text-renderer";
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
  const {
    id,
    text,
    width,
    height,
    data: { isParent, childrenCount, type },
  } = node;
  const { onBranchToggle } = useBranch();
  const { collapsedParents, collapseNodes, expandNodes } = useDiagram();

  const isCollapsed = React.useMemo(() => {
    return collapsedParents.includes(id);
  }, [collapsedParents, id]);

  const isImage = React.useMemo(() => {
    return typeof text === "string" && isContentImage(text);
  }, [text]);

  const value = React.useMemo(() => {
    if (typeof text === "string") {
      return text.replaceAll('"', "");
    }
    return text.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n");
  }, [text]);

  const childrenCountText = React.useMemo(() => {
    if (type === "object") return `{${childrenCount}}`;
    if (type === "array") return `[${childrenCount}]`;

    return "";
  }, [childrenCount, type]);

  const onCollapseToggle = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();

      if (isCollapsed) {
        expandNodes(id);
      } else {
        collapseNodes(id);
      }

      onBranchToggle();
    },
    [collapseNodes, expandNodes, id, isCollapsed, onBranchToggle],
  );

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
            "flex size-full items-center overflow-hidden",
            isParent && collapsible
              ? "justify-between"
              : isParent
                ? "justify-center"
                : "justify-start",
            !collapsible && "px-2.5",
          )}
        >
          <div
            className={cn(
              "truncate font-mono text-sm",
              type === "property" &&
                "font-semibold text-blue-600 dark:text-blue-400",
              type === "array" &&
                "font-semibold text-orange-600 dark:text-orange-400",
              type === "object" &&
                "font-semibold text-green-600 dark:text-green-400",
            )}
          >
            <TextRenderer>{value}</TextRenderer>
          </div>
          {isParent && childrenCount > 0 && (
            <span className="text-muted-foreground text-xs">
              {childrenCountText}
            </span>
          )}
          {isParent && collapsible && (
            <Button
              aria-label="Toggle collapse"
              variant="ghost"
              size="icon"
              className="cursor-pointer rounded-none border-l"
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
