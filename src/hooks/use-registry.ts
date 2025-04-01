"use client";

import {
  type RegistryItem,
  registryItemSchema,
} from "@/lib/validations/registry";
import * as React from "react";

const REGISTRY_URL_KEY = "registryUrl";
const REGISTRY_DATA_KEY = "registryData";
const REGISTRY_JSON_KEY = "registryJson";

interface RegistryState {
  registryUrl: string | null;
  registryData: RegistryItem | null;
  registryJson: string | undefined;
}

function createRegistryStore() {
  function getInitialState(): RegistryState {
    if (typeof window === "undefined") {
      return {
        registryUrl: null,
        registryData: null,
        registryJson: undefined,
      };
    }

    function getStoredItem<T>(key: string, defaultValue: T): T {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      try {
        return JSON.parse(item) as T;
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
    };
  }

  let state = getInitialState();
  const listeners = new Set<() => void>();

  const setState = (partial: Partial<RegistryState>) => {
    state = { ...state, ...partial };

    if (typeof window !== "undefined") {
      if (partial.registryUrl !== undefined) {
        localStorage.setItem("registryUrl", JSON.stringify(state.registryUrl));
      }
      if (partial.registryData !== undefined) {
        localStorage.setItem(
          "registryData",
          JSON.stringify(state.registryData),
        );
      }
      if (partial.registryJson !== undefined) {
        localStorage.setItem(
          "registryJson",
          JSON.stringify(state.registryJson),
        );
      }
    }

    for (const listener of listeners) {
      listener();
    }
  };

  async function fetchRegistryData(url: string | null) {
    if (!url) {
      setState({ registryData: null });
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      const parsedData = registryItemSchema.parse(data);
      setState({
        registryData: parsedData,
        registryJson: JSON.stringify(parsedData, null, 2),
      });
    } catch (error) {
      console.error("Error fetching or parsing registry data:", error);
      setState({ registryData: null });
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
    onRegistryUrlChange: (url: string | null) => {
      setState({ registryUrl: url });
      fetchRegistryData(url);
    },
    onRegistryJsonChange: (json: string | undefined) => {
      setState({ registryJson: json });
    },
  };
}

const registryStore = createRegistryStore();

function useRegistryUrl() {
  return React.useSyncExternalStore(
    registryStore.subscribe,
    () => registryStore.getRegistryUrl(),
    () => null,
  );
}

function useRegistryData() {
  return React.useSyncExternalStore(
    registryStore.subscribe,
    () => registryStore.getRegistryData(),
    () => null,
  );
}

function useRegistryJson() {
  const getSnapshot = () => registryStore.getRegistryJson();

  return React.useSyncExternalStore(
    registryStore.subscribe,
    getSnapshot,
    getSnapshot,
  );
}

function useRegistry() {
  const registryUrl = useRegistryUrl();
  const registryData = useRegistryData();
  const registryJson = useRegistryJson();

  return {
    registryUrl,
    onRegistryUrlChange: registryStore.onRegistryUrlChange,
    registryData,
    registryJson,
    onRegistryJsonChange: registryStore.onRegistryJsonChange,
  };
}

export { useRegistryUrl, useRegistryData, useRegistryJson, useRegistry };
