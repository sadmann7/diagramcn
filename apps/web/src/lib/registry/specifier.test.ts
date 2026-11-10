import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { normalizeSpecifier, parseAddInput } from "@/lib/registry/specifier";

describe("normalizeSpecifier", () => {
  test("puts bare names in the @shadcn namespace", () => {
    assert.equal(normalizeSpecifier("button"), "@shadcn/button");
    assert.equal(normalizeSpecifier("@acme/foo"), "@acme/foo");
    assert.equal(
      normalizeSpecifier("https://example.com/r/foo.json"),
      "https://example.com/r/foo.json",
    );
  });
});

describe("parseAddInput", () => {
  test("reads items from pasted add commands", () => {
    assert.deepEqual(
      parseAddInput(
        "npx shadcn@latest add @acme/data-table button --overwrite",
      ),
      ["@acme/data-table", "@shadcn/button"],
    );
    assert.deepEqual(parseAddInput("bunx --bun shadcn add card"), [
      "@shadcn/card",
    ]);
    assert.deepEqual(parseAddInput("pnpm dlx shadcn add -c apps/web dialog"), [
      "@shadcn/dialog",
    ]);
  });

  test("ignores commands that don't take items", () => {
    assert.deepEqual(parseAddInput("npx shadcn@latest init"), []);
  });

  test("accepts plain lists and dedupes them", () => {
    assert.deepEqual(parseAddInput("button card button"), [
      "@shadcn/button",
      "@shadcn/card",
    ]);
  });
});
