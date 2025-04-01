"use client";

import React, { useEffect, useState } from "react";
import { Canvas, Edge, type EdgeProps, Node, type NodeProps } from "reaflow";

type NodeData = {
  id: string;
  text: string;
  width: number;
  height: number;
  data: {
    type: string;
    isParent: boolean;
    childrenCount: number;
  };
};

type EdgeData = {
  id: string;
  from: string;
  to: string;
};

type DiagramProps = {
  jsonData?: string;
};

export function Diagram({ jsonData }: DiagramProps) {
  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [edges, setEdges] = useState<EdgeData[]>([]);

  useEffect(() => {
    if (!jsonData) return;

    try {
      const parsed = JSON.parse(jsonData);
      const { nodes, edges } = parseJsonToGraph(parsed);
      setNodes(nodes);
      setEdges(edges);
    } catch (error) {
      console.error("Error parsing JSON:", error);
    }
  }, [jsonData]);

  return (
    <div className="relative h-full w-full bg-gray-50">
      <div className="h-full w-full">
        {nodes.length > 0 ? (
          <Canvas
            nodes={nodes}
            edges={edges}
            maxZoom={2}
            minZoom={0.3}
            zoomable
            pannable
            animated
            readonly
            direction="RIGHT"
            className="h-full w-full"
            fit
            node={(props: NodeProps) => (
              <Node
                {...props}
                style={{
                  fill:
                    props.properties.data.type === "key"
                      ? "#EBF5FF" // Light blue for keys
                      : props.properties.data.type === "array"
                        ? "#FFF5EB" // Light orange for arrays
                        : props.properties.data.type === "object"
                          ? "#F0FFF4" // Light green for objects
                          : "#FFFFFF", // White for primitive values
                  stroke:
                    props.properties.data.type === "key"
                      ? "#3B82F6" // Blue for keys
                      : props.properties.data.type === "array"
                        ? "#F97316" // Orange for arrays
                        : props.properties.data.type === "object"
                          ? "#10B981" // Green for objects
                          : "#9CA3AF", // Gray for primitive values
                  strokeWidth: 1.5,
                }}
                label={
                  <div
                    className={`
                      font-mono text-xs
                      ${
                        props.properties.data.type === "key"
                          ? "font-semibold text-blue-600"
                          : ""
                      }
                      ${
                        props.properties.data.type === "array"
                          ? "font-semibold text-orange-600"
                          : ""
                      }
                      ${
                        props.properties.data.type === "object"
                          ? "font-semibold text-green-600"
                          : ""
                      }
                    `}
                  >
                    {props.properties.text}
                  </div>
                }
              />
            )}
            edge={(props: EdgeProps) => (
              <Edge
                {...props}
                style={{
                  stroke: "#CBD5E1",
                  strokeWidth: 1.5,
                }}
              />
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-500">
            {jsonData ? "Processing data..." : "No data to visualize"}
          </div>
        )}
      </div>
    </div>
  );
}

// Function to parse JSON into graph nodes and edges
function parseJsonToGraph(json: unknown): {
  nodes: NodeData[];
  edges: EdgeData[];
} {
  const nodes: NodeData[] = [];
  const edges: EdgeData[] = [];
  let nodeId = 1;

  function traverse(obj: unknown, parentId?: string) {
    const currentId = String(nodeId++);

    // Create node for current object/value
    const isObject = obj !== null && typeof obj === "object";
    const isArray = Array.isArray(obj);
    const type = isArray ? "array" : isObject ? "object" : typeof obj;

    let text: string;
    if (isObject) {
      text = isArray ? "[]" : "{}";
    } else {
      text = String(obj);
    }

    nodes.push({
      id: currentId,
      text,
      width: Math.max(text.length * 8, 80),
      height: 40,
      data: {
        type,
        isParent: isObject,
        childrenCount: isObject ? Object.keys(obj).length : 0,
      },
    });

    // Connect to parent if exists
    if (parentId) {
      edges.push({
        id: `e${parentId}-${currentId}`,
        from: parentId,
        to: currentId,
      });
    }

    // Traverse children for objects and arrays
    if (isObject) {
      for (const key in obj as Record<string, unknown>) {
        const value = (obj as Record<string, unknown>)[key];
        const childId = String(nodeId++);

        // Create node for the key (for objects)
        nodes.push({
          id: childId,
          text: key,
          width: Math.max(key.length * 8, 60),
          height: 30,
          data: {
            type: "key",
            isParent: false,
            childrenCount: 0,
          },
        });

        // Connect current object to key
        edges.push({
          id: `e${currentId}-${childId}`,
          from: currentId,
          to: childId,
        });

        // Recursively traverse the value
        traverse(value, childId);
      }
    }
  }

  traverse(json);
  return { nodes, edges };
}
