import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { getCanvasHref, getItemHref } from "@/lib/registry/specifier";
import {
  DEFAULT_SHADCN_STYLE,
  getShadcnStyle,
  getShadcnStyleLabel,
  shadcnStyles,
} from "@/lib/registry/styles";

describe("shadcn styles", () => {
  test("lists every library and look, plus the default and legacy styles", () => {
    assert.equal(shadcnStyles.length, 27);
    assert.ok(shadcnStyles.some((style) => style.name === "aria-rhea"));
  });

  test("defaults to base-nova, with new-york-v4 as legacy", () => {
    assert.equal(DEFAULT_SHADCN_STYLE, "base-nova");
    assert.equal(
      shadcnStyles.find((style) => style.name === "new-york-v4")?.group,
      "Legacy",
    );
  });

  test("falls back to the default for unknown input", () => {
    assert.equal(getShadcnStyle("radix-nova"), "radix-nova");
    assert.equal(getShadcnStyle("../../etc"), DEFAULT_SHADCN_STYLE);
    assert.equal(getShadcnStyle(undefined), DEFAULT_SHADCN_STYLE);
  });

  test("labels styles by library", () => {
    assert.equal(getShadcnStyleLabel("base-nova"), "Base Nova");
    assert.equal(getShadcnStyleLabel("new-york"), "New York (Tailwind v3)");
    assert.equal(getShadcnStyleLabel("new-york-v4"), "New York (Tailwind v4)");
  });
});

describe("style in links", () => {
  test("adds the style only when it isn't the default", () => {
    assert.equal(getItemHref("@shadcn/button"), "/@shadcn/button");
    assert.equal(
      getItemHref("@shadcn/button", DEFAULT_SHADCN_STYLE),
      "/@shadcn/button",
    );
    assert.equal(
      getItemHref("@shadcn/button", "new-york-v4"),
      "/@shadcn/button?style=new-york-v4",
    );
    assert.equal(
      getCanvasHref(["@shadcn/button", "@magicui/marquee"], "base-mira"),
      "/canvas?q=%40shadcn%2Fbutton%20%40magicui%2Fmarquee&style=base-mira",
    );
  });
});
