// Shared helpers for the Codex Gerrit patch workflow.
//
// Scripts that use this:
//   - patch-codex.mjs           (local "make": build the change, emit a tiny diff)
//   - apply-codex-patch.mjs     (postinstall: apply the committed patch)
//   - codex.mjs                 (switch stock / patched)
//   - build-codex-variants.mjs  (build patched + stock side by side)
//
// The formatting helpers MUST behave identically everywhere, because a committed
// patch is authored against `format(published)` and re-applied to
// `format(published)` at install time. Same formatter + same input => the patch
// always lands.
//
// Layout: at most one patch, flat in patches/codex/ (manifest.json + *.patch).
// No manifest means no patch: every install and deploy is stock Codex.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..')
export const PATCH_DIR = path.join(ROOT, 'patches', 'codex')
export const MANIFEST_PATH = path.join(PATCH_DIR, 'manifest.json')

export function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
}

export function hasPatch() {
  return fs.existsSync(MANIFEST_PATH)
}

/**
 * Whether an install should be patched: CODEX_PATCH=off|stock forces stock,
 * anything else applies the committed patch when there is one.
 */
export function wantsPatch(request = process.env.CODEX_PATCH) {
  if (request === 'off' || request === 'stock') return false
  return hasPatch()
}

export function patchLabel(manifest) {
  return manifest.change ? `Gerrit ${manifest.change}` : 'Patched'
}

export const CODEX_PACKAGES = [
  '@wikimedia/codex',
  '@wikimedia/codex-design-tokens',
  '@wikimedia/codex-icons',
]

// File extensions we can format + diff as text. Anything else (images, fonts)
// is skipped: a binary asset can't be expressed as a tiny line diff anyway.
const FORMATTABLE_EXTS = new Set(['.css', '.scss', '.less', '.js', '.cjs', '.mjs', '.json'])

const PARSER_BY_EXT = {
  '.css': 'css',
  '.scss': 'scss',
  '.less': 'less',
  '.js': 'babel',
  '.cjs': 'babel',
  '.mjs': 'babel',
  '.json': 'json',
}

export function isFormattable(file) {
  return FORMATTABLE_EXTS.has(path.extname(file))
}

export function parserForFile(file) {
  return PARSER_BY_EXT[path.extname(file)] ?? null
}

export function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: opts.cwd ?? ROOT,
    env: opts.env ?? process.env,
    stdio: opts.stdio ?? 'pipe',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
  })
  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n')
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${details || '(no output)'}`)
  }
  return (result.stdout ?? '').trim()
}

// Raw spawn that returns status + output without throwing, for commands whose
// non-zero exit codes are meaningful (git diff --no-index, git merge-file,
// git apply --check).
export function tryRun(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: opts.cwd ?? ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 64,
    input: opts.input,
  })
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  }
}

export function readPrettierOptions() {
  const configPath = path.join(ROOT, '.prettierrc.json')
  if (!fs.existsSync(configPath)) {
    return {}
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'))
}

export function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

let cachedJsDiff = null
export async function loadJsDiff() {
  if (cachedJsDiff) {
    return cachedJsDiff
  }
  try {
    cachedJsDiff = await import('diff')
  } catch {
    throw new Error(
      'The "diff" package is required to apply the Codex patch but is not installed. Run `npm install` with dev dependencies.',
    )
  }
  return cachedJsDiff
}

let cachedPrettier = null
export async function loadPrettier() {
  if (cachedPrettier) {
    return cachedPrettier
  }
  try {
    cachedPrettier = await import('prettier')
  } catch {
    throw new Error(
      'Prettier is required to format Codex files but is not installed. Run `npm install` with dev dependencies.',
    )
  }
  return cachedPrettier
}

export async function formatContent(prettier, content, file, baseOptions) {
  const parser = parserForFile(file)
  if (!parser) {
    return content
  }
  const mod = prettier.default ?? prettier
  return mod.format(content, { ...baseOptions, parser })
}

export function prettierVersion(prettier) {
  const mod = prettier.default ?? prettier
  return mod.version ?? 'unknown'
}

// Map a committed target (e.g. "@wikimedia/codex/dist/codex.style.css") to its
// owning package and the path within that package.
export function splitTarget(target) {
  const pkg = CODEX_PACKAGES.find((name) => target === name || target.startsWith(`${name}/`))
  if (!pkg) {
    throw new Error(`Target is not a known Codex package file: ${target}`)
  }
  const rel = target.slice(pkg.length + 1)
  return { pkg, rel }
}

export function installedPackageDir(pkg) {
  return path.join(ROOT, 'node_modules', pkg)
}

export function installedTargetPath(target) {
  const { pkg, rel } = splitTarget(target)
  return path.join(installedPackageDir(pkg), rel)
}

export function patchFileName(target) {
  return `${target.replace(/^@/, '').replace(/[/]/g, '__')}.patch`
}

// Lives inside the installed package so a fresh (stock) reinstall wipes it:
// the marker only exists while the patched files are actually on disk.
// vite.config.ts reads it to expose __CODEX_PATCH__ / __CODEX_BUILD__ to the app.
export const PATCH_MARKER_PATH = path.join(
  ROOT,
  'node_modules',
  '@wikimedia',
  'codex',
  '.protowiki-codex-patch.json',
)

export function writePatchMarker(manifest) {
  const marker = {
    change: manifest.change,
    patchset: manifest.patchset,
    subject: manifest.subject,
    url: manifest.url,
    generatedAt: manifest.generatedAt,
  }
  fs.writeFileSync(PATCH_MARKER_PATH, `${JSON.stringify(marker, null, 2)}\n`)
}

export function readPatchMarker() {
  if (!fs.existsSync(PATCH_MARKER_PATH)) return null
  return JSON.parse(fs.readFileSync(PATCH_MARKER_PATH, 'utf8'))
}

export function removePatchMarker() {
  fs.rmSync(PATCH_MARKER_PATH, { force: true })
}

export function installedVersions() {
  return Object.fromEntries(
    CODEX_PACKAGES.map((pkg) => {
      const pkgJson = path.join(installedPackageDir(pkg), 'package.json')
      return [
        pkg,
        fs.existsSync(pkgJson) ? JSON.parse(fs.readFileSync(pkgJson, 'utf8')).version : null,
      ]
    }),
  )
}

// A pristine copy of the published packages, taken whenever node_modules is
// known to be stock (no marker). Switching to stock restores from it
// instead of reinstalling — patches never touch package.json, so the installed
// versions identify which published release the copy belongs to.
const STOCK_CACHE_DIR = path.join(ROOT, 'node_modules', '.cache', 'protowiki-codex-stock')
const STOCK_CACHE_VERSIONS = path.join(STOCK_CACHE_DIR, 'versions.json')

function stockCacheMatches(versions) {
  if (!fs.existsSync(STOCK_CACHE_VERSIONS)) return false
  return JSON.stringify(JSON.parse(fs.readFileSync(STOCK_CACHE_VERSIONS, 'utf8'))) ===
    JSON.stringify(versions)
}

/** Call only while node_modules holds stock Codex (no patch marker). */
export function snapshotStock() {
  const versions = installedVersions()
  if (Object.values(versions).some((v) => !v) || stockCacheMatches(versions)) return
  fs.rmSync(STOCK_CACHE_DIR, { recursive: true, force: true })
  for (const pkg of CODEX_PACKAGES) {
    fs.cpSync(installedPackageDir(pkg), path.join(STOCK_CACHE_DIR, pkg), { recursive: true })
  }
  fs.writeFileSync(STOCK_CACHE_VERSIONS, `${JSON.stringify(versions)}\n`)
}

/** Path of a target's published (stock) copy in the snapshot, or null if unavailable. */
export function stockSnapshotPath(target) {
  if (!stockCacheMatches(installedVersions())) return null
  const { pkg, rel } = splitTarget(target)
  const file = path.join(STOCK_CACHE_DIR, pkg, rel)
  return fs.existsSync(file) ? file : null
}

/** Restore stock Codex from the snapshot. Returns false when no usable snapshot exists. */
export function restoreStock() {
  if (!stockCacheMatches(installedVersions())) return false
  for (const pkg of CODEX_PACKAGES) {
    fs.rmSync(installedPackageDir(pkg), { recursive: true, force: true })
    fs.cpSync(path.join(STOCK_CACHE_DIR, pkg), installedPackageDir(pkg), { recursive: true })
  }
  return true
}
