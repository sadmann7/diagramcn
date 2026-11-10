#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import { mergeFile } from "./merge.js";
import { loadProject, type Project, renderVersion } from "./project.js";

const DEFAULT_SERVER = "https://diagramcn.com";
const LOCK_FILE = "diagramcn-lock.json";
// Detecting the installed version renders each candidate, so cap the search.
const MAX_DETECT_VERSIONS = 10;

const help = `Usage: diagramcn sync [items...] [options]

Pull upstream changes to shadcn registry items into your project, keeping
your local edits. Uses a three-way merge between the version you installed,
your files, and the latest upstream version.

Arguments:
  items              Items to sync, e.g. button @magicui/marquee.
                     Defaults to every item in ${LOCK_FILE}.

Options:
  --dry-run          Show what would change without writing files
  --cwd <dir>        Project directory (default: current directory)
  --server <url>     diagramcn server (default: ${DEFAULT_SERVER})
  -h, --help         Show this help
`;

interface Version {
  id: string;
  hash: string;
  fetchedAt: string;
}

interface Lock {
  items: Record<string, { version: string; fetchedAt: string }>;
}

type Files = Map<string, string>;

function normalizeSpecifier(input: string) {
  if (/^https?:\/\//.test(input) || input.startsWith("@")) return input;
  return `@shadcn/${input}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
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

async function fetchVersions(server: string, specifier: string) {
  const response = await fetch(
    `${server}/api/sync/versions?specifier=${encodeURIComponent(specifier)}`,
  );
  const data = (await response.json()) as {
    versions?: Version[];
    error?: string;
  };
  if (!response.ok || !data.versions) {
    throw new Error(data.error ?? `HTTP ${response.status}`);
  }
  return data.versions;
}

async function readLocalFiles(cwd: string, paths: Iterable<string>) {
  const files: Files = new Map();
  for (const file of paths) {
    try {
      files.set(file, await readFile(path.join(cwd, file), "utf8"));
    } catch {
      // Not installed, or deleted locally.
    }
  }
  return files;
}

/** Rough distance between rendered files and local files, in lines. */
function getDistance(rendered: Files, local: Files) {
  let distance = 0;
  for (const [file, content] of rendered) {
    const theirs = content.split("\n");
    const ours = local.get(file)?.split("\n");
    if (!ours) {
      distance += theirs.length;
      continue;
    }
    const counts = new Map<string, number>();
    for (const line of theirs) counts.set(line, (counts.get(line) ?? 0) + 1);
    for (const line of ours) counts.set(line, (counts.get(line) ?? 0) - 1);
    for (const count of counts.values()) distance += Math.abs(count);
  }
  return distance;
}

interface SyncContext {
  project: Project;
  server: string;
  dryRun: boolean;
  lock: Lock;
}

async function syncItem(specifier: string, context: SyncContext) {
  const { project, server, dryRun, lock } = context;
  const renders = new Map<string, Promise<Files>>();
  const render = (version: Version) => {
    let files = renders.get(version.id);
    if (!files) {
      files = renderVersion(project, `${server}/r/v/${version.id}.json`);
      renders.set(version.id, files);
    }
    return files;
  };

  console.log(`\n${specifier}`);

  const versions = await fetchVersions(server, specifier);
  const latest = versions[0];
  if (!latest) throw new Error("No versions found");

  // The installed version: from the lock file, or the closest match.
  const locked = lock.items[specifier];
  let base = versions.find((version) => version.id === locked?.version);
  let detected = false;

  if (!base) {
    const candidates = versions.slice(0, MAX_DETECT_VERSIONS);
    const rendered = await Promise.all(candidates.map(render));
    const paths = new Set(rendered.flatMap((files) => [...files.keys()]));
    const local = await readLocalFiles(project.cwd, paths);

    if (local.size === 0) {
      console.log(
        `  not installed. Add it first: shadcn add ${specifier.replace(/^@shadcn\//, "")}`,
      );
      return { conflicts: 0 };
    }

    let best = Number.POSITIVE_INFINITY;
    for (const [index, files] of rendered.entries()) {
      const distance = getDistance(files, local);
      if (distance < best) {
        best = distance;
        base = candidates[index];
      }
    }
    detected = true;
  }

  if (!base) throw new Error("Could not determine the installed version");

  const lockEntry = { version: latest.id, fetchedAt: latest.fetchedAt };

  if (base.id === latest.id) {
    console.log(
      `  up to date (${formatDate(latest.fetchedAt)}${detected ? ", detected" : ""})`,
    );
    lock.items[specifier] = lockEntry;
    return { conflicts: 0 };
  }

  console.log(
    `  installed ${formatDate(base.fetchedAt)}${detected ? " (detected)" : ""} → upstream ${formatDate(latest.fetchedAt)}`,
  );

  const [baseFiles, upstreamFiles] = await Promise.all([
    render(base),
    render(latest),
  ]);
  const paths = new Set([...baseFiles.keys(), ...upstreamFiles.keys()]);
  const local = await readLocalFiles(project.cwd, paths);

  let conflicts = 0;
  const writes: [string, string][] = [];

  for (const file of [...paths].sort()) {
    const ours = local.get(file);
    const before = baseFiles.get(file);
    const after = upstreamFiles.get(file);

    if (after === undefined) {
      console.log(`  - ${file}  removed upstream, kept your copy`);
      continue;
    }
    if (ours === undefined) {
      if (before === undefined) {
        console.log(`  + ${file}  added upstream`);
        writes.push([file, after]);
      } else {
        console.log(`  · ${file}  deleted locally, skipped`);
      }
      continue;
    }
    if (ours === after || before === after) {
      continue;
    }
    if (before === undefined || ours === before) {
      console.log(`  ✓ ${file}  updated`);
      writes.push([file, after]);
      continue;
    }

    const merged = await mergeFile(ours, before, after);
    writes.push([file, merged.content]);
    if (merged.conflicts > 0) {
      conflicts += merged.conflicts;
      console.log(
        `  ! ${file}  ${merged.conflicts} ${merged.conflicts === 1 ? "conflict" : "conflicts"}, resolve the markers`,
      );
    } else {
      console.log(`  ✓ ${file}  merged, kept your edits`);
    }
  }

  if (writes.length === 0) console.log("  no file changes");

  if (!dryRun) {
    for (const [file, content] of writes) {
      const target = path.join(project.cwd, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    lock.items[specifier] = lockEntry;
  }

  return { conflicts };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      "dry-run": { type: "boolean", default: false },
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
  const dryRun = values["dry-run"];

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

  let conflicts = 0;
  let failed = 0;

  for (const specifier of specifiers) {
    try {
      conflicts += (
        await syncItem(specifier, { project, server, dryRun, lock })
      ).conflicts;
    } catch (error) {
      failed++;
      console.log(
        `  ✗ ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  if (!dryRun) await writeLock(cwd, lock);

  console.log(
    `\n${dryRun ? "Dry run, nothing written. " : ""}${conflicts > 0 ? `${conflicts} ${conflicts === 1 ? "conflict" : "conflicts"} to resolve. ` : ""}${failed > 0 ? `${failed} failed.` : ""}`.trimEnd(),
  );
  process.exitCode = conflicts > 0 || failed > 0 ? 1 : 0;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
