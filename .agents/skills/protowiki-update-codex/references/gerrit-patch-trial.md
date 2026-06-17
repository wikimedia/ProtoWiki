# Testing a Codex Gerrit patch in ProtoWiki

Use this when you want to trial an unmerged `design/codex` change in ProtoWiki
— locally **and** on the deployed PR preview — without publishing a package.

The approach commits a small, **deterministic diff** under `patches/codex/`
(no vendored tarballs). All the heavy work (cloning + building Codex) happens on
your machine; CI only re-formats the published Codex files and re-applies the
committed diff at install time, with no Codex build step.

The diff covers the change's **full distribution footprint** — every built file
under `dist/**` plus the root `theme-*` token files that actually differ — not
just the handful ProtoWiki imports today. That keeps the patched `node_modules`
self-contained: any current or future import sees the change, and you never have
to re-run just because you added a new import. Each individual file diff stays
small (formatting normalizes the minified CSS), so even the complete footprint is
a manageable set of text diffs rather than committed tarballs.

## Make the patch

```bash
npm run patch-codex -- https://gerrit.wikimedia.org/r/c/design/codex/+/1288878
```

This is a "make + apply" command. It:

1. Establishes a pristine baseline: deletes any existing `patches/codex/`,
   removes the installed Codex packages, and runs `npm install` so
   `node_modules` holds the real published Codex (the patch's baseline).
2. Fetches the change: reads Gerrit metadata for the current patchset and
   fetches the change commit **and its parent** into a local cache checkout.
3. Builds twice (heavy, local): builds the Codex packages at the **parent**
   commit (unpatched) and at the **change** commit (patched).
4. Detects the footprint: the distributed files (`dist/**` + root `theme-*`)
   that differ between the two builds are exactly what the change touches —
   auto-detected, not a hardcoded list, so it scales to whatever files a change
   touches. Package metadata (`package.json` / `README` / `LICENSE`) is excluded.
5. Builds a tiny per-file diff anchored to the published artifact: it formats the
   published file, the unpatched build, and the patched build with the committed
   Prettier config, 3-way merges so only the unpatched→patched change is layered
   onto the published file, then diffs `format(published)` → merged.
6. Writes the small patches to `patches/codex/*.patch` plus `manifest.json`
   (Codex versions, change id, Prettier version, file list).
7. Applies the patch locally via `scripts/apply-codex-patch.mjs` (the same path
   CI uses), so local == CI.

Commit `patches/codex/`. Because the deploy / preview workflows run
`npm ci && npm run build`, the `postinstall` applier reproduces the change in the
PR preview.

## How it is applied (and why it is small + deterministic)

`scripts/apply-codex-patch.mjs` is wired as `postinstall`, so it runs on every
`npm install` / `npm ci`. For each file in the manifest it:

- re-formats the freshly installed (published) file with the committed Prettier
  config — bypassing `.prettierignore`, since the targets live in `node_modules`;
- applies the committed diff idempotently with `git apply` (it reverse-checks
  first, so re-running is a no-op).

- **Small per file**: formatting both sides normalizes the minified single-line
  `codex.style.css` (one ~170 KB line), so each file's diff is proportional to the
  real change, not the file size. Patching the whole distribution is therefore a
  few thousand lines of text diff total, not megabytes of tarball.
- **Deterministic**: the diff is always applied to the **fixed, integrity-locked
  published artifact** after re-formatting with the **pinned** Prettier (same
  version via the lockfile, same committed `.prettierrc.json`). Same inputs
  everywhere → `git apply` always lands. If it ever can't apply cleanly, the
  applier errors loudly instead of producing a wrong build.
- **No CI build**: the applier is a fast text pass (format + apply), never a
  Codex build.

## Reset

```bash
npm run patch-codex:reset
```

Deletes `patches/codex/`, removes the installed Codex packages, and reinstalls
the registry-resolved packages from the `package.json` ranges. Run this before
merging if the upstream change is not yet released, so the branch does not ship a
patched Codex to production.

## Why all three packages are considered together

ProtoWiki consumes all three Codex packages directly
(`@wikimedia/codex`, `@wikimedia/codex-design-tokens`, `@wikimedia/codex-icons`),
and `@wikimedia/codex` depends on matching icon/token outputs. The footprint
detection inspects all three, so a change touching any of them is captured in
lockstep — avoiding mixed-version visual bugs.

## Suggested smoke-test routes

After applying a patch, run `npm run dev` and inspect:

- `/`
- `/template-homepage`
- `/template-homepage/suggested-edits`
- `/example-event-worklist`
- `/template-article-live`
- `/example-codex-kitchen-sink`

Focus on light/dark theme and desktop/mobile skin states.

## Notes

- The cache checkout lives under your system temp directory
  (`$TMPDIR/protowiki-codex-gerrit-cache` on macOS) and is reused across runs.
- **Regenerate on an upstream bump.** The patch is anchored to a specific
  published Codex version and Prettier version. If you bump `@wikimedia/codex`
  (see [`protowiki-update-codex`](../SKILL.md)) or Prettier, re-run
  `npm run patch-codex -- <url>` to regenerate, then commit the refreshed
  `patches/codex/`. (Same "regenerate on upstream bump" you'd have with
  patch-package.)
- If the Gerrit change gets a new patchset, just re-run `npm run patch-codex`
  to refresh the diff.
- Optimized for token/style/CSS-level changes (the common Codex-trial case). A
  change that significantly alters the bundled JS is still captured, but its
  formatted diff would be larger.
