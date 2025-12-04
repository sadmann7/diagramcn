import * as React from "react";
import { getPackageManagerCommands } from "@/lib/command";
import type { Node } from "@/types";

interface NodeState {
  nodeOpen: boolean;
  selectedNode: Node | null;
  name: string | null;
  description: string | null;
  childrenCount: number;
  jsonPath: string | null;
  path: string | null;
  content: string | null;
  type: string | null;
  target: string | null;
  packageManager: string;
}

const initialState: NodeState = {
  nodeOpen: false,
  selectedNode: null,
  name: null,
  description: null,
  childrenCount: 0,
  jsonPath: null,
  path: null,
  content: null,
  type: null,
  target: null,
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

  function updateNodeContent(node: Node | null, packageManager: string) {
    if (!node) return null;

    const { install, dlx } = getPackageManagerCommands(packageManager);

    if (node.path === "{Root}" && Array.isArray(node.text)) {
      const nameEntry = node.text.find(([key]) => key === "name");
      return nameEntry ? `${dlx} shadcn@latest add "${nameEntry[1]}"` : null;
    }

    if (node.path?.includes("{Root}.registryDependencies")) {
      const componentName = typeof node.text === "string" ? node.text : null;
      return componentName ? `${dlx} shadcn@latest add ${componentName}` : null;
    }

    if (node.path?.includes("{Root}.dependencies")) {
      const packageName = typeof node.text === "string" ? node.text : null;
      return packageName ? `${install} ${packageName}` : null;
    }

    if (Array.isArray(node.text)) {
      return JSON.stringify(node.text, null, 2);
    }

    if (typeof node.text === "string") {
      return node.text;
    }

    return null;
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
      setState({ nodeOpen: open });
    },
    onSelectedNodeChange: (node: Node) => {
      const newState: Partial<NodeState> = { selectedNode: node };

      if (!node) {
        setState(newState);
        return;
      }

      newState.name = null;
      newState.description = null;
      newState.jsonPath = null;
      newState.childrenCount = 0;
      newState.path = null;
      newState.content = null;
      newState.type = null;
      newState.target = "";

      if (node.path === "{Root}" && Array.isArray(node.text)) {
        const nameEntry = node.text.find(([key]) => key === "name");
        const typeEntry = node.text.find(([key]) => key === "type");
        const descriptionEntry = node.text.find(
          ([key]) => key === "description",
        );

        newState.content = updateNodeContent(node, state.packageManager);
        newState.jsonPath = node.path ?? null;
        newState.name = nameEntry ? nameEntry[1] : null;
        newState.type = typeEntry ? typeEntry[1] : null;
        newState.description = descriptionEntry ? descriptionEntry[1] : null;
      } else if (node.data.isParent) {
        newState.content = JSON.stringify(node.text, null, 2);
        newState.jsonPath = node.path ?? null;
        newState.childrenCount = node.data.childrenCount ?? 0;
      } else if (
        node.path?.includes("{Root}.registryDependencies") ||
        node.path?.includes("{Root}.dependencies")
      ) {
        newState.content = updateNodeContent(node, state.packageManager);
      } else if (node.path?.includes("{Root}.files")) {
        if (Array.isArray(node.text)) {
          const [path, content, type, target] = node.text;
          newState.path = path ? String(path).replace(/^path,\s*/, "") : null;
          newState.content = content
            ? String(content).replace(/^content,\s*/, "")
            : null;
          newState.type = type ? String(type).replace(/^type,\s*/, "") : null;
          newState.target = target
            ? String(target).replace(/^target,\s*/, "")
            : null;
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
    onPackageManagerChange: (packageManager: string) => {
      setState({ packageManager });

      const currentNode = state.selectedNode;
      if (currentNode) {
        const newContent = updateNodeContent(currentNode, packageManager);
        if (newContent !== null) {
          setState({ content: newContent });
        }
      }
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
    onPackageManagerChange: nodeStore.onPackageManagerChange,
  };
}
