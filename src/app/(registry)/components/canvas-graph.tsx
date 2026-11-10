"use client";

import "@xyflow/react/dist/style.css";
import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
  type ReactFlowInstance,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";

import type { ConflictPair } from "@/lib/registry/conflicts";
import type { ResolvedGraph, ResolvedNode } from "@/lib/registry/resolve";

import { cn } from "@/lib/utils";

const NODE_WIDTH = 240;
const COLUMN_GAP = 120;
const ROW_HEIGHT = 110;
const MAX_ROWS = 6;
const fitViewOptions = { padding: 0.15, maxZoom: 1 };

// One accent per registry, so items from the same one read as a group.
const registryColors = [
  "bg-sky-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-500",
];

export function getRegistryColor(namespace: string | null) {
  if (!namespace || namespace === "@shadcn") return "bg-foreground";
  let hash = 0;
  for (const char of namespace) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return registryColors[Math.abs(hash) % registryColors.length];
}

export function getNodeLabel(node: ResolvedNode) {
  return node.item?.name ?? node.specifier.split("/").pop() ?? node.specifier;
}

interface ItemNodeData extends Record<string, unknown> {
  node: ResolvedNode;
  isRoot: boolean;
  conflictCount: number;
  isDimmed: boolean;
}

type ItemNodeType = Node<ItemNodeData, "item">;

function ItemNode({ data, selected }: NodeProps<ItemNodeType>) {
  const { node, isRoot, conflictCount, isDimmed } = data;
  const fileCount = node.item?.files?.length ?? 0;

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-md border bg-card text-card-foreground shadow-xs transition-opacity",
        !isRoot && "border-dashed",
        selected && "ring-2 ring-ring",
        node.error && "border-destructive",
        isDimmed && "opacity-30",
      )}
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
      <Handle type="target" position={Position.Top} id="conflict-in" />
      <Handle type="source" position={Position.Bottom} id="conflict-out" />
      <div
        aria-hidden="true"
        className={cn("w-1 shrink-0", getRegistryColor(node.namespace))}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-3 py-2">
        <span className="truncate text-xs text-muted-foreground">
          {node.namespace ?? "URL"}
          {isRoot ? "" : " · pulled in"}
        </span>
        <span className="truncate font-mono text-sm font-medium">
          {getNodeLabel(node)}
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {node.item ? (
            <span className="truncate">
              {node.item.type.replace("registry:", "")} · {fileCount}{" "}
              {fileCount === 1 ? "file" : "files"}
            </span>
          ) : (
            <span className="truncate text-destructive">
              {node.error ?? "Couldn't resolve"}
            </span>
          )}
          {conflictCount > 0 ? (
            <span className="ml-auto flex shrink-0 items-center gap-1 text-destructive">
              <TriangleAlert className="size-3" />
              {conflictCount}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}

const nodeTypes = { item: ItemNode };

/**
 * Columns by depth: what you picked on the left, what it pulls in to the
 * right. Deep levels wrap into several columns so the canvas stays wide
 * rather than tall. Nodes stay draggable; the layout resets when the
 * items change.
 */
function getLayout(
  graph: ResolvedGraph,
  conflictCounts: Map<string, number>,
): ItemNodeType[] {
  const levels = new Map<number, ResolvedNode[]>();
  for (const node of graph.nodes) {
    levels.set(node.depth, [...(levels.get(node.depth) ?? []), node]);
  }

  const columns = [...levels.entries()]
    .sort(([a], [b]) => a - b)
    .flatMap(([, nodes]) =>
      Array.from({ length: Math.ceil(nodes.length / MAX_ROWS) }, (_, index) =>
        nodes.slice(index * MAX_ROWS, (index + 1) * MAX_ROWS),
      ),
    );
  const tallest = Math.max(0, ...columns.map((column) => column.length));
  const roots = new Set(graph.roots);

  return columns.flatMap((nodes, column) => {
    const offset = ((tallest - nodes.length) * ROW_HEIGHT) / 2;
    return nodes.map((node, index) => ({
      id: node.id,
      type: "item" as const,
      position: {
        x: column * (NODE_WIDTH + COLUMN_GAP),
        y: offset + index * ROW_HEIGHT,
      },
      data: {
        node,
        isRoot: roots.has(node.id),
        conflictCount: conflictCounts.get(node.id) ?? 0,
        isDimmed: false,
      },
    }));
  });
}

function getEdges(
  graph: ResolvedGraph,
  pairs: ConflictPair[],
  positions: Map<string, { x: number; y: number }>,
  highlight: Set<string> | null,
): Edge[] {
  const dependencyEdges: Edge[] = graph.edges.map((edge) => ({
    id: `dep:${edge.from}->${edge.to}`,
    source: edge.from,
    target: edge.to,
    sourceHandle: "out",
    targetHandle: "in",
    markerEnd: { type: MarkerType.ArrowClosed },
    className: cn(
      "[&_path]:stroke-muted-foreground/60",
      highlight && "opacity-20",
    ),
  }));

  const conflictEdges: Edge[] = pairs.map((pair) => {
    // Draw from the upper node down, so stacked nodes get a short edge.
    const [source, target] =
      (positions.get(pair.source)?.y ?? 0) <=
      (positions.get(pair.target)?.y ?? 0)
        ? [pair.source, pair.target]
        : [pair.target, pair.source];
    const count = pair.conflicts.length;
    const isHighlighted =
      !highlight || (highlight.has(source) && highlight.has(target));

    return {
      id: `conflict:${source}<->${target}`,
      source,
      target,
      sourceHandle: "conflict-out",
      targetHandle: "conflict-in",
      label: `${count} ${count === 1 ? "conflict" : "conflicts"}`,
      className: cn(
        "[&_path]:stroke-destructive! [&_path]:[stroke-dasharray:6_4]",
        !isHighlighted && "opacity-20",
      ),
      labelStyle: { fill: "var(--destructive)", fontSize: 11 },
      labelBgStyle: { fill: "var(--background)" },
    };
  });

  return [...dependencyEdges, ...conflictEdges];
}

interface CanvasGraphProps {
  graph: ResolvedGraph;
  conflictPairs: ConflictPair[];
  selectedId: string | null;
  /** Node ids to emphasize; everything else is dimmed. */
  highlight: string[] | null;
  onSelect: (id: string | null) => void;
}

export function CanvasGraph({
  graph,
  conflictPairs,
  selectedId,
  highlight,
  onSelect,
}: CanvasGraphProps) {
  const { resolvedTheme } = useTheme();
  const highlightSet = React.useMemo(
    () => (highlight ? new Set(highlight) : null),
    [highlight],
  );

  const conflictCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const pair of conflictPairs) {
      for (const id of [pair.source, pair.target]) {
        counts.set(id, (counts.get(id) ?? 0) + pair.conflicts.length);
      }
    }
    return counts;
  }, [conflictPairs]);

  const [nodes, setNodes, onNodesChange] = useNodesState<ItemNodeType>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  // Lay out again only when the graph itself changes, so dragged nodes stay put.
  React.useEffect(() => {
    setNodes(getLayout(graph, conflictCounts));
  }, [graph, conflictCounts, setNodes]);

  React.useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        selected: node.id === selectedId,
        data: {
          ...node.data,
          isDimmed: !!highlightSet && !highlightSet.has(node.id),
        },
      })),
    );
  }, [highlightSet, selectedId, setNodes]);

  React.useEffect(() => {
    const positions = new Map(
      getLayout(graph, conflictCounts).map((node) => [node.id, node.position]),
    );
    setEdges(getEdges(graph, conflictPairs, positions, highlightSet));
  }, [graph, conflictCounts, conflictPairs, highlightSet, setEdges]);

  // Fit again whenever the panel changes size, e.g. when sidebars stack.
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [instance, setInstance] =
    React.useState<ReactFlowInstance<ItemNodeType> | null>(null);
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container || !instance) return;
    const observer = new ResizeObserver(() => {
      void instance.fitView(fitViewOptions);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [instance]);

  return (
    <div ref={containerRef} className="size-full">
      <ReactFlow
        onInit={setInstance}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={(_, node) => onSelect(node.id)}
        onPaneClick={() => onSelect(null)}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        nodesConnectable={false}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.2}
      >
        <Background gap={20} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="hidden md:block" />
      </ReactFlow>
    </div>
  );
}
