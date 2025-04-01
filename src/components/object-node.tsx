import { TextRenderer } from "@/components/text-renderer";
import { NODE_DIMENSIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Node } from "@/types";
import React from "react";

export interface CustomNodeProps {
  node: Node;
  x: number;
  y: number;
  hasCollapse?: boolean;
}

type Value = [string, string];

type RowProps = {
  val: Value;
  x: number;
  y: number;
  index: number;
};

const getTextColor = (value?: string) => {
  // per value
  if (value && !Number.isNaN(+value)) return "text-blue-600 dark:text-blue-400";
  if (value === "true") return "text-green-600 dark:text-green-400";
  if (value === "false") return "text-red-600 dark:text-red-400";
  if (value === "null") return "text-gray-500 dark:text-gray-400";
  // default
  return "text-gray-900 dark:text-gray-100";
};

const Row = ({ val, x, y, index }: RowProps) => {
  const key = JSON.stringify(val);
  const rowKey = JSON.stringify(val[0]).replaceAll('"', "");
  const rowValue = JSON.stringify(val[1]);
  const rowPosition = index * NODE_DIMENSIONS.ROW_HEIGHT;

  return (
    <div
      data-key={key}
      data-x={x}
      data-y={y + rowPosition}
      className={cn(
        "block h-[24px] overflow-hidden text-ellipsis whitespace-nowrap px-2.5 py-0.5",
        "border-border border-b last:border-b-0",
        "leading-[18px]",
        getTextColor(rowValue),
      )}
    >
      <span className="font-medium font-mono text-blue-600 text-sm dark:text-blue-400">
        {rowKey}:{" "}
      </span>
      <TextRenderer>{rowValue}</TextRenderer>
    </div>
  );
};

const ObjectNodeImpl = ({ node, x, y }: CustomNodeProps) => (
  <div
    className={cn(
      "pointer-events-none overflow-hidden font-medium font-mono text-xs",
      "searched:rounded searched:border-2 searched:border-green-500 searched:bg-green-500/10",
      "[&_.highlight]:bg-yellow-500/15",
    )}
    style={{
      width: node.width,
      height: node.height,
    }}
  >
    {(node.text as Value[]).map((val, idx) => (
      <Row val={val} index={idx} x={x} y={y} key={idx} />
    ))}
  </div>
);

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return (
    String(prev.node.text) === String(next.node.text) &&
    prev.node.width === next.node.width
  );
}

export const ObjectNode = React.memo(ObjectNodeImpl, propsAreEqual);
