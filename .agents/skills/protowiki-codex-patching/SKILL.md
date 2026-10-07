---
name: protowiki-codex-patching
description: Trial an unmerged Codex (Gerrit) change in ProtoWiki and build UI that follows it automatically — the single committed patch in patches/codex/ (pure Gerrit output from npm run codex:patch only), switching node_modules between stock and patched (npm run codex:use-stock / codex:use-patch), side-by-side stock/patched deploys and PR previews (npm run build:variants), the home-screen Codex patch message, the html[data-codex-patched] gate, and the rules for writing prototype CSS that inherits from Codex instead of copying it. Use when adding or switching a Codex patch, comparing stock vs patched, deploying a patch, debugging "the patch isn't showing up", or styling anything that should track Codex changes.
---

# Codex patches in ProtoWiki

ProtoWiki can run an **unmerged Codex change** — locally, in pull request
previews and in production — without publishing a package. A patch is a small
committed text diff against published Codex. `postinstall` applies it in a few
seconds; nothing builds Codex in CI.

The other half of this skill is **building so patches flow through**: a
prototype written against Codex components and tokens picks up a patched Codex
with no edits. A prototype that copies Codex visuals keeps showing the old
design, and nobody notices until someone compares side by side.

## Mental model

```
patches/codex/
  manifest.json   change, patchset, subject, hashes
  *.patch         one small diff per changed Codex file
```

- **`patches/codex/` is pure Gerrit output.** `npm run codex:patch -- <url>` is
  the only way to write it. Never edit `node_modules` or `.patch` files by hand.
  If the change has bugs, fix them in prototype CSS or report on Gerrit.
- There are only two versions: **stock** (published Codex) and **patched**
  (published Codex plus the one committed patch).
- If `patches/codex/` holds a patch, `npm install`, `npm run build` and every
  deploy use patched Codex. With no patch, everything is stock.
- The installed state is recorded in a marker file inside
  `node_modules/@wikimedia/codex`. Vite reads it at startup and exposes:
  - `__CODEX_PATCH__` → `html[data-codex-patched="<change>"]` (set in `src/theme.ts`)
  - `__CODEX_BUILD__` → Codex version, patch details, the sibling build (drives
    `CodexPatchMessage` on the home screen)

## Commands

| Command | Does |
| --- | --- |
| `npm run codex:use-stock` | Install published Codex (keeps `patches/codex/`) |
| `npm run codex:use-patch` | Install the committed patch |
| `npm run codex:patch -- <gerrit-url>` | Build a Gerrit change locally and write it to `patches/codex/`, replacing any previous patch |
| `npm run codex:reset` | Delete the patch; everything goes back to stock |
| `npm run build:variants` | One deploy with patched at the root and stock under `codex/stock/` |

Switching is fast: stock is restored from a snapshot in
`node_modules/.cache/protowiki-codex-stock/`, and applying the patch is a text
pass. **Restart `npm run dev` after every switch.** Vite pre-bundles Codex and
reads the marker only at startup. The scripts clear `node_modules/.vite` for you.

Details: [making patches](references/making-patches.md) ·
[deploying patches](references/deploying-patches.md).

## Building so Codex changes flow through

Applies to every prototype, not only ones being tested against a patch. The rules
are ordered: reach for the first one that works.

**Surface stylesheet.** Alias tokens (`--my-card-border-color--hover`, …) and
rules that target a **child component's root** (e.g. `CdxMenu` thumbnails) go
in an unscoped `<prototype>-surface.css` imported from the route entry, with
every selector prefixed by a prototype root class (e.g. `.my-prototype`).
Overlay-link card hover uses aliases in the surface file plus `:deep(.cdx-card)`
on the wrapper in the card SFC. Layout and `:deep()` on **direct-child** Codex
nodes can stay scoped. See [building-for-patches](references/building-for-patches.md).

1. **Use the Codex component, not a lookalike.** If a design is "almost
   `CdxToggleButton`", render `CdxToggleButton` and override only the delta
   (e.g. `font-weight`, the toggled-on colour), with one comment saying why.
   Re-styling a different component (`CdxTabs` dressed up as toggle buttons)
   means copying every state by hand, and a patch to the real component never
   reaches it.
2. **Wear Codex classes on hand-built markup.** If you can't use the component
   (e.g. a card with nested links), put `cdx-card cdx-card--is-link` on the root
   so Codex's stylesheet paints border, radius, hover and active. Your CSS keeps
   layout only.
3. **Remap tokens rather than restyling properties.** To theme a subtree,
   re-point tokens (`--color-progressive`,
   `--background-color-interactive-subtle--hover`, …) on a wrapper; don't set
   `color` / `background-color` on Codex internals. A remap only shows up where
   the installed Codex already reads that token. So if a patch removes a hover
   background, your theme drops it too, with no gate needed.
4. **Tokens, never literals that equal a token.** Radius, spacing, border width
   and style, transition duration, touch size, colours. No hex fallbacks in
   `var()`: a fallback silently survives a token rename.
5. **Size the root, let Codex fill it.** Set width/height on a component's
   root (`.cdx-thumbnail`), never on its inner layers. Inner sizing is exactly
   what patches change.
6. **Gate only what you can't inherit.** Some rules exist only to undo a
   stock-Codex behaviour (e.g. `box-shadow: none` on popovers). Put those behind
   `html:not([data-codex-patched])`. Rules that mirror Codex for wrapper-driven
   states (a sibling overlay link means Codex's own `:hover` never matches) need
   a stock block plus an `html[data-codex-patched]` block. Gates are the last
   resort: each one is a copy you must update when the patch changes.

Worked examples (surface file layout, filter tabs, thumbnails, search hover,
overlay-link card hover with stock/patched alias blocks):
[references/building-for-patches.md](references/building-for-patches.md).

## Verify on both

A change isn't done until it looks right on **stock and patched**:

```bash
npm run codex:use-stock   && npm run dev   # check, screenshot
npm run codex:use-patch && npm run dev   # check, screenshot, compare
```

Or deploy a preview (or run `npm run build:variants` + `npm run preview`) and
open each build from the Codex patch message on the home screen (stock lives under
`codex/stock/`).

## Pitfalls (each has bitten us)

- **"The patch isn't showing."** Run `npm run codex:use-patch`, then restart the
  dev server. `npm install` re-applies the patch, so a stray install undoes a
  manual `codex:use-stock`.
- **Bundle vs module CSS can diverge upstream.** `codex.style.css` and
  `dist/modules/Cdx*.css` are separate build artifacts. ProtoWiki imports the
  bundle (`codex.style.css`). If a component looks half-patched, compare its
  rules in both files — fix in prototype CSS or report on Gerrit, not in
  `patches/codex/`.
- **Scoped CSS doesn't reach child component roots.** A `<style scoped>` rule
  like `.my-menu :deep(...)` only matches if `.my-menu` carries your scope id.
  A Codex child component's root (e.g. `CdxMenu`) doesn't. Put such rules in the
  prototype surface stylesheet (see [building-for-patches](references/building-for-patches.md)).
- **`data-theme` islands reset tokens.** A subtree with its own `data-theme`
  gets fresh Codex tokens, so remaps from outside don't reach it. Re-apply them
  inside the island.
- **Never hand-edit `.patch` hunks.** One wrong context line and the applier
  refuses the file. Re-run `npm run codex:patch -- <url>` instead.
- **Deep links into a variant** (`…/codex/stock/some-route`) depend on the
  site-root `404.html`, which only `main` deploys write. Deploy `main` once after
  changing the redirect scripts.

## Related skills

- [`protowiki-update-codex`](../protowiki-update-codex/SKILL.md) — bumping the
  published Codex version (regenerate the patch afterwards).
- [`protowiki-deploy`](../protowiki-deploy/SKILL.md) — GitHub Pages, base paths,
  previews.
- [`codex-usage`](../codex-usage/SKILL.md) — components first, tokens second,
  custom CSS last.
