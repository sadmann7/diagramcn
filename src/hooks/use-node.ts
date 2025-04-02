import type { Node } from "@/types";
import * as React from "react";

interface NodeState {
  isNodeOpen: boolean;
  selectedNode: Node | null;
  name: string | null;
  description: string | null;
  childrenCount: number;
  jsonPath: string | null;
  path: string | null;
  content: string | null;
  type: string | null;
  target: string;
  packageManager: string;
}

const initialState: NodeState = {
  isNodeOpen: false,
  selectedNode: null,
  name: null,
  description: null,
  childrenCount: 0,
  jsonPath: null,
  path: null,
  content: null,
  type: null,
  target: "",
  packageManager: "pnpm",
};

function createNodeStore(initialState: NodeState) {
  let state = initialState;
  const listeners = new Set<() => void>();

  function setState(partial: Partial<NodeState>) {
    state = { ...state, ...partial };
    for (const listener of listeners) {
      listener();
    }
  }

  return {
    getState: () => state,
    setState,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    onNodeOpenChange: (open: boolean) => {
      setState({ isNodeOpen: open });
    },
    onSelectedNodeChange: (node: Node) => {
      const newState: Partial<NodeState> = { selectedNode: node };

      if (!node) {
        setState(newState);
        return;
      }

      // Reset all values first
      newState.name = null;
      newState.description = null;
      newState.jsonPath = null;
      newState.childrenCount = 0;
      newState.path = null;
      newState.content = null;
      newState.type = null;
      newState.target = "";

      if (node.path === "{Root}" && Array.isArray(node.text)) {
        const schemaEntry = node.text.find(([key]) => key === "$schema");
        const nameEntry = node.text.find(([key]) => key === "name");
        const typeEntry = node.text.find(([key]) => key === "type");
        const descriptionEntry = node.text.find(
          ([key]) => key === "description",
        );

        newState.content = schemaEntry
          ? `pnpm dlx shadcn@latest add "${schemaEntry[1]}"`
          : null;
        newState.jsonPath = node.path ?? null;
        newState.name = nameEntry ? nameEntry[1] : null;
        newState.type = typeEntry ? typeEntry[1] : null;
        newState.description = descriptionEntry ? descriptionEntry[1] : null;
      } else if (node.data.isParent) {
        newState.content = JSON.stringify(node.text, null, 2);
        newState.jsonPath = node.path ?? null;
        newState.childrenCount = node.data.childrenCount ?? 0;
      } else if (node.path?.includes("{Root}.registryDependencies")) {
        const componentName = typeof node.text === "string" ? node.text : null;
        newState.content = componentName
          ? `pnpm dlx shadcn@latest add ${componentName}`
          : null;
      } else if (node.path?.includes("{Root}.dependencies")) {
        const packageName = typeof node.text === "string" ? node.text : null;
        newState.content = packageName ? `pnpm add ${packageName}` : null;
      } else if (node.path?.includes("{Root}.files")) {
        if (Array.isArray(node.text) && node.text.length >= 4) {
          const [path, content, type, target] = node.text;
          newState.path = String(path).replace(/^path,\s*/, "");
          newState.content = String(content).replace(/^content,\s*/, "");
          newState.type = String(type).replace(/^type,\s*/, "");
          newState.target = String(target).replace(/^target,\s*/, "");
        }
      } else {
        newState.content = node.text
          ? JSON.stringify(node.text, null, 2)
          : null;
        newState.jsonPath = node.path ?? null;
        newState.childrenCount = node.data.childrenCount ?? 0;
      }

      setState(newState);
    },
    setPackageManager: (packageManager: string) => {
      setState({ packageManager });
    },
  };
}

const nodeStore = createNodeStore(initialState);

export function useNode() {
  const getSnapshot = React.useCallback(() => nodeStore.getState(), []);

  const state = React.useSyncExternalStore(
    nodeStore.subscribe,
    getSnapshot,
    getSnapshot,
  );

  return {
    ...state,
    onNodeOpenChange: nodeStore.onNodeOpenChange,
    onSelectedNodeChange: nodeStore.onSelectedNodeChange,
    setPackageManager: nodeStore.setPackageManager,
  };
}
