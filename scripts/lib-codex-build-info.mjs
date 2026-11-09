// Assemble __CODEX_BUILD__ from disk (marker, package version, deploy/dev variants).

import fs from 'node:fs'
import path from 'node:path'

import {
  PATCH_MARKER_PATH,
  hasPatch,
  installedPackageDir,
  patchLabel,
  readManifest,
} from './lib-codex-patch.mjs'

function readCodexPatchMarker() {
  if (!fs.existsSync(PATCH_MARKER_PATH)) return null
  return JSON.parse(fs.readFileSync(PATCH_MARKER_PATH, 'utf8'))
}

function readInstalledCodexVersion() {
  const pkgJson = path.join(installedPackageDir('@wikimedia/codex'), 'package.json')
  return JSON.parse(fs.readFileSync(pkgJson, 'utf8')).version
}

function devSwitchVariants(manifest) {
  return [
    {
      id: 'patched',
      label: patchLabel(manifest),
      base: '',
      devSwitch: true,
      patchSubject: manifest.subject ?? null,
      patchChange: manifest.change != null ? String(manifest.change) : null,
    },
    {
      id: 'stock',
      label: 'Stock',
      base: '',
      devSwitch: true,
    },
  ]
}

function resolveVariants({ isDevServer }) {
  const fromEnv = JSON.parse(process.env.PROTOWIKI_CODEX_VARIANTS ?? '[]')
  if (fromEnv.length) return fromEnv
  if (isDevServer && hasPatch()) {
    return devSwitchVariants(readManifest())
  }
  return []
}

/**
 * @param {{ isDevServer?: boolean }} [options]
 */
function committedPatchFromManifest() {
  if (!hasPatch()) return null
  const manifest = readManifest()
  return {
    change: manifest.change != null ? String(manifest.change) : null,
    subject: manifest.subject ?? null,
    url: manifest.url ?? null,
    stackedChangeCount:
      typeof manifest.stackedChangeCount === 'number' ? manifest.stackedChangeCount : 0,
  }
}

export function readCodexBuildInfo({ isDevServer = false } = {}) {
  const codexPatch = readCodexPatchMarker()
  const codexVersion = readInstalledCodexVersion()
  const variants = resolveVariants({ isDevServer })

  const codexBuild = {
    codexVersion,
    patch: codexPatch && {
      change: codexPatch.change ? String(codexPatch.change) : null,
      patchset: codexPatch.patchset ?? null,
      subject: codexPatch.subject ?? null,
      url: codexPatch.url ?? null,
    },
    availablePatch: committedPatchFromManifest(),
    variant: codexPatch ? 'patched' : 'stock',
    variants,
  }

  return {
    codexPatch,
    codexBuild,
  }
}
