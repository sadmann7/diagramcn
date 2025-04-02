"use client";

import { useNode } from "@/hooks/use-node";
import type { Node as ExtendedNode } from "@/types";
import type { NodeType as JsonNodeType } from "jsonc-parser";
import * as React from "react";
import type { NodeData, NodeProps } from "reaflow";
import { Node as ReaflowNode } from "reaflow";
import { ObjectNode } from "./object-node";
import { TextNode } from "./text-node";

function getIsNode(value: unknown): value is ExtendedNode {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in value &&
    "text" in value &&
    "width" in value &&
    "height" in value &&
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "type" in value.data &&
    "isParent" in value.data &&
    "isEmpty" in value.data &&
    "childrenCount" in value.data
  );
}

interface NodeLabelProps {
  originalText: string;
}

function NodeLabel({ originalText }: NodeLabelProps) {
  return <span>{originalText}</span>;
}

interface ExtendedNodeData extends NodeData {
  isEmpty?: boolean;
  childrenCount?: number;
  type?: JsonNodeType;
  isParent?: boolean;
}

function NodeImpl(props: NodeProps<ExtendedNodeData>) {
  const data = props.properties.data;
  const { onNodeOpenChange, onSelectedNodeChange } = useNode();

  const onClick = React.useCallback(
    (
      _event: React.MouseEvent<SVGGElement, MouseEvent>,
      data: ExtendedNodeData,
    ) => {
      if (!getIsNode(data)) return;

      onSelectedNodeChange(data);
      onNodeOpenChange(true);
    },
    [onSelectedNodeChange, onNodeOpenChange],
  );

  const onEnter = React.useCallback(
    (event: React.MouseEvent<SVGGElement, MouseEvent>) => {
      event.currentTarget.style.stroke = "var(--ring)";
    },
    [],
  );

  const onLeave = React.useCallback(
    (event: React.MouseEvent<SVGGElement, MouseEvent>) => {
      event.currentTarget.style.stroke = "var(--border)";
    },
    [],
  );

  const onChildrenRender = React.useCallback(
    ({ node, x, y }: { node: NodeData; x: number; y: number }) => {
      if (!getIsNode(node)) return null;

      if (Array.isArray(props.properties.text)) {
        if (data?.isEmpty) return null;

        return <ObjectNode node={node} x={x} y={y} />;
      }

      return (
        <TextNode
          {...props}
          node={node}
          collapsible={!!data?.childrenCount}
          x={x}
          y={y}
        />
      );
    },
    [props.properties.text, data?.isEmpty, data?.childrenCount, props],
  );

  return (
    <ReaflowNode
      {...props}
      {...(data?.isEmpty && { rx: 50, ry: 50 })}
      label={<NodeLabel originalText={props.properties.text} />}
      onClick={onClick}
      onEnter={onEnter}
      onLeave={onLeave}
      animated={false}
      style={{
        fill: "var(--card)",
        stroke: "var(--border)",
        strokeWidth: 1,
      }}
    >
      {onChildrenRender}
    </ReaflowNode>
  );
}

export const Node = React.memo(NodeImpl);
