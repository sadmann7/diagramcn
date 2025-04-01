"use client";

import { useRegistry } from "@/app/(registry)/components/registry-provider";

export function Editor() {
  const { registryUrl, registryData } = useRegistry();

  if (!registryUrl) {
    return <div>No registry URL found</div>;
  }

  return <div>Editor with URL: {registryUrl}</div>;
}
