# Making and switching the Codex patch

ProtoWiki holds at most one Codex patch, flat in `patches/codex/`. Making a new
one replaces the old one.

**Pure Gerrit only:** `npm run codex:patch` is the sole way to write
`patches/codex/`. Never edit `.patch` files or `node_modules` to change the
patch. If the Gerrit change has bugs, work around them in the prototype's surface CSS
(`<prototype>-surface.css` — see
[building-for-patches.md → Where patch-aware CSS lives](building-for-patches.md#where-patch-aware-css-lives))
or report on Gerrit.

## Make a patch from a Gerrit change

```bash
npm run codex:patch -- https://gerrit.wikimedia.org/r/c/design/codex/+/1304941
npm run codex:patch 1304941   # change number works too ( -- optional for bare numbers )
```

The command:

1. Puts `node_modules` on stock Codex (snapshot restore, or a reinstall).
2. Fetches the change's current patchset into a cache checkout
   (`$TMPDIR/protowiki-codex-gerrit-cache`, reused across runs).
3. Resolves the baseline: the release tag of the **installed** Codex
   (e.g. `v2.7.0`), so the diff spans published → change and applies to the npm
   artifact CI installs, even when the change is stacked on unreleased main.
4. Builds Codex twice locally (release tag, then change). This is the slow part,
   and the only place Codex is ever built.
5. Finds every distributed file (`dist/**` plus root `theme-*` token files)
   that differs between the two builds. The footprint is detected, not a fixed
   list, so any current or future import sees the change.
6. For each file: formats published / unpatched / patched with the committed
   Prettier config, 3-way merges, and diffs `format(published)` → merged.
   Formatting makes the minified single-line CSS diff by content, not file size.
7. Replaces the contents of `patches/codex/`, then applies the patch locally the
   same way CI does.

Commit `patches/codex/`. The next pull request preview and (after merge)
production will use it.

**New patchset on Gerrit?** Re-run the same command — safe, nothing is lost.
**Bumped Codex or Prettier?** Re-run it too: the patch is anchored to a specific
published version, and the applier refuses a file whose formatted content no
longer hashes to the recorded baseline.

## How applying works

`postinstall` runs `scripts/apply-codex-patch.mjs`, which calls
`ensureCodex()` (`scripts/lib-codex-state.mjs`):

| `CODEX_PATCH` | Installs |
| --- | --- |
| unset | patched if `patches/codex/manifest.json` exists, otherwise stock |
| `off` / `stock` | published Codex |

For each manifest file it formats the installed file, checks the content hash
equals `baseSha`, applies the diff with jsdiff, and checks the result equals
`patchedSha`. It computes every file before writing any, so a failure leaves
`node_modules` stock. On success it writes the marker
(`node_modules/@wikimedia/codex/.protowiki-codex-patch.json`). "No marker"
always means "stock".

Before the first apply, the published packages (~15 MB) are copied to
`node_modules/.cache/protowiki-codex-stock/`. Later switches restore from there
instead of reinstalling. `npm ci` wipes it, and the next apply takes a fresh copy.

## Switch locally

```bash
npm run codex:use-stock     # published Codex
npm run codex:use-patch     # the committed patch
```

Restart `npm run dev` afterwards.

## Remove the patch

```bash
npm run codex:reset
```

Deletes the patch from `patches/codex/` and puts `node_modules` back on stock.
Commit the deletion and deploys go back to stock Codex.
