// Shared helpers for the Codex Gerrit patch workflow.
//
// Two scripts use this:
//   - patch-codex.mjs        (local "make": build the change, emit a tiny diff)
//   - apply-codex-patch.mjs  (postinstall: format + apply the committed diff)
//
// The formatting helpers MUST behave identically in both, because the committed
// patch is authored against `format(published)` and re-applied to
// `format(published)` at install time. Same formatter + same input => the patch
// always lands.

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const ROOT = path.resolve(__dirname, '..')
export const PATCHES_DIR = path.join(ROOT, 'patches', 'codex')
export const MANIFEST_PATH = path.join(PATCHES_DIR, 'manifest.json')

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
    stdio: 'pipe',
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

export function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return null
  }
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
}
