"use client";

import { useDiagram } from "@/hooks/use-diagram";
import { useDialog } from "@/hooks/use-dialog";
import type { Node as NodeType } from "@/types";
import * as React from "react";
import type { NodeData, NodeProps } from "reaflow";
import { Node as ReaflowNode } from "reaflow";

interface ExtendedNodeData extends NodeData {
  isEmpty?: boolean;
  childrenCount?: number;
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
      onClick={onClick}
      onEnter={onEnter}
      onLeave={onLeave}
      animated={false}
      style={{
        fill: "var(--card)",
        stroke: "var(--border)",
        strokeWidth: 1,
      }}
    />
  );
}

export const Node = React.memo(NodeImpl);
