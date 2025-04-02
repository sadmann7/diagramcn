"use client";

import { ObjectNode } from "@/components/object-node";
import { TextNode } from "@/components/text-node";
import { useDiagram } from "@/hooks/use-diagram";
import { useDialog } from "@/hooks/use-dialog";
import type { Node as NodeType } from "@/types";
import type { NodeType as JsonNodeType } from "jsonc-parser";
import * as React from "react";
import type { NodeData, NodeProps } from "reaflow";
import { Node as ReaflowNode } from "reaflow";

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
  const { setSelectedNode } = useDiagram();
  const { onOpenChange } = useDialog();

  const onClick = React.useCallback(
    (
      _event: React.MouseEvent<SVGGElement, MouseEvent>,
      data: ExtendedNodeData,
    ) => {
      setSelectedNode(data as unknown as NodeType);
      onOpenChange("node", true);
    },
    [setSelectedNode, onOpenChange],
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
      {({ node, x, y }) => {
        if (Array.isArray(props.properties.text)) {
          if (data?.isEmpty) return null;

          return <ObjectNode node={node as unknown as NodeType} x={x} y={y} />;
        }

        return (
          <TextNode
            {...props}
            node={node as unknown as NodeType}
            collapsible={!!data?.childrenCount}
            x={x}
            y={y}
          />
        );
      }}
    </ReaflowNode>
  );
}

export const Node = React.memo(NodeImpl);
