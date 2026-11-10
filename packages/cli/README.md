# diagramcn

Pull upstream changes to [shadcn](https://ui.shadcn.com) registry items into your project without losing your edits.

`shadcn add` can only keep your copy or overwrite it. `diagramcn sync` does a three-way merge instead: it takes what changed upstream since the version you installed and applies it on top of your file. Edits that touch the same lines as upstream get standard conflict markers.

```bash
npx diagramcn sync button @magicui/marquee
```

```
@shadcn/button
  installed Nov 3, 2026 (detected) → upstream Nov 10, 2026
  ✓ components/ui/button.tsx  merged, kept your edits
```

## How it works

1. [diagramcn.com](https://diagramcn.com) keeps every version of tracked registry items.
2. The installed version comes from `diagramcn-lock.json`. On the first sync, it's detected by comparing your files to each stored version.
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
  --cwd <dir>        Project directory (default: current directory)
  --server <url>     diagramcn server (default: https://diagramcn.com)
```

Bare names like `button` mean `@shadcn/button`. Items are tracked from the first time anyone inspects or syncs them, so history (and merging) starts then.

Requires Node 20+ and git. Commit your work before syncing, so you can review the merge with `git diff`.
