"use client";

import { useLocalStorage } from "@/hooks/use-local-storage";
import {
  type RegistryItem,
  registryItemSchema,
} from "@/lib/validations/registry";
import * as React from "react";

interface RegistryContextValue {
  registryUrl: string | null;
  setRegistryUrl: (url: string | null) => void;
  registryData: RegistryItem | null;
}

const RegistryContext = React.createContext<RegistryContextValue | null>(null);

export function useRegistry() {
  const context = React.useContext(RegistryContext);
  if (context === null) {
    throw new Error("useRegistry must be used within a RegistryProvider");
  }
  return context;
}

interface RegistryProviderProps {
  children: React.ReactNode;
}

export function RegistryProvider({ children }: RegistryProviderProps) {
  const [registryUrl, setRegistryUrl] = useLocalStorage<string | null>(
    "registryUrl",
    null,
  );
  const [registryData, setRegistryData] = useLocalStorage<RegistryItem | null>(
    "registryData",
    null,
  );

  React.useEffect(() => {
    if (!registryUrl) {
      setRegistryData(null);
      return;
    }

    async function getRegistryData() {
      if (!registryUrl) return;

      try {
        const response = await fetch(registryUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const parsedData = registryItemSchema.parse(data);
        setRegistryData(parsedData);
      } catch (error) {
        console.error("Error fetching or parsing registry data:", error);
        setRegistryData(null);
      }
    }

    getRegistryData();
  }, [registryUrl, setRegistryData]);

  return (
    <RegistryContext.Provider
      value={{ registryUrl, setRegistryUrl, registryData }}
    >
      {children}
    </RegistryContext.Provider>
  );
}
