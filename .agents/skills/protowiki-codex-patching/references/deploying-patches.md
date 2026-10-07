# Deploying the Codex patch

## What each deploy builds

| Workflow | Command | Result |
| --- | --- | --- |
| Production (`deploy.yml`, push to `main`) | `npm ci && npm run build` | Patched Codex if `patches/codex/` holds a patch, stock otherwise |
| Pull request preview (`preview.yml`) | `npm ci && npm run build:variants` | Patched at `pr-preview/pr-N/`, stock at `pr-preview/pr-N/codex/stock/` |

So **production follows `patches/codex/`**. Merging a branch with a committed
patch ships patched Codex to production, and the on-page label says so. To stop
deploying it, run `npm run codex:reset` and commit the deletion.

## Side by side

`npm run build:variants` builds patched Codex at the base path and stock under
`codex/stock/`:

```
pr-preview/pr-7/               patched (e.g. Gerrit 1304941)
pr-preview/pr-7/codex/stock/   published Codex
```

Both come from one `npm ci`: stock is restored from the snapshot, then each is a
normal Vite build. With no patch committed it's one ordinary stock build. The
job summary lists the paths.

Reproduce locally:

```bash
PROTOWIKI_BASE=/protowiki/pr-preview/pr-7/ npm run build:variants
PROTOWIKI_BASE=/protowiki/pr-preview/pr-7/ npm run preview
# open http://localhost:4173/protowiki/pr-preview/pr-7/
```

`vite preview` falls back to the root `index.html` for unknown paths, so open
the stock build from its own index (`…/codex/stock/`) locally. On GitHub Pages,
deep links work via `404.html`.

## The Codex patch message

`src/components/CodexPatchMessage.vue` is a notice `CdxMessage` on the
**ProtoWiki home screen only**, below the page heading (never inside a
prototype). It shows whenever
the build is patched or has a stock sibling:

- patched: ProtoWiki is running with a modified version of Codex. “tokens: Update
  color values” (subject linked), plus “View with stock Codex” in previews;
- the stock preview build: "ProtoWiki is running stock Codex." with a link to
  the patched build.

It can be dismissed for the current page visit only (nothing is stored). Stock-only
builds show nothing.

It reads `__CODEX_BUILD__`, which `vite.config.ts` assembles from the patch
marker, the installed `@wikimedia/codex` version, and
`PROTOWIKI_CODEX_VARIANTS` (set by `build-codex-variants.mjs`).

## Deep links into the stock build

GitHub Pages serves only the **site-root** `404.html` for unknown paths.
`public/gh-pages-preview-404.js` (prepended to it) recognises `…/pr-preview/pr-N/`,
`…/pr-preview/pr-N/codex/stock/` and `…/codex/stock/`. It stashes the remaining
path and redirects to that base's index, where `public/gh-pages-restore.js`
restores it before Vue Router starts. Keep the regex identical in both files.

The `codex/stock/` build skips writing `404.html` (only the root one is ever
served). Previews never update the root file, so after changing these scripts,
deploy `main` once before testing preview deep links.
