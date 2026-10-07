#!/usr/bin/env node
// Switch the Codex installed in node_modules.
//
//   npm run codex:use-stock     install published Codex
//   npm run codex:use-patch     install the committed patch (patches/codex/)
//
// Switching never deletes patches/codex/. Restart `npm run dev` afterwards: Vite
// pre-bundles Codex and reads the patch marker only at startup.

import { hasPatch } from './lib-codex-patch.mjs'
import { clearViteCache, ensureCodex } from './lib-codex-state.mjs'

async function switchTo(patched) {
  const changed = await ensureCodex(patched)
  if (changed) clearViteCache()
  const label = patched ? 'patched' : 'stock'
  console.log(
    changed
      ? `Codex is now ${label}. Restart the dev server.`
      : `Codex is already ${label}; nothing to do.`,
  )
}

async function main() {
  const [command] = process.argv.slice(2)
  switch (command) {
    case 'stock':
      await switchTo(false)
      return
    case 'patched':
      if (!hasPatch()) {
        throw new Error('No patch in patches/codex/. Make one: npm run codex:patch -- <gerrit-url>')
      }
      await switchTo(true)
      return
    default:
      throw new Error('Usage: npm run codex:use-stock | codex:use-patch')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
