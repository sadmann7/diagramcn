import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { PlannedFile } from "@/lib/registry/plan";
import type { ResolvedGraph, ResolvedNode } from "@/lib/registry/resolve";
import type { RegistryItem } from "@/lib/validations/registry";

import { getConflictPairs, getConflicts } from "@/lib/registry/conflicts";

function node(id: string, item: Partial<RegistryItem>): ResolvedNode {
  return {
    id,
    specifier: id,
    url: id,
    namespace: id.split("/")[0] ?? null,
    depth: 0,
    style: "",
    item: { name: id, type: "registry:component", ...item } as RegistryItem,
    error: null,
  };
}

function graph(nodes: ResolvedNode[]): ResolvedGraph {
  return {
    roots: nodes.map((n) => n.id),
    nodes,
    edges: [],
    registries: [],
    truncated: false,
  };
}

function file(itemId: string, target: string, content: string): PlannedFile {
  return {
    itemId,
    itemName: itemId,
    path: target,
    type: "registry:component",
    target,
    content,
    imports: [],
    packages: [],
  };
}

describe("getConflicts", () => {
  test("finds files written with different content", () => {
    const a = node("@a/x", {});
    const b = node("@b/y", {});
    const conflicts = getConflicts(graph([a, b]), {
      files: [
        file(a.id, "components/card.tsx", "a"),
        file(b.id, "components/card.tsx", "b"),
        // Same content from both is fine.
        file(a.id, "lib/utils.ts", "same"),
        file(b.id, "lib/utils.ts", "same"),
      ],
    });

    assert.deepEqual(
      conflicts.map((conflict) => [conflict.kind, conflict.subject]),
      [["file", "components/card.tsx"]],
    );
    assert.deepEqual(conflicts[0]?.itemIds, [a.id, b.id]);
  });

  test("finds CSS variables, env vars and package ranges that disagree", () => {
    const a = node("@a/x", {
      cssVars: { light: { radius: "0.5rem", primary: "red" } },
      envVars: { API_URL: "https://a.dev" },
      dependencies: ["zod@^3", "motion"],
    });
    const b = node("@b/y", {
      cssVars: { light: { radius: "1rem", primary: "red" } },
      envVars: { API_URL: "https://b.dev" },
      // Unpinned specs accept any version, so `motion` doesn't clash.
      dependencies: ["zod@^4", "motion@^12"],
    });

    const conflicts = getConflicts(graph([a, b]), { files: [] });

    assert.deepEqual(
      conflicts.map((conflict) => [conflict.kind, conflict.subject]),
      [
        ["css-var", "light --radius"],
        ["env-var", "API_URL"],
        ["dependency", "zod"],
      ],
    );
    assert.equal(conflicts[2]?.detail, "Asks for ^3 and ^4.");
  });

  test("never reports an item conflicting with itself", () => {
    const a = node("@a/x", { dependencies: ["zod@^3", "zod@^4"] });
    const conflicts = getConflicts(graph([a]), {
      files: [file(a.id, "x.ts", "1"), file(a.id, "x.ts", "2")],
    });
    assert.deepEqual(conflicts, []);
  });
});

describe("getConflictPairs", () => {
  test("groups conflicts into one edge per pair of items", () => {
    const pairs = getConflictPairs([
      { id: "1", kind: "file", subject: "a", detail: "", itemIds: ["x", "y"] },
      {
        id: "2",
        kind: "css-var",
        subject: "b",
        detail: "",
        itemIds: ["y", "x"],
      },
      {
        id: "3",
        kind: "file",
        subject: "c",
        detail: "",
        itemIds: ["x", "y", "z"],
      },
    ]);

    assert.deepEqual(
      pairs.map((pair) => [pair.source, pair.target, pair.conflicts.length]),
      [
        ["x", "y", 3],
        ["x", "z", 1],
        ["y", "z", 1],
      ],
    );
  });
});
