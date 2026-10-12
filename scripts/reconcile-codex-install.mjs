// Align node_modules Codex with patches/codex/ (stock vs patched).
// Used by postinstall, Vite dev/build startup, and git hooks.

import { wantsPatch } from './lib-codex-patch.mjs'
import { clearViteCache, ensureCodex } from './lib-codex-state.mjs'

/**
 * @param {{ log?: (msg: string) => void }} [opts]
 * @returns {Promise<boolean>} true when node_modules changed on disk
 */
export async function reconcileCodexInstall({ log = console.log } = {}) {
  // build-codex-variants.mjs sets this for the stock sibling under codex/stock/.
  const patched =
    process.env.PROTOWIKI_CODEX_VARIANT_SUBPATH === '1' ? false : wantsPatch()
  const changed = await ensureCodex(patched, { log })
  if (changed) clearViteCache()
  return changed
}
