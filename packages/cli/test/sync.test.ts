import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, test } from "node:test";

import type { VersionChanges } from "../src/requirements.js";

import {
  type Files,
  getDistance,
  type Lock,
  planFiles,
  type SyncContext,
  syncItem,
  type Version,
} from "../src/sync.js";

const FILE = "components/ui/button.tsx";

// Ten lines, so edits at the start, middle and end don't overlap.
function lines(changes: Record<number, string> = {}, extra: string[] = []) {
  const result = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"].map(
    (line, index) => changes[index] ?? line,
  );
  return [...result, ...extra, ""].join("\n");
}

const v1 = lines();
// Upstream changes line 2, then line 5.
const v2 = lines({ 1: "B" });
const v3 = lines({ 1: "B", 4: "E" });
// Local edit at the end, away from upstream's changes.
const edited = lines({}, ["local"]);

function files(entries: Record<string, string>): Files {
  return new Map(Object.entries(entries));
}

const versions: Version[] = [
  { id: "v3", hash: "h3", fetchedAt: "2026-11-10T00:00:00.000Z" },
  { id: "v2", hash: "h2", fetchedAt: "2026-06-01T00:00:00.000Z" },
  { id: "v1", hash: "h1", fetchedAt: "2025-12-01T00:00:00.000Z" },
];

const noChanges: VersionChanges = {
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
};

interface Setup {
  local?: Record<string, string>;
  rendered?: Record<string, Record<string, string>>;
  lock?: Lock;
  changes?: VersionChanges | Error;
  dryRun?: boolean;
  adopt?: boolean;
}

async function setup({
  local = {},
  rendered = { v1: { [FILE]: v1 }, v2: { [FILE]: v2 }, v3: { [FILE]: v3 } },
  lock = { items: {} },
  changes = noChanges,
  dryRun = false,
  adopt = false,
}: Setup = {}) {
  const cwd = await mkdtemp(path.join(tmpdir(), "diagramcn-test-"));
  for (const [file, content] of Object.entries(local)) {
    await mkdir(path.dirname(path.join(cwd, file)), { recursive: true });
    await writeFile(path.join(cwd, file), content);
  }

  const output: string[] = [];
  const context: SyncContext = {
    cwd,
    dryRun,
    adopt,
    lock,
    installed: new Set(["react"]),
    log: (line) => output.push(line),
    source: {
      getVersions: async () => versions,
      getChanges: async () => {
        if (changes instanceof Error) throw changes;
        return changes;
      },
      render: async (version) => files(rendered[version.id] ?? {}),
    },
  };

  return {
    cwd,
    context,
    output,
    read: (file: string) =>
      readFile(path.join(cwd, file), "utf8").catch(() => undefined),
    sync: () => syncItem("@shadcn/button", context),
  };
}

describe("getDistance", () => {
  test("is zero for identical files and counts changed lines", () => {
    assert.equal(getDistance(files({ a: v1 }), files({ a: v1 })), 0);
    // One line removed, one added.
    assert.equal(getDistance(files({ a: v1 }), files({ a: v2 })), 2);
  });

  test("counts every line of a missing file", () => {
    // Ten lines plus the empty one after the final newline.
    assert.equal(getDistance(files({ a: v1 }), files({})), 11);
  });
});

describe("planFiles", () => {
  test("fast-forwards unedited files", async () => {
    const plan = await planFiles(
      files({ [FILE]: v1 }),
      files({ [FILE]: v1 }),
      files({ [FILE]: v3 }),
    );
    assert.deepEqual(plan.writes, [[FILE, v3]]);
    assert.equal(plan.conflicts, 0);
  });

  test("merges upstream changes into edited files", async () => {
    const plan = await planFiles(
      files({ [FILE]: edited }),
      files({ [FILE]: v1 }),
      files({ [FILE]: v3 }),
    );
    assert.deepEqual(plan.writes, [
      [FILE, lines({ 1: "B", 4: "E" }, ["local"])],
    ]);
    assert.equal(plan.conflicts, 0);
    assert.match(plan.notes[0] ?? "", /merged, kept your edits/);
  });

  test("marks conflicts when both sides change the same line", async () => {
    const plan = await planFiles(
      files({ [FILE]: lines({ 1: "local" }) }),
      files({ [FILE]: v1 }),
      files({ [FILE]: v2 }),
    );
    assert.equal(plan.conflicts, 1);
    assert.match(plan.writes[0]?.[1] ?? "", /<<<<<<< local/);
  });

  test("never overwrites a local file upstream didn't ship before", async () => {
    const plan = await planFiles(
      files({ [FILE]: v1, "lib/helper.ts": "mine" }),
      files({ [FILE]: v1 }),
      files({ [FILE]: v3, "lib/helper.ts": "theirs" }),
    );
    assert.equal(plan.problems.length, 1);
    assert.match(plan.problems[0] ?? "", /lib\/helper\.ts/);
    assert.ok(!plan.writes.some(([file]) => file === "lib/helper.ts"));
  });

  test("adds new files, keeps removed ones and skips local deletions", async () => {
    const plan = await planFiles(
      files({ "old.ts": "old" }),
      files({ "old.ts": "old", "deleted.ts": "x" }),
      files({ "new.ts": "new", "deleted.ts": "y" }),
    );
    assert.deepEqual(plan.writes, [["new.ts", "new"]]);
    assert.deepEqual(plan.notes, [
      "  · deleted.ts  deleted locally, skipped",
      "  + new.ts  added upstream",
      "  - old.ts  removed upstream, kept your copy",
    ]);
  });
});

describe("syncItem", () => {
  test("detects an older install and merges, keeping local edits", async () => {
    const { sync, read, context } = await setup({ local: { [FILE]: edited } });

    const result = await sync();

    assert.equal(result.conflicts, 0);
    assert.equal(result.attention, 0);
    assert.equal(await read(FILE), lines({ 1: "B", 4: "E" }, ["local"]));
    assert.equal(context.lock.items["@shadcn/button"]?.version, "v3");
  });

  test("uses the locked version instead of detecting", async () => {
    // Matches v1 exactly, but the lock says v2 was installed.
    const { sync, read } = await setup({
      local: { [FILE]: v1 },
      lock: {
        items: { "@shadcn/button": { version: "v2", fetchedAt: "" } },
      },
    });

    await sync();

    // v2 → v3 only changes line 5, so line 2 keeps the local "b".
    assert.equal(await read(FILE), lines({ 4: "E" }));
  });

  test("reports up to date and pins the lock", async () => {
    const { sync, output, context } = await setup({ local: { [FILE]: v3 } });

    await sync();

    assert.match(output.join("\n"), /up to date/);
    assert.equal(context.lock.items["@shadcn/button"]?.version, "v3");
  });

  test("refuses to guess when files only resemble the latest", async () => {
    const editedLatest = lines({ 1: "B", 4: "E" }, ["local"]);
    const { sync, read, context, output } = await setup({
      local: { [FILE]: editedLatest },
    });

    const result = await sync();

    assert.equal(result.attention, 1);
    assert.match(output.join("\n"), /--adopt/);
    assert.equal(await read(FILE), editedLatest);
    assert.deepEqual(context.lock.items, {});
  });

  test("--adopt treats the differences as local edits to the latest", async () => {
    const editedLatest = lines({ 1: "B", 4: "E" }, ["local"]);
    const { sync, read, context } = await setup({
      local: { [FILE]: editedLatest },
      adopt: true,
    });

    const result = await sync();

    assert.equal(result.attention, 0);
    assert.equal(await read(FILE), editedLatest);
    assert.equal(context.lock.items["@shadcn/button"]?.version, "v3");
  });

  test("writes nothing when upstream collides with a local file", async () => {
    const { sync, read, context } = await setup({
      local: { [FILE]: v1, "lib/helper.ts": "mine" },
      rendered: {
        v1: { [FILE]: v1 },
        v2: { [FILE]: v2 },
        v3: { [FILE]: v3, "lib/helper.ts": "theirs" },
      },
    });

    const result = await sync();

    assert.equal(result.attention, 1);
    assert.equal(await read(FILE), v1);
    assert.equal(await read("lib/helper.ts"), "mine");
    assert.deepEqual(context.lock.items, {});
  });

  test("--dry-run writes nothing", async () => {
    const { sync, read, context } = await setup({
      local: { [FILE]: v1 },
      dryRun: true,
    });

    await sync();

    assert.equal(await read(FILE), v1);
    assert.deepEqual(context.lock.items, {});
  });

  test("reports items that aren't installed", async () => {
    const { sync, output } = await setup();

    const result = await sync();

    assert.equal(result.attention, 0);
    assert.match(
      output.join("\n"),
      /not installed\. Add it first: shadcn add button/,
    );
  });

  test("reports dependency changes and collects missing packages", async () => {
    const { sync, output } = await setup({
      local: { [FILE]: v1 },
      changes: {
        ...noChanges,
        changes: {
          ...noChanges.changes,
          dependencies: { added: ["@radix-ui/react-slot@^1.2"], removed: [] },
          registryDependencies: { added: ["@shadcn/separator"], removed: [] },
        },
        requires: {
          ...noChanges.requires!,
          dependencies: ["@radix-ui/react-slot@^1.2", "react"],
        },
      },
    });

    const result = await sync();

    assert.deepEqual(result.missing.dependencies, [
      "@radix-ui/react-slot@^1.2",
    ]);
    const text = output.join("\n");
    assert.match(
      text,
      /\+ @radix-ui\/react-slot@\^1\.2 {2}new dependency, not installed/,
    );
    assert.match(text, /run: shadcn add separator/);
  });

  test("still syncs files when dependency changes can't be fetched", async () => {
    const { sync, read, output } = await setup({
      local: { [FILE]: v1 },
      changes: new Error("HTTP 500"),
    });

    await sync();

    assert.equal(await read(FILE), v3);
    assert.match(
      output.join("\n"),
      /couldn't check dependency changes: HTTP 500/,
    );
  });
});
