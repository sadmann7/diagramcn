import { NodeContent } from "@/app/(registry)/registry/components/node-content";
import { NODE_DIMENSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Node } from "@/types";
import * as React from "react";

const getTextColor = (value?: string) => {
  if (value && !Number.isNaN(+value)) return "text-blue-600 dark:text-blue-400";
  if (value === "true") return "text-green-600 dark:text-green-400";
  if (value === "false") return "text-red-600 dark:text-red-400";
  if (value === "null") return "text-gray-500 dark:text-gray-400";
  return "text-gray-900 dark:text-gray-100";
};

type Value = [string, string];

interface NodeRowProps {
  val: Value;
  x: number;
  y: number;
  index: number;
}

function NodeRow({ val, x, y, index }: NodeRowProps) {
  const key = JSON.stringify(val);
  const rowKey = JSON.stringify(val[0]).replaceAll('"', "");
  const rowValue = JSON.stringify(val[1]);
  const rowPosition = index * NODE_DIMENSIONS.ROW_HEIGHT;

  return (
    <span
      data-key={key}
      data-x={x}
      data-y={y + rowPosition}
      className={cn(
        "block h-[24px] truncate border-border border-b px-2.5 py-0.5 leading-[18px] last:border-b-0",
        getTextColor(rowValue),
      )}
    >
      <span className="font-medium font-mono text-blue-600 text-sm dark:text-blue-400">
        {rowKey}:{" "}
      </span>
      <NodeContent>{rowValue}</NodeContent>
    </span>
  );
}

interface ObjectNodeImplProps {
  node: Node;
  x: number;
  y: number;
}

function ObjectNodeImpl({ node, x, y }: ObjectNodeImplProps) {
  return (
    <foreignObject
      className={cn(
        "pointer-events-none overflow-hidden font-medium font-mono text-[11px]",
        "searched:rounded searched:border-2 searched:border-green-500 searched:bg-green-500/10",
        "[&_.highlight]:bg-yellow-500/15",
      )}
      style={{
        width: node.width,
        height: node.height,
      }}
    >
      {(node.text as Value[]).map((val, i) => (
        <NodeRow key={i} val={val} index={i} x={x} y={y} />
      ))}
    </foreignObject>
  );
}

export const ObjectNode = React.memo(
  ObjectNodeImpl,
  (prev: ObjectNodeImplProps, next: ObjectNodeImplProps) =>
    String(prev.node.text) === String(next.node.text) &&
    prev.node.width === next.node.width,
);
