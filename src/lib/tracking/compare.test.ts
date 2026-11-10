import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  compareSnapshots,
  compareVersions,
  getChangeSummary,
} from "@/lib/tracking/compare";

const base = {
  name: "button",
  type: "registry:ui",
  dependencies: ["@radix-ui/react-slot"],
  registryDependencies: [],
  cssVars: { light: { radius: "0.5rem" } },
  files: [{ path: "ui/button.tsx", type: "registry:ui", contentHash: "a" }],
};

const next = {
  ...base,
  dependencies: ["@radix-ui/react-slot", "motion"],
  registryDependencies: ["separator"],
  cssVars: { light: { radius: "0.625rem" } },
  envVars: { API_KEY: "" },
  files: [
    { path: "ui/button.tsx", type: "registry:ui", contentHash: "b" },
    { path: "ui/icon.tsx", type: "registry:ui", contentHash: "c" },
  ],
};

describe("compareSnapshots", () => {
  test("finds every kind of change", () => {
    const changes = compareSnapshots(base, next);

    assert.deepEqual(changes.dependencies, { added: ["motion"], removed: [] });
    assert.deepEqual(changes.registryDependencies, {
      added: ["separator"],
      removed: [],
    });
    assert.deepEqual(changes.cssVars, [
      { key: "light --radius", from: "0.5rem", to: "0.625rem" },
    ]);
    assert.deepEqual(changes.envVars, [{ key: "API_KEY", from: null, to: "" }]);
    assert.deepEqual(
      changes.files.map((file) => [file.path, file.status]),
      [
        ["ui/button.tsx", "modified"],
        ["ui/icon.tsx", "added"],
      ],
    );
    assert.equal(
      getChangeSummary(changes),
      "1 file changed · 1 added · deps +1 · registry deps +1 · 1 CSS vars · 1 env vars",
    );
  });

  test("calls identical versions formatting only", () => {
    assert.equal(
      getChangeSummary(compareSnapshots(base, base)),
      "Formatting only",
    );
  });
});

describe("compareVersions", () => {
  test("compares everything between crawled versions", () => {
    const changes = compareVersions(
      { item: base, origin: "crawl" },
      { item: next, origin: "crawl" },
    );
    assert.deepEqual(changes.dependencies.added, ["motion"]);
  });

  test("compares only files when either side came from git", () => {
    const changes = compareVersions(
      { item: { files: base.files }, origin: "git" },
      { item: next, origin: "crawl" },
    );
    assert.deepEqual(changes.dependencies, { added: [], removed: [] });
    assert.deepEqual(changes.cssVars, []);
    assert.equal(changes.files.length, 2);
  });
});
