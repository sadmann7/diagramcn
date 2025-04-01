"use client";

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
  const [registryUrl, setRegistryUrl] = React.useState<string | null>(null);
  const [registryData, setRegistryData] = React.useState<RegistryItem | null>(
    null,
  );

  React.useEffect(() => {
    async function fetchRegistryData() {
      if (registryUrl) {
        try {
          const response = await fetch(registryUrl);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const rawData = await response.json();
          const parsedData = registryItemSchema.parse(rawData);
          setRegistryData(parsedData);
        } catch (error) {
          console.error("Error fetching or parsing registry data:", error);
          setRegistryData(null);
        }
      } else {
        setRegistryData(null);
      }
    }

    fetchRegistryData();
  }, [registryUrl]);

  return (
    <RegistryContext.Provider
      value={{ registryUrl, setRegistryUrl, registryData }}
    >
      {children}
    </RegistryContext.Provider>
  );
}
