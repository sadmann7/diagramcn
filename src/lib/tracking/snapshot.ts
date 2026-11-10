import { createHash } from "node:crypto";

import type { RegistryItem } from "@/lib/validations/registry";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** JSON with sorted keys and no `undefined`, so equal items hash equally. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry ?? null)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(
        ([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`,
      );
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}

export interface ItemSnapshot {
  hash: string;
  /** The item with each file's `content` replaced by a `contentHash`. */
  item: Record<string, unknown>;
  blobs: Map<string, string>;
}

export function createItemSnapshot(item: RegistryItem): ItemSnapshot {
  const blobs = new Map<string, string>();

  const files = item.files?.map(({ content, ...file }) => {
    if (content === undefined) return file;
    const contentHash = sha256(content);
    blobs.set(contentHash, content);
    return { ...file, contentHash };
  });

  const stored = JSON.parse(stableStringify({ ...item, files })) as Record<
    string,
    unknown
  >;

  return { hash: sha256(stableStringify(stored)), item: stored, blobs };
}
