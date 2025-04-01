"use client";

import { useRegistry } from "@/app/(registry)/components/registry-provider";
import { Separator } from "@/components/ui/separator";
import MonacoEditor from "@monaco-editor/react";
import {
  Background,
  Controls,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import * as React from "react";
import "@xyflow/react/dist/style.css";
import type { RegistryItem } from "@/lib/validations/registry";

// Define the node data type
type NodeData = {
  label: string;
};

export function Editor() {
  const { registryUrl, registryData } = useRegistry();
  const [jsonValue, setJsonValue] = React.useState("");

  // Initialize with proper typing
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<NodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Initialize editor with registry data
  React.useEffect(() => {
    if (registryData) {
      setJsonValue(JSON.stringify(registryData, null, 2));
      generateDiagram(registryData);
    }
  }, [registryData]);

  // Handle JSON editor changes
  const handleEditorChange = (value: string | undefined) => {
    if (!value) return;
    setJsonValue(value);

    try {
      const parsedJson = JSON.parse(value);
      generateDiagram(parsedJson);
    } catch (error) {
      // Invalid JSON - don't update diagram
      console.error("Invalid JSON:", error);
    }
  };

  // Generate diagram nodes and edges from registry data
  const generateDiagram = React.useCallback(
    (data: Partial<RegistryItem> | unknown) => {
      if (!data) return;

      const newNodes: Node<NodeData>[] = [];
      const newEdges: Edge[] = [];

      // Root node
      newNodes.push({
        id: "root",
        type: "default",
        data: { label: "Registry" },
        position: { x: 250, y: 5 },
        style: { width: 150, backgroundColor: "var(--background)" },
      });

      if (data && typeof data === "object") {
        let rowIndex = 0;

        // Create nodes for files
        if ("files" in data && Array.isArray(data.files)) {
          const files = data.files as Array<{ path: string }>;
          files.forEach((file, index) => {
            const nodeId = `file-${index}`;
            newNodes.push({
              id: nodeId,
              type: "default",
              data: { label: file.path.split("/").pop() || file.path },
              position: {
                x: (index * 180) % 900,
                y: 100 + Math.floor((index * 180) / 900) * 100,
              },
              style: { width: 150 },
            });

            // Connect to root
            newEdges.push({
              id: `e-root-${nodeId}`,
              source: "root",
              target: nodeId,
              type: "default",
            });
          });
          rowIndex++;
        }

        // Create nodes for dependencies
        if ("dependencies" in data && Array.isArray(data.dependencies)) {
          const dependencies = data.dependencies as string[];
          dependencies.forEach((dep, index) => {
            const nodeId = `dep-${index}`;
            newNodes.push({
              id: nodeId,
              type: "default",
              data: { label: dep },
              position: {
                x: (index * 180) % 900,
                y: 200 + Math.floor((index * 180) / 900) * 100,
              },
              style: { width: 150 },
            });

            // Connect to root
            newEdges.push({
              id: `e-root-${nodeId}`,
              source: "root",
              target: nodeId,
              type: "default",
            });
          });
          rowIndex++;
        }

        // Create nodes for registryDependencies
        if (
          "registryDependencies" in data &&
          Array.isArray(data.registryDependencies)
        ) {
          const regDeps = data.registryDependencies as string[];
          regDeps.forEach((dep, index) => {
            const nodeId = `regdep-${index}`;
            newNodes.push({
              id: nodeId,
              type: "default",
              data: { label: dep },
              position: {
                x: (index * 180) % 900,
                y: 300 + Math.floor((index * 180) / 900) * 100,
              },
              style: { width: 150 },
            });

            // Connect to root
            newEdges.push({
              id: `e-root-${nodeId}`,
              source: "root",
              target: nodeId,
              type: "default",
            });
          });
        }
      }

      setNodes(newNodes);
      setEdges(newEdges);
    },
    [setNodes, setEdges],
  );

  if (!registryUrl) {
    return <div>No registry URL found</div>;
  }

  console.log({ jsonValue, nodes, edges });

  return (
    <div className="flex h-[calc(100vh-100px)] w-full gap-4">
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border p-4">
        <h2 className="mb-4 font-medium text-lg">Registry JSON Editor</h2>
        <div className="flex-1 overflow-hidden">
          <MonacoEditor
            height="100%"
            defaultLanguage="json"
            value={jsonValue}
            onChange={handleEditorChange}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              formatOnPaste: true,
              automaticLayout: true,
            }}
          />
        </div>
      </div>
      <Separator orientation="vertical" />
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border p-4">
        <h2 className="mb-4 font-medium text-lg">Registry Diagram</h2>
        <div className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
