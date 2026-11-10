import { spawnSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export interface MergeResult {
  content: string;
  conflicts: number;
}

/**
 * Three-way merge with `git merge-file`: applies what changed from `base`
 * to `upstream` on top of `local`, keeping local edits. Overlapping edits
 * get standard conflict markers.
 */
export async function mergeFile(
  local: string,
  base: string,
  upstream: string,
): Promise<MergeResult> {
  const dir = await mkdtemp(path.join(tmpdir(), "diagramcn-merge-"));

  try {
    const files = {
      local: path.join(dir, "local"),
      base: path.join(dir, "base"),
      upstream: path.join(dir, "upstream"),
    };
    await Promise.all([
      writeFile(files.local, local),
      writeFile(files.base, base),
      writeFile(files.upstream, upstream),
    ]);

    const result = spawnSync(
      "git",
      [
        "merge-file",
        "-p",
        "-L",
        "local",
        "-L",
        "installed version",
        "-L",
        "upstream",
        files.local,
        files.base,
        files.upstream,
      ],
      { encoding: "utf8" },
    );

    if (result.error) {
      throw new Error(
        `git is required to merge files: ${result.error.message}`,
      );
    }
    // Exit status is the number of conflicts; negative means it failed.
    if (result.status === null || result.status < 0 || result.status > 127) {
      throw new Error(`git merge-file failed: ${result.stderr}`);
    }

    return { content: result.stdout, conflicts: result.status };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
