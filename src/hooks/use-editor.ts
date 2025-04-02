import * as React from "react";

const EDITOR_COOKIE_NAME = "editor_state";
const EDITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

interface EditorState {
  editorOpen: boolean;
}

function getInitialState(): EditorState {
  if (typeof document === "undefined") {
    return { editorOpen: true };
  }

  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${EDITOR_COOKIE_NAME}=`));

  const savedState = cookie ? cookie.split("=")[1] : null;
  return {
    editorOpen: savedState ? savedState === "true" : true,
  };
}

const initialState: EditorState = getInitialState();

function createEditorStore(initialState: EditorState) {
  let state = initialState;
  const listeners = new Set<() => void>();

  function setState(partial: Partial<EditorState>) {
    state = { ...state, ...partial };
    if (typeof document !== "undefined") {
      document.cookie = `${EDITOR_COOKIE_NAME}=${state.editorOpen}; path=/; max-age=${EDITOR_COOKIE_MAX_AGE}`;
    }
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
    onEditorOpenChange: () => {
      setState({ editorOpen: !state.editorOpen });
    },
  };
}

const editorStore = createEditorStore(initialState);

export function useEditor() {
  const getSnapshot = React.useCallback(() => editorStore.getState(), []);

  const state = React.useSyncExternalStore(
    editorStore.subscribe,
    getSnapshot,
    getSnapshot,
  );

  return {
    ...state,
    onEditorOpenChange: editorStore.onEditorOpenChange,
  };
}
