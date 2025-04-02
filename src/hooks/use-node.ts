import { useDiagram } from "@/hooks/use-diagram";
import type { Node } from "@/types";
import * as React from "react";

interface NodeState {
  textContent: string;
  path: string;
  content: string;
  type: string;
  target: string;
  packageManager: string;
}

const initialState: NodeState = {
  textContent: "",
  path: "",
  content: "",
  type: "",
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

  const store = {
    getState: () => state,
    setState,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    setPackageManager: (packageManager: string) => {
      setState({ packageManager });
    },
    resetState: () => {
      setState({
        path: "",
        content: "",
        type: "",
        target: "",
      });
    },
    updateNodeContent: (selectedNode: Node | null, packageManager: string) => {
      if (!selectedNode) return;

      if (selectedNode.path === "{Root}" && Array.isArray(selectedNode.text)) {
        const schemaName = selectedNode.text.find(([key]) => key === "$schema");
        const schemaNameValue = schemaName ? schemaName[1] : "";
        setState({
          textContent: `${packageManager} dlx shadcn@latest add "${schemaNameValue}"`,
        });
        return;
      }

      if (selectedNode.data.isParent) {
        const info = {
          type: selectedNode.data.type,
          path: selectedNode.path,
          childrenCount: selectedNode.data.childrenCount,
        };
        setState({
          textContent: JSON.stringify(info, null, 2),
        });
        return;
      }

      if (selectedNode.path?.includes("{Root}.registryDependencies")) {
        const componentName =
          typeof selectedNode.text === "string" ? selectedNode.text : "";
        setState({
          textContent: `${packageManager} dlx shadcn@latest add ${componentName}`,
        });
        return;
      }

      if (selectedNode.path?.includes("{Root}.dependencies")) {
        const packageName =
          typeof selectedNode.text === "string" ? selectedNode.text : "";
        setState({
          textContent: `${packageManager} add ${packageName}`,
        });
        return;
      }

      if (selectedNode.path?.includes("{Root}.files")) {
        if (Array.isArray(selectedNode.text) && selectedNode.text.length >= 4) {
          const [path, content, type, target] = selectedNode.text;
          setState({
            path: String(path).replace(/^path,\s*/, ""),
            content: String(content).replace(/^content,\s*/, ""),
            type: String(type).replace(/^type,\s*/, ""),
            target: String(target).replace(/^target,\s*/, ""),
          });
          return;
        }
      }
    },
  };

  return store;
}

const nodeStore = createNodeStore(initialState);

export function useNode() {
  const getSnapshot = React.useCallback(() => nodeStore.getState(), []);
  const { selectedNode } = useDiagram();

  const state = React.useSyncExternalStore(
    nodeStore.subscribe,
    getSnapshot,
    getSnapshot,
  );

  React.useEffect(() => {
    nodeStore.updateNodeContent(selectedNode, state.packageManager);
  }, [selectedNode, state.packageManager]);

  return {
    ...state,
    setPackageManager: nodeStore.setPackageManager,
    resetState: nodeStore.resetState,
  };
}
