// Put node_modules into stock or patched Codex from whatever state it is in now.
//
// Every script that changes installed Codex goes through ensureCodex(), so the
// marker file, the stock snapshot and the applied files cannot drift apart.

import fs from 'node:fs'
import path from 'node:path'

import {
  CODEX_PACKAGES,
  PATCH_DIR,
  ROOT,
  formatContent,
  installedPackageDir,
  installedTargetPath,
  installedVersions,
  loadJsDiff,
  loadPrettier,
  readManifest,
  readPatchMarker,
  readPrettierOptions,
  removePatchMarker,
  restoreStock,
  run,
  sha256,
  snapshotStock,
  writePatchMarker,
} from './lib-codex-patch.mjs'

function reinstallStock() {
  for (const pkg of CODEX_PACKAGES) {
    fs.rmSync(installedPackageDir(pkg), { recursive: true, force: true })
  }
  // The nested postinstall sees CODEX_PATCH=off, leaves stock in place and
  // snapshots it for the next switch.
  run('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: ROOT,
    env: { ...process.env, CODEX_PATCH: 'off' },
  })
}

function toStock(log) {
  removePatchMarker()
  if (restoreStock()) {
    log('[codex] restored stock Codex from the local snapshot')
  } else {
    log('[codex] no stock snapshot for the installed versions; reinstalling published packages')
    reinstallStock()
  }
  removePatchMarker()
  snapshotStock()
}

function warnOnVersionDrift(manifest, log) {
  const installed = installedVersions()
  for (const [pkg, expected] of Object.entries(manifest.codexVersions ?? {})) {
    if (installed[pkg] && installed[pkg] !== expected) {
      log(
        `[codex] ${pkg} is ${installed[pkg]} but the patch was made for ${expected}. ` +
          'Re-run `npm run codex:patch` to regenerate if it fails to apply.',
      )
    }
  }
}

async function applyPatch(log) {
  const manifest = readManifest()
  if (!manifest?.files?.length) {
    throw new Error('[codex] patches/codex/manifest.json lists no files.')
  }
  warnOnVersionDrift(manifest, log)

  const prettier = await loadPrettier()
  const jsdiff = await loadJsDiff()
  const prettierOpts = readPrettierOptions()

  // Compute every result before writing anything, so a failure leaves
  // node_modules stock (and "no marker" keeps meaning "stock").
  const writes = []
  for (const file of manifest.files) {
    const targetPath = installedTargetPath(file.target)
    const patchPath = path.join(PATCH_DIR, file.patch)
    if (!fs.existsSync(targetPath)) {
      throw new Error(`[codex] target not found: ${file.target}`)
    }
    if (!fs.existsSync(patchPath)) {
      throw new Error(`[codex] patch file missing: ${file.patch}`)
    }
    const formatted = await formatContent(
      prettier,
      fs.readFileSync(targetPath, 'utf8'),
      file.rel,
      prettierOpts,
    )
    if (sha256(formatted) !== file.baseSha) {
      throw new Error(
        `[codex] ${file.target} does not match the published baseline the patch expects. ` +
          'The installed Codex version or Prettier likely changed; re-run `npm run codex:patch`.',
      )
    }
    const result = jsdiff.applyPatch(formatted, fs.readFileSync(patchPath, 'utf8'))
    if (result === false || sha256(result) !== file.patchedSha) {
      throw new Error(
        `[codex] failed to apply ${file.patch}. Re-run \`npm run codex:patch\` to regenerate.`,
      )
    }
    writes.push([targetPath, result])
  }

  for (const [targetPath, content] of writes) {
    fs.writeFileSync(targetPath, content)
  }
  writePatchMarker(manifest)
  log(`[codex] applied Codex patch (${writes.length} files)`)
}

function markerMatchesPatch(marker) {
  return Boolean(marker) && marker.generatedAt === readManifest()?.generatedAt
}

/**
 * Make node_modules hold patched (`patched === true`) or stock Codex.
 * Returns true when anything changed on disk.
 */
export async function ensureCodex(patched, { log = console.log } = {}) {
  const marker = readPatchMarker()

  if (!patched) {
    if (!marker) {
      snapshotStock()
      return false
    }
    toStock(log)
    log('[codex] Codex is stock')
    return true
  }

  if (markerMatchesPatch(marker)) {
    return false
  }

  if (marker) {
    toStock(log)
  } else {
    snapshotStock()
  }
  await applyPatch(log)
  return true
}

export function clearViteCache() {
  fs.rmSync(path.join(ROOT, 'node_modules', '.vite'), { recursive: true, force: true })
}
