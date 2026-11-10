# diagramcn

Pull upstream changes to [shadcn](https://ui.shadcn.com) registry items into your project without losing your edits.

`shadcn add` can only keep your copy or overwrite it. `diagramcn sync` does a three-way merge instead: it takes what changed upstream since the version you installed and applies it on top of your file. Edits that touch the same lines as upstream get standard conflict markers.

```bash
npx diagramcn sync button @magicui/marquee
```

## How it works

1. [diagramcn.com](https://diagramcn.com) keeps every version of tracked registry items.
2. The installed version comes from `diagramcn-lock.json`. On the first sync, it's detected by comparing your files to each stored version. `@shadcn` items have versions back to early 2025, imported from shadcn/ui's git history. If your files match no version closely and the nearest is the latest, sync stops rather than guess: run again with `--adopt` if the differences are your own edits.
3. The shadcn CLI installs both the installed and the latest version into a throwaway copy of your project config (`components.json`, `tsconfig.json`, and so on), so both come out with your aliases and formatting. Nothing is installed in your project.
4. `git merge-file` merges your file with upstream's changes.
5. `diagramcn-lock.json` records the version you're now on. Commit it.

## Usage

```
diagramcn sync [items...] [options]

Arguments:
  items              Items to sync, e.g. button @magicui/marquee.
                     Defaults to every item in diagramcn-lock.json.

Options:
  --dry-run          Show what would change without writing files
  --adopt            When your files differ from every known version, treat
                     the differences as your edits to the latest version
  --cwd <dir>        Project directory (default: current directory)
  --server <url>     diagramcn server (default: https://diagramcn.com)
```

Bare names like `button` mean `@shadcn/button`. Items are tracked from the first time anyone inspects or syncs them, so history (and merging) starts then.

Sync only writes files. When the new version needs npm packages your `package.json` doesn't have, adds a registry dependency, or changes CSS or env variables, it lists them and ends with the install command:

```
@shadcn/button
  installed Dec 12, 2025 (detected) → upstream Nov 10, 2026
  ✓ components/ui/button.tsx  merged, kept your edits
  + cn  needed upstream, not installed
  + radix-ui  needed upstream, not installed

Install the new dependencies:
  npm install cn radix-ui
```

If upstream adds a file at a path where you already have a different file, sync leaves the whole item untouched and tells you, rather than overwrite yours.

Requires Node 20+ and git. Commit your work before syncing, so you can review the merge with `git diff`.
