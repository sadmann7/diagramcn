# [diagramcn](https://diagramcn.com)

See what `shadcn add` does before you run it.

Paste a command, an item, or a URL and get the fully resolved install plan for any shadcn/ui registry item, across registries.

## Features

- [x] Accepts `npx shadcn@latest add ...` commands (any package manager), namespaced items (`@acme/foo`), bare names, and item URLs, including several at once
- [x] Resolves the full `registryDependencies` tree across registries, using the [shadcn registry directory](https://ui.shadcn.com/r/registries.json)
- [x] Install plan: every file and its target path, npm and dev dependencies, CSS variables and rules, env vars, and fonts
- [x] Findings: file conflicts between items, version conflicts, CSS variable overrides, undeclared dependencies, missing targets or content, and risky code (eval, child_process, fs, outbound requests, writes outside the project)
- [x] Item graph and file graph (built from real imports), with PNG export
- [x] Interactive JSON tree for each item
- [x] Permalinks (`/@shadcn/sidebar-07`), OG images, and README badges

## Routes

| Route                       | Description                                   |
| --------------------------- | --------------------------------------------- |
| `/stack?q=<input>`         | Stack builder: pick items, check conflicts, get one install command |
| `/changes`                 | Recent changes across tracked items, filterable by registry (`?namespace=`) or items (`?q=`) |
| `/changes/feed.xml`        | RSS for the same: all changes, `?namespace=@ns`, or `?q=<items>` (includes their dependencies) |
| `/s/<id>`                  | A saved stack behind a short link (never changes) |
| `/r/<id>.json`             | A saved stack as one registry item: `npx shadcn add https://diagramcn.com/r/<id>.json` |
| `/@namespace/item`          | Permalink for a single item                   |
| `/inspect?q=<input>`        | Any input: commands, multiple items, URLs     |
| `/api/inspect?q=<input>`    | Resolved graph and install plan as JSON       |
| `/api/stack?q=<input>`      | One registry item that installs every item, for `shadcn add <url>` |
| `POST /api/stacks`         | Save a stack (`{ "q": "<items>" }`), returns its short id |
| `/api/registries`          | Registries in the shadcn directory, ranked |
| `/api/registries/items?namespace=@ns` | Items a registry publishes in its index |
| `/api/history/diff?snapshot=<id>` | File diffs between a version and the one before it |
| `/api/sync/versions?specifier=@ns/item` | Stored versions of an item, for the CLI |
| `/r/v/<versionId>.json` | One exact stored version as an installable item |
| `/api/badge?q=<input>`      | SVG badge with the error or warning count     |
| `/api/og?q=<input>`         | Open Graph image                              |

Optional `?style=` (third-party `{style}` URLs, default `new-york`) and `?shadcnStyle=` (`@shadcn` items, default `new-york-v4`) are supported on every route.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org)
- **Styling:** [Tailwind CSS](https://tailwindcss.com)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com)
- **Diagrams:** [Mermaid](https://mermaid.js.org) and [Reaflow](https://github.com/reaviz/reaflow)
- **Database:** [PlanetScale](https://planetscale.com) Postgres with [Drizzle](https://orm.drizzle.team)
- **Validation:** [Zod](https://zod.dev)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Change tracking

diagramcn snapshots registry items so it can show what changed upstream. It is optional: without `DATABASE_URL` the rest of the app works and tracking is skipped.

- **What's tracked:** every `@shadcn` item in the default style, plus any item someone inspects or adds to a stack.
- **How:** a daily Vercel cron (`/api/cron/crawl`, see `vercel.json`) re-fetches tracked items, least recently checked first, and stores a snapshot only when the content hash changes. Inspections also record the items they resolve.
- **History:** item pages have a History tab with every version since tracking started, what changed (files, dependencies, CSS and env vars, other fields), and line diffs per file.
- **Following changes:** `/changes` lists every change, and each item, stack and registry has an RSS feed. Feeds for items and stacks include everything they depend on, since a change to `button` affects every stack that uses it.
- **Older versions:** `@shadcn` items also get their history imported from shadcn/ui's git repo (files only, marked `origin: git`), so projects installed before tracking began still have a merge base. A few items are imported per daily crawl; set `GITHUB_TOKEN` to raise GitHub's 60-requests-an-hour limit.
- **Storage:** Postgres (PlanetScale in production). `items` holds one row per item, `snapshots` one row per distinct version, and `blobs` each file's content once per sha256.

Local setup:

```bash
cp .env.example .env    # then adjust ports or set CRON_SECRET
pnpm db:start           # Postgres in Docker
pnpm db:migrate         # apply migrations from ./drizzle
pnpm crawl              # run a crawl now (optionally: pnpm crawl 100)
pnpm db:studio          # browse the data
```

After changing `src/db/schema.ts`, run `pnpm db:generate` to create a migration.

In production, set `DATABASE_URL` (PlanetScale Postgres) and `CRON_SECRET` in the Vercel project, then run `pnpm db:migrate` against the production database once.

## CLI

`packages/cli` is the `diagramcn` CLI. `diagramcn sync button` merges upstream changes into an edited component instead of overwriting it, using the stored versions as the merge base. See [its README](packages/cli/README.md).

```bash
pnpm cli sync button --server http://localhost:3000   # run from source
pnpm cli:build                                         # build to packages/cli/dist
```

Publishing: `cd packages/cli && npm publish` (builds first).

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Reaflow Documentation](https://github.com/reaviz/reaflow)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Credits

- [jsoncrack.com](https://github.com/AykutSarac/jsoncrack.com) - For the json parser, node layout.
