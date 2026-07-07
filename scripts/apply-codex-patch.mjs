#!/usr/bin/env node
// postinstall hook: re-apply the committed Codex patch (if any) on top of the
// freshly installed published packages.
//
// For each patched file we re-format the installed file with the same pinned
// Prettier config used when the patch was authored, then apply the diff. Because
// the published artifact and the formatter are both fixed, the formatted
// baseline is byte-identical to authoring time, so the patch always lands.
// Content hashes (recorded in manifest.json) make this deterministic and
// idempotent: a file that is already patched is left untouched. This runs with
// no Codex build, so CI / PR previews stay fast.
//
// Authoring lives in scripts/patch-codex.mjs.

import fs from 'node:fs'
import path from 'node:path'

import {
  PATCHES_DIR,
  formatContent,
  installedPackageDir,
  installedTargetPath,
  loadJsDiff,
  loadPrettier,
  readManifest,
  readPrettierOptions,
  sha256,
} from './lib-codex-patch.mjs'

async function main() {
  const manifest = readManifest()
  if (!manifest || !Array.isArray(manifest.files) || manifest.files.length === 0) {
    // No patch committed: nothing to do (e.g. a fresh template clone).
    return
  }

  // Warn (don't fail) if the installed Codex version drifted from the one the
  // patch was authored against; the hash checks below are the real safety net.
  for (const [pkg, expected] of Object.entries(manifest.codexVersions ?? {})) {
    const pkgJson = path.join(installedPackageDir(pkg), 'package.json')
    if (fs.existsSync(pkgJson)) {
      const actual = JSON.parse(fs.readFileSync(pkgJson, 'utf8')).version
      if (actual !== expected) {
        console.warn(
          `[apply-codex-patch] ${pkg} is ${actual} but the patch was made for ${expected}. ` +
            'Re-run `npm run patch-codex` to regenerate if it fails to apply.',
        )
      }
    }
  }

  const prettier = await loadPrettier()
  const jsdiff = await loadJsDiff()
  const prettierOpts = readPrettierOptions()

  let applied = 0
  let skipped = 0

  for (const file of manifest.files) {
    const patchPath = path.join(PATCHES_DIR, file.patch)
    const targetPath = file.target ? installedTargetPath(file.target) : null
    if (!targetPath || !fs.existsSync(targetPath)) {
      throw new Error(`[apply-codex-patch] target not found: ${file.target}`)
    }
    if (!fs.existsSync(patchPath)) {
      throw new Error(`[apply-codex-patch] patch file missing: ${file.patch}`)
    }

    // Normalize the installed file to the formatted baseline the patch expects.
    const current = fs.readFileSync(targetPath, 'utf8')
    const formatted = await formatContent(prettier, current, file.rel, prettierOpts)
    const formattedSha = sha256(formatted)

    if (formattedSha === file.patchedSha) {
      // Already patched (idempotent re-run): make sure the on-disk file matches.
      if (formatted !== current) {
        fs.writeFileSync(targetPath, formatted)
      }
      skipped += 1
      continue
    }

    if (formattedSha !== file.baseSha) {
      throw new Error(
        `[apply-codex-patch] ${file.target} does not match the expected published baseline. ` +
          'The installed Codex version or Prettier likely changed; re-run `npm run patch-codex`.',
      )
    }

    const patchText = fs.readFileSync(patchPath, 'utf8')
    const result = jsdiff.applyPatch(formatted, patchText)
    if (result === false || sha256(result) !== file.patchedSha) {
      throw new Error(
        `[apply-codex-patch] failed to apply patch for ${file.target}. ` +
          'Re-run `npm run patch-codex` to regenerate.',
      )
    }

    fs.writeFileSync(targetPath, result)
    applied += 1
  }

  console.log(
    `[apply-codex-patch] Codex change ${manifest.change}: applied ${applied}, already-applied ${skipped}.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
