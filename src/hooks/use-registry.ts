"use client";

import { diagramActions, useDiagram } from "@/hooks/use-diagram";
import { debounce } from "@/lib/utils";
import {
  type RegistryItem,
  registryItemSchema,
} from "@/lib/validations/registry";
import * as React from "react";

const REGISTRY_URL_KEY = "registryUrl";
const REGISTRY_DATA_KEY = "registryData";
const REGISTRY_JSON_KEY = "registryJson";
const REGISTRY_MERMAID_KEY = "registryMermaid";

interface RegistryState {
  registryUrl: string | null;
  registryData: RegistryItem | null;
  registryJson: string | undefined;
  registryMermaid: string | undefined;
  isPending: boolean;
}

function createRegistryStore() {
  function getInitialState(): RegistryState {
    if (typeof window === "undefined") {
      return {
        registryUrl: null,
        registryData: null,
        registryJson: undefined,
        registryMermaid: undefined,
        isPending: false,
      };
    }

    function getStoredItem<T>(key: string, defaultValue: T): T {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch {
        return defaultValue;
      }
    }

    return {
      registryUrl: getStoredItem<string | null>(REGISTRY_URL_KEY, null),
      registryData: getStoredItem<RegistryItem | null>(REGISTRY_DATA_KEY, null),
      registryJson: getStoredItem<string | undefined>(
        REGISTRY_JSON_KEY,
        undefined,
      ),
      registryMermaid: getStoredItem<string | undefined>(
        REGISTRY_MERMAID_KEY,
        undefined,
      ),
      isPending: false,
    };
  }

  let state = getInitialState();
  const listeners = new Set<() => void>();

  function updateStorage(key: string, value: unknown) {
    if (typeof window === "undefined") return;

    try {
      const valueToStore = JSON.stringify(value);
      setTimeout(() => {
        localStorage.setItem(key, valueToStore);
      }, 0);
    } catch (error) {
      console.error(`Failed to store ${key} in localStorage:`, error);
    }
  }

  function setState(partial: Partial<RegistryState>) {
    const newState = { ...state, ...partial };

    const hasChanged = Object.keys(partial).some(
      (key) =>
        partial[key as keyof RegistryState] !==
        state[key as keyof RegistryState],
    );

    if (!hasChanged) return;

    state = newState;

    if (partial.registryUrl !== undefined) {
      updateStorage(REGISTRY_URL_KEY, state.registryUrl);
    }
    if (partial.registryData !== undefined) {
      updateStorage(REGISTRY_DATA_KEY, state.registryData);
    }
    if (partial.registryJson !== undefined) {
      updateStorage(REGISTRY_JSON_KEY, state.registryJson);
    }
    if (partial.registryMermaid !== undefined) {
      updateStorage(REGISTRY_MERMAID_KEY, state.registryMermaid);
    }

    for (const listener of listeners) {
      listener();
    }
  }

  async function getRegistryData(url: string | null) {
    if (!url) {
      setState({
        registryData: null,
        registryJson: undefined,
        registryMermaid: undefined,
        isPending: false,
      });
      return;
    }

    setState({ isPending: true });

    try {
      const response = await fetch("/api/registry", {
        method: "POST",
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch registry data: HTTP ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const registryData = registryItemSchema.parse(data);
      const registryJson = JSON.stringify(registryData, null, 2);

      const mermaidResponse = await fetch("/api/generate", {
        method: "POST",
        body: JSON.stringify({ url }),
      });

      const registryMermaid = await mermaidResponse.text();

      setState({
        registryData,
        registryJson,
        registryMermaid,
        isPending: false,
      });
    } catch (error) {
      console.error("Error fetching or parsing registry data:", error);
      setState({
        registryData: null,
        registryJson: undefined,
        registryMermaid: undefined,
        isPending: false,
      });
    }
  }

  return {
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => state,
    getRegistryUrl: () => state.registryUrl,
    getRegistryData: () => state.registryData,
    getRegistryJson: () => state.registryJson,
    getRegistryMermaid: () => state.registryMermaid,
    getIsPending: () => state.isPending,
    onRegistryUrlChange: (url: string | null) => {
      setState({ registryUrl: url });
      getRegistryData(url);
    },
    onRegistryJsonChange: (json: string | undefined) => {
      setState({ registryJson: json });
    },
    onRegistryMermaidChange: (mermaid: string | undefined) => {
      setState({ registryMermaid: mermaid });
    },
  };
}

const registryStore = createRegistryStore();

const debouncedDiagramUpdate = debounce(function updateDiagram(json: unknown) {
  if (typeof json !== "string" && json !== undefined) {
    return;
  }
  if (!json) {
    diagramActions.clearDiagram();
    return;
  }
  diagramActions.setDiagram(json);
}, 300);

export function useRegistry() {
  const getSnapshot = React.useCallback(() => registryStore.getSnapshot(), []);

  const serverSnapshot = React.useMemo<RegistryState>(
    () => ({
      registryUrl: null,
      registryData: null,
      registryJson: undefined,
      registryMermaid: undefined,
      isPending: false,
    }),
    [],
  );

  const state = React.useSyncExternalStore(
    registryStore.subscribe,
    getSnapshot,
    () => serverSnapshot,
  );

  React.useEffect(() => {
    debouncedDiagramUpdate(state.registryJson);

    return () => {
      diagramActions.clearDiagram();
    };
  }, [state.registryJson]);

  return {
    registryUrl: state.registryUrl,
    onRegistryUrlChange: registryStore.onRegistryUrlChange,
    registryData: state.registryData,
    registryJson: state.registryJson,
    onRegistryJsonChange: registryStore.onRegistryJsonChange,
    registryMermaid: state.registryMermaid,
    onRegistryMermaidChange: registryStore.onRegistryMermaidChange,
    isPending: state.isPending,
  };
}
