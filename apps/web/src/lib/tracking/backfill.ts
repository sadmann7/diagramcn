import { blobs, items, snapshots } from "@diagramcn/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";

import { db as defaultDb, type Db } from "@/db";
import { env } from "@/env";
import { SHADCN_NAMESPACE } from "@/lib/registry/specifier";
import { DEFAULT_SHADCN_STYLE } from "@/lib/registry/styles";
import { stableStringify } from "@/lib/stable-stringify";
import { getSnapshotFiles, type SnapshotItem } from "@/lib/tracking/compare";
import { sha256 } from "@/lib/tracking/snapshot";

// Built item JSON stopped being committed in July 2026, but item files are
// served exactly as they appear in the source tree, so their git history is
// the item's history.
const REPO = "shadcn-ui/ui";
const SOURCE_ROOT = "apps/v4/";
const MAX_COMMITS_PER_FILE = 100;
const TIMEOUT_MS = 10_000;

interface Commit {
  sha: string;
  date: string;
}

export class GitHubRateLimitError extends Error {
  constructor() {
    super("GitHub API rate limit reached");
    this.name = "GitHubRateLimitError";
  }
}

async function fetchFileCommits(path: string): Promise<Commit[]> {
  const url = `https://api.github.com/repos/${REPO}/commits?path=${encodeURIComponent(path)}&per_page=${MAX_COMMITS_PER_FILE}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      ...(env.GITHUB_TOKEN
        ? { authorization: `Bearer ${env.GITHUB_TOKEN}` }
        : {}),
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });

  if (response.status === 403 || response.status === 429) {
    throw new GitHubRateLimitError();
  }
  if (!response.ok) throw new Error(`GitHub API: HTTP ${response.status}`);

  const data = (await response.json()) as {
    sha: string;
    commit: { committer: { date: string } };
  }[];
  return data.map((entry) => ({
    sha: entry.sha,
    date: entry.commit.committer.date,
  }));
}

async function fetchFileAt(sha: string, path: string) {
  const response = await fetch(
    `https://raw.githubusercontent.com/${REPO}/${sha}/${path}`,
    { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" },
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub raw: HTTP ${response.status}`);
  return response.text();
}

export type BackfillResult =
  | { status: "skipped"; reason: string }
  | { status: "done"; added: number };

/**
 * Imports older versions of an `@shadcn` item from shadcn/ui's git history,
 * so projects installed before tracking started still have a merge base.
 * Imported versions only contain files (`origin: "git"`).
 */
export async function backfillItem(
  specifier: string,
  db: Db | null = defaultDb,
): Promise<BackfillResult> {
  if (!db) return { status: "skipped", reason: "no database" };

  const [item] = await db
    .select()
    .from(items)
    .where(
      and(
        eq(items.specifier, specifier),
        eq(items.style, DEFAULT_SHADCN_STYLE),
      ),
    )
    .limit(1);

  // Only the default style's files are in git as served. The others are
  // generated from shared sources at build time.
  if (!item) return { status: "skipped", reason: "not tracked" };
  if (item.namespace !== SHADCN_NAMESPACE) {
    return { status: "skipped", reason: "only @shadcn has known history" };
  }
  if (item.backfilledAt) return { status: "skipped", reason: "already done" };

  const [oldest] = await db
    .select()
    .from(snapshots)
    .where(eq(snapshots.itemId, item.id))
    .orderBy(asc(snapshots.fetchedAt))
    .limit(1);

  if (!oldest) return { status: "skipped", reason: "no versions yet" };

  const oldestItem = oldest.item as SnapshotItem;
  const files = getSnapshotFiles(oldestItem);

  // Each file's own history: which commits changed it, and its content then.
  const histories = await Promise.all(
    files.map(async (file) => {
      const sourcePath = `${SOURCE_ROOT}${file.path}`;
      const commits = await fetchFileCommits(sourcePath);
      const versions = await Promise.all(
        commits.map(async (commit) => ({
          ...commit,
          content: await fetchFileAt(commit.sha, sourcePath),
        })),
      );
      return { file, versions };
    }),
  );

  // Every commit that changed any file, oldest first, before tracking began.
  const commits = [
    ...new Map(
      histories
        .flatMap(({ versions }) => versions)
        .map((version) => [version.sha, version] as const),
    ).values(),
  ]
    .filter((commit) => new Date(commit.date) < oldest.fetchedAt)
    .sort((a, b) => a.date.localeCompare(b.date));

  const imported: {
    commit: Commit;
    hash: string;
    item: Record<string, unknown>;
    blobs: Map<string, string>;
  }[] = [];

  for (const commit of commits) {
    const versionBlobs = new Map<string, string>();
    const versionFiles = histories.flatMap(({ file, versions }) => {
      // The file as of this commit: its latest change at or before it.
      const latest = versions
        .filter((version) => version.date <= commit.date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      if (!latest?.content) return [];

      const contentHash = sha256(latest.content);
      versionBlobs.set(contentHash, latest.content);
      return [
        {
          path: file.path,
          type: file.type,
          ...(file.target ? { target: file.target } : {}),
          contentHash,
        },
      ];
    });

    if (versionFiles.length === 0) continue;

    const stored = JSON.parse(
      stableStringify({
        name: oldestItem.name,
        type: oldestItem.type,
        files: versionFiles,
      }),
    ) as Record<string, unknown>;
    const filesKey = stableStringify(versionFiles);

    // Commits that didn't change the files (e.g. renames elsewhere) collapse.
    const previous = imported.at(-1);
    if (previous && stableStringify(previous.item.files) === filesKey) continue;

    imported.push({
      commit,
      hash: sha256(stableStringify(stored)),
      item: stored,
      blobs: versionBlobs,
    });
  }

  // The newest imported version is usually what tracking first saw.
  const oldestFilesKey = stableStringify(
    files.map((file) => ({
      path: file.path,
      type: file.type,
      ...(file.target ? { target: file.target } : {}),
      contentHash: file.contentHash,
    })),
  );
  if (stableStringify(imported.at(-1)?.item.files) === oldestFilesKey) {
    imported.pop();
  }

  const added = await db.transaction(async (tx) => {
    // Claim the item first, so a concurrent backfill inserts nothing.
    const [claimed] = await tx
      .update(items)
      .set({ backfilledAt: new Date() })
      .where(and(eq(items.id, item.id), isNull(items.backfilledAt)))
      .returning({ id: items.id });
    if (!claimed) return 0;

    const allBlobs = new Map(imported.flatMap((version) => [...version.blobs]));
    if (allBlobs.size > 0) {
      await tx
        .insert(blobs)
        .values([...allBlobs].map(([hash, content]) => ({ hash, content })))
        .onConflictDoNothing();
    }

    if (imported.length > 0) {
      await tx.insert(snapshots).values(
        imported.map((version) => ({
          itemId: item.id,
          hash: version.hash,
          item: version.item,
          fetchedAt: new Date(version.commit.date),
          origin: "git" as const,
          commitSha: version.commit.sha,
        })),
      );
    }

    return imported.length;
  });

  return { status: "done", added };
}

/** `@shadcn` items whose history hasn't been imported yet. */
export async function getItemsToBackfill(
  limit: number,
  db: Db | null = defaultDb,
) {
  if (!db) return [];
  const rows = await db
    .select({ specifier: items.specifier })
    .from(items)
    .where(
      and(
        eq(items.namespace, SHADCN_NAMESPACE),
        eq(items.style, DEFAULT_SHADCN_STYLE),
        isNull(items.backfilledAt),
      ),
    )
    .orderBy(asc(items.createdAt))
    .limit(limit);
  return rows.map((row) => row.specifier);
}
