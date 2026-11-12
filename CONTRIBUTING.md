# Contributing Guide

Thank you for investing your time in contributing to diagramcn.

If you have any questions, feel free to reach out to [@sadmann17](https://x.com/sadmann17).

## Project Structure

- `src/app/(registry)`: the registry input, the diagram page and its components.
- `src/app/api`: `registry` fetches a registry item, `generate` turns one into a Mermaid diagram.
- `src/lib`: command parsing, the registry schema, and the JSON-to-diagram code (`json-parser`, `traverse`, `diagram`).
- `src/hooks`: diagram and registry state.
- `src/components/ui`: shadcn/ui primitives.

## Getting started

### Clone the project

```shell
git clone https://github.com/sadmann7/diagramcn
cd diagramcn
```

### Create a new branch

```shell
git checkout -b sadman/add-kickflip
```

### Install dependencies

```shell
pnpm install
```

### Start the dev server

```shell
pnpm dev
```

The Mermaid view calls OpenAI, so set `OPENAI_API_KEY` in `.env.local` to use it. The JSON diagram works without it.

### Check your changes

```shell
pnpm check
pnpm build
```

### Commit your changes

When committing your changes, use the following format:

```text
<type>(<scope>): <description>
```

**Types:**

- `feat` : a new feature
- `fix` : a bug fix
- `refactor` : code change that is neither a feature nor a bug fix
- `perf` : performance improvement
- `style` : formatting, missing semicolons, etc. (no logic change)
- `test` : adding or updating tests
- `docs` : documentation changes only
- `chore` : build process, dependency updates, tooling
- `ci` : continuous integration changes

**Scope:**
Scope your commit to the part of the codebase that is affected, for example `diagram`, `mermaid`, `registry`, `api`, `hooks`, `ui`, `ci`, or `deps`.

Examples:

```shell
git commit -m "fix(registry): accept namespaced items in the add command"
git commit -m "feat(diagram): collapse every node from the toolbar"
```

### Create a pull request

When you're finished pushing your changes, open a pull request. Its title uses the same format, since pull requests are squash-merged.
