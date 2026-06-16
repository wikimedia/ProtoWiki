# Testing a Codex Gerrit patch in ProtoWiki

Use this when you want to trial an unmerged `design/codex` change in ProtoWiki without publishing a package.

## Commands

Apply the current patchset for a change:

```bash
npm run patch-codex -- https://gerrit.wikimedia.org/r/c/design/codex/+/1288878
```

The command:

- reads Gerrit metadata for the given change
- fetches the current patchset into a local cache checkout
- builds `design/codex`
- packs and installs local tarballs for all three packages:
  - `@wikimedia/codex`
  - `@wikimedia/codex-design-tokens`
  - `@wikimedia/codex-icons`

Reset to normal registry-resolved packages:

```bash
npm run patch-codex:reset
```

## Why all three packages are patched together

ProtoWiki consumes all three Codex packages directly, and `@wikimedia/codex` depends on matching icon/token outputs. Keeping them in lockstep avoids mixed-version visual bugs.

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

- The cache checkout lives under your system temp directory (`$TMPDIR/protowiki-codex-gerrit-cache` on macOS).
- This workflow uses `npm install --no-save`, so it does not intentionally rewrite dependency ranges in `package.json`.
