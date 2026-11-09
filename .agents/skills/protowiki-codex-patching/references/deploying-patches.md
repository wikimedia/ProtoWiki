# Deploying the Codex patch

## What each deploy builds

| Workflow | Command | Result |
| --- | --- | --- |
| Production (`deploy.yml`, push to `main`) | `npm ci && npm run build` | Patched at site root + stock under `codex/stock/` when `patches/codex/` holds a patch; single stock build otherwise |
| Pull request preview (`preview.yml`) | `npm ci && npm run build` | Same layout under `pr-preview/pr-N/` (patched root, `pr-preview/pr-N/codex/stock/` when patched) |

`npm run build` runs `scripts/build-codex-variants.mjs`. For a fast single-bundle
local debug only, use `npm run build:vite`.

So **production follows `patches/codex/`**. Merging a branch with a committed
patch ships patched Codex to production, and the on-page label says so. To stop
deploying it, run `npm run codex:reset` and commit the deletion.

## Side by side

When a patch is committed, `npm run build` produces patched Codex at the base
path and stock under `codex/stock/`:

```
/                              patched (e.g. Gerrit 1304941)
/codex/stock/                  published Codex

pr-preview/pr-7/               patched (preview)
pr-preview/pr-7/codex/stock/   published Codex (preview)
```

Both come from one `npm ci`: stock is restored from the snapshot, then each is a
normal Vite build. With no patch committed it's one ordinary stock build. The
job summary lists the paths.

Reproduce locally:

```bash
PROTOWIKI_BASE=/protowiki/pr-preview/pr-7/ npm run build
PROTOWIKI_BASE=/protowiki/pr-preview/pr-7/ npm run preview
# open http://localhost:4173/protowiki/pr-preview/pr-7/
```

`vite preview` falls back to the root `index.html` for unknown paths, so open
the stock build from its own index (`…/codex/stock/`) locally. On GitHub Pages,
deep links work via `404.html`.

## The Codex patch message

`src/components/CodexPatchMessage.vue` is a notice `CdxMessage` on the
**ProtoWiki home screen only**, below the page heading (never inside a
prototype). It shows whenever the build is patched or has a stock sibling.

It states whether this bundle runs stock or a modified Codex (with version).
Variant switching is in the **Codex settings** popover (toolbar Codex icon), not
in this message.

It can be dismissed for the current page visit only (nothing is stored). Stock-only
builds with no sibling show nothing.

It reads build info via `useCodexBuild()` (`__CODEX_BUILD__` at build time, or
the dev build-info endpoint after a local toggle).

## The Codex settings menu

On the same **ProtoWiki home screen**, the toolbar Codex icon (left of
Appearance) opens `CodexSettingsPanel` in a popover. Shared logic lives in
`src/composables/useCodexBuild.ts`.

**Dev and deployed builds show the same core UI:**

- A status line: installed `@wikimedia/codex` version and whether this bundle is
  stock or patched.
- When `patches/codex/` holds a committed patch: a toggle to enable or disable
  the patch for this session (Gerrit subject link when applicable, and
  `+N stacked changes` when the manifest records a submitted-together stack).

**How the toggle works:**

- **GitHub Pages (production and PR previews):** navigates to the sibling static
  bundle (`PROTOWIKI_CODEX_VARIANTS` from `build-codex-variants.mjs` — e.g. root
  ↔ `codex/stock/`).
- **Local `npm run dev`:** `POST /__protowiki/codex/switch` mutates
  `node_modules`, then the page reloads.

Before navigation or reload, the popover sets `sessionStorage` so it reopens after
boot.

**Local dev only** (`import.meta.env.DEV`): instructions and copyable commands to
install a patch (`npm run codex:patch [ID]`) or uninstall (`npm run codex:reset`).
Deployed builds omit those blocks.

## Local dev switch

When `patches/codex/` holds a patch and you run **`npm run dev`**, Vite
synthesizes stock/patched siblings (see `scripts/lib-codex-build-info.mjs`) and
registers dev-only routes:

- `GET /__protowiki/codex/build-info` — fresh `CodexBuildInfo` from disk
- `POST /__protowiki/codex/switch` — `ensureCodex`, clear the Vite dep cache,
  invalidate `@wikimedia/codex` modules; the client then reloads the page on success

Deploy previews use URL siblings only; they do not use the dev switch endpoint.

## Deep links into the stock build

GitHub Pages serves only the **site-root** `404.html` for unknown paths.
`public/gh-pages-preview-404.js` (prepended to it) recognises `…/pr-preview/pr-N/`,
`…/pr-preview/pr-N/codex/stock/` and `…/codex/stock/`. It stashes the remaining
path and redirects to that base's index, where `public/gh-pages-restore.js`
restores it before Vue Router starts. Keep the regex identical in both files.

The `codex/stock/` build skips writing `404.html` (only the root one is ever
served). Previews never update the root file, so after changing these scripts,
deploy `main` once before testing preview deep links.
