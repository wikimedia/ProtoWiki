#!/usr/bin/env node
// postinstall hook: apply the committed Codex patch (patches/codex/), if any.
//
//   CODEX_PATCH unset      patched when a patch is committed, otherwise stock
//   CODEX_PATCH=off|stock  published Codex
//
// Applying is a fast text pass (format the published file with the pinned
// Prettier, apply the committed diff, check content hashes) — never a Codex
// build — so CI and PR previews stay fast. Authoring lives in patch-codex.mjs.

import { wantsPatch } from './lib-codex-patch.mjs'
import { ensureCodex } from './lib-codex-state.mjs'

try {
  await ensureCodex(wantsPatch())
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}
