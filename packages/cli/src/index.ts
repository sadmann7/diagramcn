#!/usr/bin/env node
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import type { Missing, VersionChanges } from "./requirements.js";

import { loadProject, readInstalled, renderVersion } from "./project.js";
import { type Lock, type SyncSource, syncItem, type Version } from "./sync.js";

const DEFAULT_SERVER = "https://diagramcn.com";
const LOCK_FILE = "diagramcn-lock.json";

const help = `Usage: diagramcn sync [items...] [options]

Pull upstream changes to shadcn registry items into your project, keeping
your local edits. Uses a three-way merge between the version you installed,
your files, and the latest upstream version.

Arguments:
  items              Items to sync, e.g. button @magicui/marquee.
                     Defaults to every item in ${LOCK_FILE}.

Options:
  --dry-run          Show what would change without writing files
  --adopt            When your files differ from every known version, treat
                     the differences as your edits to the latest version
  --cwd <dir>        Project directory (default: current directory)
  --server <url>     diagramcn server (default: ${DEFAULT_SERVER})
  -h, --help         Show this help
`;

function normalizeSpecifier(input: string) {
  if (/^https?:\/\//.test(input) || input.startsWith("@")) return input;
  return `@shadcn/${input}`;
}

async function readLock(cwd: string): Promise<Lock> {
  try {
    const lock = JSON.parse(
      await readFile(path.join(cwd, LOCK_FILE), "utf8"),
    ) as Partial<Lock>;
    return { items: lock.items ?? {} };
  } catch {
    return { items: {} };
  }
}

async function writeLock(cwd: string, lock: Lock) {
  const items = Object.fromEntries(
    Object.entries(lock.items).sort(([a], [b]) => a.localeCompare(b)),
  );
  await writeFile(
    path.join(cwd, LOCK_FILE),
    `${JSON.stringify({ items }, null, 2)}\n`,
  );
}

async function getJson<T>(url: string) {
  const response = await fetch(url);
  const data = (await response.json().catch(() => ({}))) as T & {
    error?: string;
  };
  if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
  return data;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
      adopt: { type: "boolean", default: false },
      cwd: { type: "string" },
      server: { type: "string" },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  const [command, ...items] = positionals;

  if (values.help || command !== "sync") {
    console.log(help);
    process.exit(values.help ? 0 : 1);
  }

  const cwd = path.resolve(values.cwd ?? process.cwd());
  if (!(await stat(cwd).catch(() => null))?.isDirectory()) {
    throw new Error(`Not a directory: ${cwd}`);
  }

  const server = (
    values.server ??
    process.env.DIAGRAMCN_SERVER ??
    DEFAULT_SERVER
  ).replace(/\/$/, "");
  const project = await loadProject(cwd);
  const lock = await readLock(cwd);
  const lockBefore = JSON.stringify(lock.items);
  const dryRun = values["dry-run"];

  const source: SyncSource = {
    getVersions: async (specifier) =>
      (
        await getJson<{ versions: Version[] }>(
          `${server}/api/sync/versions?specifier=${encodeURIComponent(specifier)}`,
        )
      ).versions,
    getChanges: (from, to) =>
      getJson<VersionChanges>(
        `${server}/api/sync/changes?from=${from.id}&to=${to.id}`,
      ),
    render: (version) =>
      renderVersion(project, `${server}/r/v/${version.id}.json`),
  };

  const specifiers = [
    ...new Set(
      (items.length > 0 ? items : Object.keys(lock.items)).map(
        normalizeSpecifier,
      ),
    ),
  ];

  if (specifiers.length === 0) {
    console.log(
      `Nothing to sync. Pass items, e.g. diagramcn sync button card. They're added to ${LOCK_FILE} for next time.`,
    );
    return;
  }

  const installed = await readInstalled(cwd);
  const missing: Missing = { dependencies: [], devDependencies: [] };
  let conflicts = 0;
  let attention = 0;
  let failed = 0;

  for (const specifier of specifiers) {
    try {
      const result = await syncItem(specifier, {
        cwd,
        source,
        dryRun,
        adopt: values.adopt,
        lock,
        installed,
        log: (line) => console.log(line),
      });
      conflicts += result.conflicts;
      attention += result.attention;
      missing.dependencies.push(...result.missing.dependencies);
      missing.devDependencies.push(...result.missing.devDependencies);
    } catch (error) {
      failed++;
      console.log(
        `  ✗ ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (!dryRun && JSON.stringify(lock.items) !== lockBefore) {
    await writeLock(cwd, lock);
  }

  const installs = [
    missing.dependencies.length > 0
      ? [...project.install, ...new Set(missing.dependencies)].join(" ")
      : null,
    missing.devDependencies.length > 0
      ? [...project.install, "-D", ...new Set(missing.devDependencies)].join(
          " ",
        )
      : null,
  ].filter(Boolean);
  if (installs.length > 0) {
    console.log(`\nInstall the new dependencies:\n  ${installs.join("\n  ")}`);
  }

  console.log(
    `\n${dryRun ? "Dry run, nothing written. " : ""}${conflicts > 0 ? `${conflicts} ${conflicts === 1 ? "conflict" : "conflicts"} to resolve. ` : ""}${attention > 0 ? `${attention} need attention. ` : ""}${failed > 0 ? `${failed} failed.` : ""}`.trimEnd(),
  );
  process.exitCode = conflicts > 0 || attention > 0 || failed > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
