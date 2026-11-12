# Review

diagramcn fetches any shadcn registry item a visitor points it at, on the server, and draws it in the browser. Failure means a registry that won't render, a diagram that misstates an item's files or dependencies, or a crafted registry that runs script on diagramcn.com or makes the server fetch something it shouldn't.

## Checks

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`.
- `pnpm build` when anything under `src/app` changes.

## What to look for

- **Untrusted registry data.** Every string in a registry item comes from a URL someone else controls. It reaches the page as text, never as HTML; `dangerouslySetInnerHTML` and `innerHTML` with registry content are findings unless the content is escaped first. Mermaid stays on `securityLevel: "strict"`.
- **Server-side fetches.** `api/registry` and `api/generate` fetch URLs from the request and from `registryDependencies`. A change that widens what they fetch, follows more redirects, or returns more of the upstream response is a finding.
- **Schema drift.** `src/lib/validations/registry.ts` is a hand-kept copy of shadcn's registry schema. A field or item type shadcn accepts and this schema rejects breaks real registries; compare with upstream when touching it.
- **Command parsing.** `parseRegistryCommand` turns a pasted `shadcn add` command into a URL. Namespaced items (`@acme/button`), other package managers and styles other than `default` should resolve or fail with a clear message, not fetch the wrong item.
- **Diagram accuracy.** The JSON view (`json-parser`, `traverse`, `diagram`) and the Mermaid view describe the same item. A node, edge or file type one view shows and the other drops is a bug.
- **Mobile and dark mode.** The toolbar, editor panel and node dialog work at phone width and in both themes.

## Skip

- Formatting and lint-enforced style.
- `pnpm-lock.yaml`, `src/components/ui` (shadcn/ui primitives) and `src/assets/themes`.
- The prompt text in `api/generate`, unless the change alters the diagram's structure.

## Format

- Start with a count: `N important, N nit, N pre-existing`. Say plainly when nothing needs fixing.
- Every finding gives `file:line` and the input or state that breaks.
- At most three nits.
