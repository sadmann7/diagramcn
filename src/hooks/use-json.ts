import { useDiagram } from "@/hooks/use-diagram";
import * as React from "react";

interface JsonState {
  json: string;
  loading: boolean;
}

const initialState: JsonState = {
  json: "",
  loading: true,
};

function createStore(initialState: JsonState) {
  let state = initialState;
  const listeners = new Set<() => void>();

  const setState = (partial: Partial<JsonState>) => {
    state = { ...state, ...partial };
    for (const listener of listeners) {
      listener();
    }
  };

  return {
    getState: () => state,
    setState,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getJson: () => state.json,
    setJson: (json: string) => {
      setState({ json, loading: false });
      useDiagram().setDiagram(json);
    },
    clear: () => {
      setState({ json: "", loading: false });
      useDiagram().clearDiagram();
    },
  };
}

const store = createStore(initialState);

export function useJson() {
  const state = React.useSyncExternalStore(store.subscribe, store.getState);

  return {
    ...state,
    getJson: store.getJson,
    setJson: store.setJson,
    clear: store.clear,
  };
}
