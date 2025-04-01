import type { Theme } from "@monaco-editor/react";
import { useTheme as useNextTheme } from "next-themes";
import * as React from "react";

interface EditorThemeState {
  editorTheme: Theme;
  resolvedTheme: string | undefined;
}

const initialThemeState: EditorThemeState = {
  editorTheme: "light",
  resolvedTheme: undefined,
};

function createEditorThemeStore(initialState: EditorThemeState) {
  let state = initialState;
  const themeChangeListeners = new Set<() => void>();

  const setThemeState = (partial: Partial<EditorThemeState>) => {
    state = { ...state, ...partial };
    for (const listener of themeChangeListeners) {
      listener();
    }
  };

  return {
    getThemeState: () => state,
    setThemeState,
    subscribeToThemeChanges: (listener: () => void) => {
      themeChangeListeners.add(listener);
      return () => themeChangeListeners.delete(listener);
    },
    onThemeChange: (theme: string | undefined) => {
      setThemeState({
        resolvedTheme: theme,
        editorTheme: theme === "dark" ? "vs-dark" : "light",
      });
    },
  };
}

const themeStore = createEditorThemeStore(initialThemeState);

export function useEditorTheme() {
  const getSnapshot = React.useCallback(() => themeStore.getThemeState(), []);

  const themeState = React.useSyncExternalStore(
    themeStore.subscribeToThemeChanges,
    getSnapshot,
    getSnapshot
  );
  const { resolvedTheme } = useNextTheme();

  React.useEffect(() => {
    if (resolvedTheme !== themeStore.getThemeState().resolvedTheme) {
      themeStore.onThemeChange(resolvedTheme);
    }
  }, [resolvedTheme]);

  return {
    ...themeState,
    onThemeChange: themeStore.onThemeChange,
  };
}
