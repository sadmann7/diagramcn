import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { mergeFile } from "./merge.js";
import {
  describeRequirements,
  type Missing,
  type VersionChanges,
} from "./requirements.js";

// Detecting the installed version renders each candidate, so cap the search
// and how many shadcn processes run at once.
const MAX_DETECT_VERSIONS = 20;
const RENDER_CONCURRENCY = 4;

export interface Version {
  id: string;
  hash: string;
  fetchedAt: string;
}

export interface Lock {
  items: Record<string, { version: string; fetchedAt: string }>;
}

export type Files = Map<string, string>;

/** Everything sync needs from the server and the shadcn CLI. */
export interface SyncSource {
  getVersions: (specifier: string) => Promise<Version[]>;
  getChanges: (from: Version, to: Version) => Promise<VersionChanges>;
  /** Files `shadcn add` writes for this version, keyed by project path. */
  render: (version: Version) => Promise<Files>;
}

export interface SyncContext {
  cwd: string;
  source: SyncSource;
  dryRun: boolean;
  adopt: boolean;
  lock: Lock;
  /** npm packages in the project's package.json. */
  installed: Set<string>;
  log: (line: string) => void;
}

export interface SyncResult {
  conflicts: number;
  /** Problems that need a decision; nothing is written for them. */
  attention: number;
  missing: Missing;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}

function pluralize(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
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
export function getDistance(rendered: Files, local: Files) {
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

async function mapLimit<T, R>(
  values: T[],
  limit: number,
  fn: (value: T) => Promise<R>,
) {
  const results: R[] = [];
  let next = 0;
  async function worker() {
    while (next < values.length) {
      const index = next++;
      results[index] = await fn(values[index] as T);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, values.length) }, worker),
  );
  return results;
}

export interface FilePlan {
  /** Files to write, with their new content. */
  writes: [string, string][];
  /** One line per file, for the report. */
  notes: string[];
  /** Files that block the whole item; nothing should be written. */
  problems: string[];
  conflicts: number;
}

/**
 * Decides what happens to each file, given your copy, the installed
 * version and upstream's. Never writes over a file upstream didn't ship
 * at the installed version.
 */
export async function planFiles(
  local: Files,
  base: Files,
  upstream: Files,
): Promise<FilePlan> {
  const plan: FilePlan = { writes: [], notes: [], problems: [], conflicts: 0 };
  const paths = new Set([...base.keys(), ...upstream.keys()]);

  for (const file of [...paths].sort()) {
    const ours = local.get(file);
    const before = base.get(file);
    const after = upstream.get(file);

    if (after === undefined) {
      plan.notes.push(`  - ${file}  removed upstream, kept your copy`);
      continue;
    }
    if (ours === undefined) {
      if (before === undefined) {
        plan.notes.push(`  + ${file}  added upstream`);
        plan.writes.push([file, after]);
      } else {
        plan.notes.push(`  · ${file}  deleted locally, skipped`);
      }
      continue;
    }
    if (ours === after || before === after) {
      continue;
    }
    if (before === undefined) {
      // Upstream now ships a file at a path you already use for something.
      plan.problems.push(
        `  ! ${file}  upstream added this file, but you already have a different one here. Move or rename yours, then sync again.`,
      );
      continue;
    }
    if (ours === before) {
      plan.notes.push(`  ✓ ${file}  updated`);
      plan.writes.push([file, after]);
      continue;
    }

    const merged = await mergeFile(ours, before, after);
    plan.writes.push([file, merged.content]);
    if (merged.conflicts > 0) {
      plan.conflicts += merged.conflicts;
      plan.notes.push(
        `  ! ${file}  ${pluralize(merged.conflicts, "conflict", "conflicts")}, resolve the markers`,
      );
    } else {
      plan.notes.push(`  ✓ ${file}  merged, kept your edits`);
    }
  }

  return plan;
}

export async function syncItem(
  specifier: string,
  context: SyncContext,
): Promise<SyncResult> {
  const { cwd, source, dryRun, adopt, lock, installed, log } = context;
  const result: SyncResult = {
    conflicts: 0,
    attention: 0,
    missing: { dependencies: [], devDependencies: [] },
  };

  const renders = new Map<string, Promise<Files>>();
  const render = (version: Version) => {
    let files = renders.get(version.id);
    if (!files) {
      files = source.render(version);
      renders.set(version.id, files);
    }
    return files;
  };

  log(`\n${specifier}`);

  const versions = await source.getVersions(specifier);
  const latest = versions[0];
  if (!latest) throw new Error("No versions found");

  // The installed version: from the lock file, or the closest match.
  const locked = lock.items[specifier];
  let base = versions.find((version) => version.id === locked?.version);
  let detected = false;

  if (!base) {
    const candidates = versions.slice(0, MAX_DETECT_VERSIONS);
    const rendered = await mapLimit(candidates, RENDER_CONCURRENCY, render);
    const paths = new Set(rendered.flatMap((files) => [...files.keys()]));
    const local = await readLocalFiles(cwd, paths);

    if (local.size === 0) {
      log(
        `  not installed. Add it first: shadcn add ${specifier.replace(/^@shadcn\//, "")}`,
      );
      return result;
    }

    // Ties go to the newest version, since candidates are newest first.
    let best = Number.POSITIVE_INFINITY;
    for (const [index, files] of rendered.entries()) {
      const distance = getDistance(files, local);
      if (distance < best) {
        best = distance;
        base = candidates[index];
      }
    }

    const lines = pluralize(best, "line differs", "lines differ");

    if (best > 0 && base?.id === latest.id && !adopt) {
      // Either local edits to the latest version, or an older version we
      // don't have. Guessing wrong would silently drop upstream changes.
      log(
        `  ! your files differ from every known version (closest: the latest, ${lines}).`,
      );
      log(
        "    If those differences are your own edits, run again with --adopt.",
      );
      log(
        "    Otherwise this is an older version diagramcn doesn't have, and merging could drop upstream changes.",
      );
      result.attention = 1;
      return result;
    }

    detected = true;
    if (best > 0 && base) {
      const why =
        base.id === latest.id
          ? "adopted as your version"
          : "treated as your edits";
      log(`  installed version detected by closest match: ${lines}, ${why}`);
    }
  }

  if (!base) throw new Error("Could not determine the installed version");

  const lockEntry = { version: latest.id, fetchedAt: latest.fetchedAt };

  if (base.id === latest.id) {
    log(
      `  up to date (${formatDate(latest.fetchedAt)}${detected ? ", detected" : ""})`,
    );
    if (!dryRun) lock.items[specifier] = lockEntry;
    return result;
  }

  log(
    `  installed ${formatDate(base.fetchedAt)}${detected ? " (detected)" : ""} → upstream ${formatDate(latest.fetchedAt)}`,
  );

  const [baseFiles, upstreamFiles] = await Promise.all([
    render(base),
    render(latest),
  ]);
  const local = await readLocalFiles(
    cwd,
    new Set([...baseFiles.keys(), ...upstreamFiles.keys()]),
  );
  const plan = await planFiles(local, baseFiles, upstreamFiles);

  if (plan.problems.length > 0) {
    // Pinning the lock now would make the next sync merge against the
    // wrong base, so leave the item untouched until it's resolved.
    for (const problem of plan.problems) log(problem);
    log(
      `  nothing written for this item${plan.writes.length > 0 ? ` (${pluralize(plan.writes.length, "other file is", "other files are")} waiting)` : ""}.`,
    );
    result.attention = plan.problems.length;
    return result;
  }

  for (const note of plan.notes) log(note);
  if (plan.writes.length === 0) log("  no file changes");

  // Sync only writes files, so report the rest for the user to apply.
  try {
    const requirements = describeRequirements(
      await source.getChanges(base, latest),
      installed,
    );
    for (const line of requirements.lines) log(line);
    result.missing = requirements.missing;
  } catch (error) {
    log(
      `  couldn't check dependency changes: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  if (!dryRun) {
    for (const [file, content] of plan.writes) {
      const target = path.join(cwd, file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content);
    }
    lock.items[specifier] = lockEntry;
  }

  result.conflicts = plan.conflicts;
  return result;
}
