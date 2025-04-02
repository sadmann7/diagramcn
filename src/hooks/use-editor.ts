import * as React from "react";

interface EditorState {
  isEditorVisible: boolean;
}

const initialState: EditorState = {
  isEditorVisible: true,
};

function createEditorStore(initialState: EditorState) {
  let state = initialState;
  const listeners = new Set<() => void>();

  function setState(partial: Partial<EditorState>) {
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
    onEditorToggle: () => {
      setState({ isEditorVisible: !state.isEditorVisible });
    },
  };
}

const editorStore = createEditorStore(initialState);

export function useEditor() {
  const getSnapshot = React.useCallback(() => editorStore.getState(), []);

  const state = React.useSyncExternalStore(
    editorStore.subscribe,
    getSnapshot,
    getSnapshot
  );

  return {
    ...state,
    onEditorToggle: editorStore.onEditorToggle,
  };
}
