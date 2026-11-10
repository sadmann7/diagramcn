import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getRegistryStyle } from "../src/project.js";

describe("getRegistryStyle", () => {
  test("maps Tailwind v4 new-york and default projects to new-york-v4", () => {
    assert.equal(getRegistryStyle({ style: "new-york" }), "new-york-v4");
    assert.equal(
      getRegistryStyle({ style: "default", tailwind: { config: "" } }),
      "new-york-v4",
    );
    assert.equal(getRegistryStyle({}), "new-york-v4");
  });

  test("keeps the legacy styles on Tailwind v3", () => {
    assert.equal(
      getRegistryStyle({
        style: "new-york",
        tailwind: { config: "tailwind.config.ts" },
      }),
      "new-york",
    );
  });

  test("passes newer styles through", () => {
    assert.equal(getRegistryStyle({ style: "radix-nova" }), "radix-nova");
    assert.equal(getRegistryStyle({ style: "base-lyra" }), "base-lyra");
  });
});
