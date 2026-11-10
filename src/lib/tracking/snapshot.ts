import { createHash } from "node:crypto";

import type { RegistryItem } from "@/lib/validations/registry";

import { stableStringify } from "@/lib/stable-stringify";

export function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
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
