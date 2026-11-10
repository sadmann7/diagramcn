# [diagramcn](https://diagramcn.com)

Update shadcn components without losing your edits, and mix items from any registry.

`shadcn add` can only keep your copy or overwrite it. `diagramcn sync` merges what changed upstream into the components you've edited. The site tracks every version of registry items, and a canvas shows how items from different registries fit together before you install them.

## Features

- [x] `diagramcn sync`: three-way merges upstream changes into your edited copies, detects the version you installed, and lists new packages, registry dependencies, and CSS and env var changes ([CLI](packages/cli/README.md))
- [x] Item pages (`/@shadcn/button`) with every version, what changed, and per-file diffs. `@shadcn` history goes back to early 2025
- [x] `/changes` and RSS feeds for items, registries, and canvases (including everything they depend on)
- [x] Canvas: lay out items from any registry in the [shadcn directory](https://ui.shadcn.com/r/registries.json), with everything they pull in. Conflicts (same file, different CSS or env values, clashing package ranges) are drawn as red edges
- [x] One install command for a canvas, and short links that always install the same items
- [x] Every shadcn style: Base UI, React Aria and Radix in eight looks each (nova, vega, maia, lyra, mira, luma, sera, rhea), plus the legacy `new-york-v4` and Tailwind v3 styles. `base-nova` is the default, as in `shadcn init`. Pick one with `?style=` on item pages, the canvas and `/changes`; the CLI reads yours from `components.json`

## Routes

| Route                       | Description                                   |
| --------------------------- | --------------------------------------------- |
| `/`                         | What sync does, item lookup, recent upstream changes |
| `/@namespace/item`          | Item page: versions, changes, install and sync commands |
| `/url?q=<item url>`         | The same for items known only by URL |
| `/canvas?q=<items>`         | Canvas: items, what they pull in, conflicts, one install command |
| `/s/<id>`                   | A saved canvas behind a short link (never changes) |
| `/r/<id>.json`              | A saved canvas as one registry item: `npx shadcn add https://diagramcn.com/r/<id>.json` |
| `/changes`                  | Recent changes across tracked items, filterable by registry (`?namespace=`) or items (`?q=`) |
| `/changes/feed.xml`         | RSS for the same |
| `/api/stack?q=<items>`      | One registry item that installs every item, for `shadcn add <url>` |
| `POST /api/stacks`          | Save a canvas (`{ "q": "<items>" }`), returns its short id |
| `/api/registries`           | Registries in the shadcn directory, ranked |
| `/api/registries/items?namespace=@ns` | Items a registry publishes in its index |
| `/api/history/diff?snapshot=<id>` | File diffs between a version and the one before it |
| `/api/sync/versions?specifier=@ns/item` | Stored versions of an item, for the CLI |
| `/api/sync/changes?from=<id>&to=<id>` | Dependency, CSS and env var changes between two versions, and what the newer one needs |
| `/r/v/<versionId>.json`     | One exact stored version as an installable item |

`POST /api/stacks` and `/api/sync/versions` are rate-limited per client IP (counters in Postgres, cleared by the daily crawl) and return `429` with `Retry-After` when over the limit.

`?style=` picks the `@shadcn` style on item pages, the canvas and `/api/sync/versions` (default `base-nova`). On `/changes` and its feeds it filters, and every style is shown without it.

## Project structure

A [Better-T-Stack](https://better-t-stack.dev) style monorepo: pnpm workspaces, [Turborepo](https://turbo.build) and a pnpm catalog for shared versions.

```
apps/
  web/        Next.js app: pages, API routes, registry resolving, change tracking
packages/
  cli/        the `diagramcn` CLI, published to npm
  db/         Drizzle schema, client and migrations (`@diagramcn/db`)
  ui/         shadcn/ui components in the `base-nova` style, on Base UI (`@diagramcn/ui`)
  config/     shared TypeScript config
```

Add a shadcn component to the shared UI package:

```bash
cd packages/ui && pnpm dlx shadcn@latest add <component>
```

and import it in the app as `@diagramcn/ui/components/<component>`.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org)
- **Monorepo:** [Turborepo](https://turbo.build) with pnpm workspaces
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com) (`base-nova`) on [Base UI](https://base-ui.com)
- **Canvas:** [React Flow](https://reactflow.dev)
- **Database:** [PlanetScale](https://planetscale.com) Postgres with [Drizzle](https://orm.drizzle.team)
- **Validation:** [Zod](https://zod.dev)

## Getting Started

```bash
pnpm install
cp apps/web/.env.example apps/web/.env
pnpm dev                # every app, through Turborepo
pnpm dev:web            # just the web app
```

Open [http://localhost:3000](http://localhost:3000).

Other tasks run through Turborepo too: `pnpm build`, `pnpm test`, `pnpm check-types`. `pnpm check` runs lint, format and type checks.

## Change tracking

diagramcn snapshots registry items so it can show what changed upstream. It is optional: without `DATABASE_URL` the rest of the app works and tracking is skipped.

- **What's tracked:** every `@shadcn` item in `base-nova` (the default) and `new-york-v4` (legacy, but what most existing projects use), plus any item someone opens, syncs, or puts on a canvas. `@shadcn` items are tracked per style, since each style serves different files; other styles start being tracked the first time someone uses them.
- **How:** a daily Vercel cron (`/api/cron/crawl`, see `vercel.json`) re-fetches tracked items, least recently checked first, and stores a snapshot only when the content hash changes. Item pages and canvases also record the items they resolve.
- **History:** item pages have a History tab with every version since tracking started, what changed (files, dependencies, CSS and env vars, other fields), and line diffs per file.
- **Following changes:** `/changes` lists every change, and each item, canvas and registry has an RSS feed. Feeds for items and canvases include everything they depend on, since a change to `button` affects every canvas that uses it.
- **Older versions:** `@shadcn` items in `new-york-v4` also get their history imported from shadcn/ui's git repo (files only, marked `origin: git`), so projects installed before tracking began still have a merge base. The other styles are generated from shared sources at build time, so their history starts when tracking does. A few items are imported per daily crawl; set `GITHUB_TOKEN` to raise GitHub's 60-requests-an-hour limit.
- **Storage:** Postgres (PlanetScale in production). `items` holds one row per item, `snapshots` one row per distinct version, and `blobs` each file's content once per sha256. `rate_limits` holds the API's request counters.

Local setup:

```bash
cp apps/web/.env.example apps/web/.env    # then adjust ports or set CRON_SECRET
pnpm db:start           # Postgres in Docker
pnpm db:migrate         # apply migrations from packages/db/drizzle
pnpm crawl              # run a crawl now (optionally: pnpm crawl 100)
pnpm db:studio          # browse the data
```

After changing `packages/db/src/schema.ts`, run `pnpm db:generate` to create a migration. The db scripts read `DATABASE_URL` from `apps/web/.env`.

## Tests

```bash
pnpm test               # node:test via tsx, in every package
```

Covers the CLI's merge, version detection and dependency report, canvas conflict detection, version comparison, and input parsing. The rate-limit test runs against `DATABASE_URL` and is skipped without it.

In production, set `DATABASE_URL` (PlanetScale Postgres) and `CRON_SECRET` in the Vercel project, then run `pnpm db:migrate` against the production database once.

## CLI

`packages/cli` is the `diagramcn` CLI. `diagramcn sync button` merges upstream changes into an edited component instead of overwriting it, using the stored versions as the merge base. See [its README](packages/cli/README.md).

```bash
pnpm cli sync button --server http://localhost:3000   # run from source
pnpm cli:build                                         # build to packages/cli/dist
pnpm -F diagramcn test                                 # its tests
```

Publishing: `cd packages/cli && pnpm publish` (builds first).

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Base UI Documentation](https://base-ui.com)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

Set the Vercel project's **Root Directory** to `apps/web`. Vercel detects the pnpm workspace and Turborepo from there, and `apps/web/vercel.json` holds the daily crawl cron.

## Credits

- [jsoncrack.com](https://github.com/AykutSarac/jsoncrack.com) - For the json parser, node layout.
