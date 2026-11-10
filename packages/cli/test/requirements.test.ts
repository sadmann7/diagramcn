import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  describeRequirements,
  getPackageName,
  type VersionChanges,
} from "../src/requirements.js";

function changes(overrides: Partial<VersionChanges> = {}): VersionChanges {
  return {
    complete: true,
    changes: {
      dependencies: { added: [], removed: [] },
      devDependencies: { added: [], removed: [] },
      registryDependencies: { added: [], removed: [] },
      cssVars: [],
      envVars: [],
    },
    requires: {
      dependencies: [],
      devDependencies: [],
      registryDependencies: [],
      envVars: [],
    },
    ...overrides,
  };
}

describe("getPackageName", () => {
  test("strips version ranges, including from scoped packages", () => {
    assert.equal(getPackageName("zod"), "zod");
    assert.equal(getPackageName("zod@^4"), "zod");
    assert.equal(
      getPackageName("@radix-ui/react-slot"),
      "@radix-ui/react-slot",
    );
    assert.equal(
      getPackageName("@radix-ui/react-slot@1.2"),
      "@radix-ui/react-slot",
    );
  });
});

describe("describeRequirements", () => {
  test("reports nothing when nothing changed and everything is installed", () => {
    const result = describeRequirements(
      changes({
        requires: {
          dependencies: ["react"],
          devDependencies: [],
          registryDependencies: [],
          envVars: [],
        },
      }),
      new Set(["react"]),
    );
    assert.deepEqual(result.lines, []);
    assert.deepEqual(result.missing, { dependencies: [], devDependencies: [] });
  });

  test("lists new and removed packages and what's missing", () => {
    const result = describeRequirements(
      changes({
        changes: {
          ...changes().changes,
          dependencies: {
            added: ["motion", "zod@^4"],
            removed: ["framer-motion"],
          },
          devDependencies: { added: ["@types/node"], removed: [] },
        },
        requires: {
          dependencies: ["motion", "zod@^4"],
          devDependencies: ["@types/node"],
          registryDependencies: [],
          envVars: [],
        },
      }),
      new Set(["zod", "framer-motion"]),
    );

    assert.deepEqual(result.missing, {
      dependencies: ["motion"],
      devDependencies: ["@types/node"],
    });
    assert.deepEqual(result.lines, [
      "  + motion  new dependency, not installed",
      "  + zod@^4  new dependency, already installed",
      "  − framer-motion  no longer used upstream, you can remove it",
      "  + @types/node  new dev dependency, not installed",
    ]);
  });

  test("reports registry dependencies, CSS variables and env vars", () => {
    const result = describeRequirements(
      changes({
        changes: {
          ...changes().changes,
          registryDependencies: {
            added: ["@shadcn/separator", "@acme/x"],
            removed: [],
          },
          cssVars: [{ key: "light --radius", from: "0.5rem", to: "0.625rem" }],
          envVars: [
            { key: "API_KEY", from: null, to: "" },
            { key: "OLD", from: "", to: null },
          ],
        },
      }),
      new Set(),
    );

    assert.deepEqual(result.lines, [
      "  + @shadcn/separator  new registry dependency, run: shadcn add separator",
      "  + @acme/x  new registry dependency, run: shadcn add @acme/x",
      "  ~ light --radius  0.5rem → 0.625rem, update your CSS",
      "  + API_KEY  new env var, add it to your .env",
    ]);
  });

  test("against git history, only checks what the new version needs", () => {
    const result = describeRequirements(
      changes({
        complete: false,
        changes: {
          ...changes().changes,
          // Meaningless when one side only knows its files.
          dependencies: { added: [], removed: ["ignored"] },
        },
        requires: {
          dependencies: ["@radix-ui/react-slot", "react"],
          devDependencies: [],
          registryDependencies: [],
          envVars: [],
        },
      }),
      new Set(["react", "ignored"]),
    );

    assert.deepEqual(result.lines, [
      "  + @radix-ui/react-slot  needed upstream, not installed",
    ]);
    assert.deepEqual(result.missing.dependencies, ["@radix-ui/react-slot"]);
  });

  test("reports nothing it can't know", () => {
    const result = describeRequirements(
      changes({ complete: false, requires: null }),
      new Set(),
    );
    assert.deepEqual(result.lines, []);
  });
});
