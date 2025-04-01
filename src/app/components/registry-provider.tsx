"use client";

import { createContext, useContext, useState } from "react";

interface RegistryContextType {
  registryUrl: string | null;
  setRegistryUrl: (url: string | null) => void;
}

const RegistryContext = createContext<RegistryContextType | undefined>(
  undefined,
);

export function RegistryProvider({ children }: { children: React.ReactNode }) {
  const [registryUrl, setRegistryUrl] = useState<string | null>(null);

  return (
    <RegistryContext.Provider value={{ registryUrl, setRegistryUrl }}>
      {children}
    </RegistryContext.Provider>
  );
}

export function useRegistry() {
  const context = useContext(RegistryContext);
  if (context === undefined) {
    throw new Error("useRegistry must be used within a RegistryProvider");
  }
  return context;
}
