"use client";

import * as React from "react";

import { packageManagers } from "@/lib/command";

export type PackageManager = (typeof packageManagers)[number];

const STORAGE_KEY = "diagramcn:package-manager";
const DEFAULT_PACKAGE_MANAGER: PackageManager = "pnpm";

const listeners = new Set<() => void>();

function isPackageManager(value: unknown): value is PackageManager {
  return packageManagers.includes(value as PackageManager);
}

function getSnapshot(): PackageManager {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isPackageManager(stored) ? stored : DEFAULT_PACKAGE_MANAGER;
  } catch {
    // Storage can be blocked, e.g. in private windows.
    return DEFAULT_PACKAGE_MANAGER;
  }
}

function getServerSnapshot(): PackageManager {
  return DEFAULT_PACKAGE_MANAGER;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Picks up changes made in other tabs.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function setPackageManager(value: PackageManager) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Still updates this page below, just isn't remembered.
  }
  for (const listener of listeners) listener();
}

/**
 * The package manager picked in any command block. Shared by every block
 * on the page and remembered across pages and visits.
 */
export function usePackageManager() {
  const packageManager = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  return [packageManager, setPackageManager] as const;
}
