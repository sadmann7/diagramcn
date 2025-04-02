import * as React from "react";

interface DialogState {
  open: boolean;
  variant: "node" | "edge";
}

const initialState: DialogState = {
  open: false,
  variant: "node",
};

function createDialogStore(initialState: DialogState) {
  let state = initialState;
  const listeners = new Set<() => void>();

  function setState(partial: Partial<DialogState>) {
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
    onOpenChange: (variant: DialogState["variant"], open: boolean) => {
      setState({ variant, open });
    },
  };
}

const dialogStore = createDialogStore(initialState);

export function useDialog() {
  const getSnapshot = React.useCallback(() => dialogStore.getState(), []);

  const state = React.useSyncExternalStore(
    dialogStore.subscribe,
    getSnapshot,
    getSnapshot,
  );

  return {
    ...state,
    onOpenChange: dialogStore.onOpenChange,
  };
}
