import * as React from "react";

interface NodeState {
  isNodeOpen: boolean;
}

const initialState: NodeState = {
  isNodeOpen: false,
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
  };
}
