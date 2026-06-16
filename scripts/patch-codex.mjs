#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const CACHE_ROOT = path.join(os.tmpdir(), 'protowiki-codex-gerrit-cache')
const CODEX_REPO_DIR = path.join(CACHE_ROOT, 'design-codex')
const PACK_DIR = path.join(CACHE_ROOT, 'packs')
const GERRIT_REPO = 'https://gerrit.wikimedia.org/r/design/codex'

const CODEX_PACKAGES = [
  '@wikimedia/codex',
  '@wikimedia/codex-design-tokens',
  '@wikimedia/codex-icons',
]

const PACKAGE_DIRS = new Map([
  ['@wikimedia/codex', 'packages/codex'],
  ['@wikimedia/codex-design-tokens', 'packages/codex-design-tokens'],
  ['@wikimedia/codex-icons', 'packages/codex-icons'],
])

function run(command, args, opts = {}) {
  const result = spawnSync(command, args, {
    cwd: opts.cwd ?? ROOT,
    stdio: 'pipe',
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr].filter(Boolean).join('\n')
    throw new Error(`Command failed: ${command} ${args.join(' ')}\n${details || '(no output)'}`)
  }

  return (result.stdout ?? '').trim()
}

function readRootPackageJson() {
  const packageJsonPath = path.join(ROOT, 'package.json')
  return JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
}

function parseChangeNumber(input) {
  if (!input) {
    throw new Error('Missing Gerrit URL or change number.')
  }
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) {
    return trimmed
  }

  const url = new URL(trimmed)
  const slashPlusMatch = url.pathname.match(/\/\+\/(\d+)(?:\/)?$/)
  if (slashPlusMatch) {
    return slashPlusMatch[1]
  }

  const cPathMatch = url.pathname.match(/\/c\/[^/]+\/[^/]+\/\+\/(\d+)(?:\/)?$/)
  if (cPathMatch) {
    return cPathMatch[1]
  }

  throw new Error(`Could not parse Gerrit change number from: ${input}`)
}

function stripXssiPrefix(body) {
  const lines = body.split('\n')
  if (lines[0] === `)]}'`) {
    return lines.slice(1).join('\n')
  }
  return body
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`)
  }
  const text = await response.text()
  return JSON.parse(stripXssiPrefix(text))
}

function ensureRepo() {
  fs.mkdirSync(CACHE_ROOT, { recursive: true })
  if (!fs.existsSync(CODEX_REPO_DIR)) {
    console.log(`Cloning design/codex into ${CODEX_REPO_DIR}`)
    run('git', ['clone', '--filter=blob:none', GERRIT_REPO, CODEX_REPO_DIR], { cwd: CACHE_ROOT })
  } else {
    run('git', ['remote', 'set-url', 'origin', GERRIT_REPO], { cwd: CODEX_REPO_DIR })
  }
}

function ensureDependenciesInstalled() {
  console.log('Installing Codex dependencies')
  try {
    run('npm', ['install'], { cwd: CODEX_REPO_DIR })
  } catch (error) {
    console.warn('Default npm install failed; retrying with --ignore-scripts')
    run('npm', ['install', '--ignore-scripts'], { cwd: CODEX_REPO_DIR })
    console.warn(
      'Installed with --ignore-scripts; this bypasses non-essential postinstall hooks in local tooling.',
    )
    if (!(error instanceof Error)) {
      throw error
    }
  }
}

function buildCodex() {
  console.log('Building design/codex packages used by ProtoWiki')
  for (const packageName of CODEX_PACKAGES) {
    run('npm', ['run', 'build', '--workspace', packageName], { cwd: CODEX_REPO_DIR })
  }
}

function packOne(packageName) {
  const relDir = PACKAGE_DIRS.get(packageName)
  if (!relDir) {
    throw new Error(`No package directory mapping for ${packageName}`)
  }
  const packageDir = path.join(CODEX_REPO_DIR, relDir)
  fs.mkdirSync(PACK_DIR, { recursive: true })
  if (packageName === '@wikimedia/codex-design-tokens') {
    const distDir = path.join(packageDir, 'dist')
    for (const entry of fs.readdirSync(distDir)) {
      if (!entry.startsWith('theme-')) continue
      const src = path.join(distDir, entry)
      const dest = path.join(packageDir, entry)
      fs.copyFileSync(src, dest)
    }
  }
  const packOutput = run('npm', ['pack', '--pack-destination', PACK_DIR], { cwd: packageDir })
  const tarballName = packOutput
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.endsWith('.tgz'))
    .at(-1)
  if (!tarballName) {
    throw new Error(`Unable to find tarball name in npm pack output for ${packageName}`)
  }
  return path.join(PACK_DIR, tarballName)
}

function installTarballs(tarballs) {
  console.log('Installing local Codex tarballs into ProtoWiki')
  run('npm', ['install', '--no-save', ...tarballs], { cwd: ROOT })
}

function resetToRegistry() {
  const packageJson = readRootPackageJson()
  const desired = CODEX_PACKAGES.map((name) => {
    const range = packageJson.dependencies?.[name]
    if (!range) {
      throw new Error(`Missing dependency range in package.json: ${name}`)
    }
    return `${name}@${range}`
  })

  console.log('Restoring Codex packages from npm registry')
  run('npm', ['install', '--no-save', ...desired], { cwd: ROOT })
  printInstalledVersions('reset complete')
}

function printInstalledVersions(context) {
  const lines = CODEX_PACKAGES.map((name) => {
    const p = path.join(ROOT, 'node_modules', name, 'package.json')
    if (!fs.existsSync(p)) {
      return `${name}: not installed`
    }
    const v = JSON.parse(fs.readFileSync(p, 'utf8')).version
    return `${name}: ${v}`
  })
  console.log(`\nCodex package state (${context}):`)
  for (const line of lines) {
    console.log(`- ${line}`)
  }
}

function computePatchRef(changeNumber, patchsetNumber) {
  const twoDigit = changeNumber.slice(-2).padStart(2, '0')
  return `refs/changes/${twoDigit}/${changeNumber}/${patchsetNumber}`
}

async function applyChange(changeInput) {
  const changeNumber = parseChangeNumber(changeInput)
  console.log(`Fetching Gerrit change ${changeNumber}`)

  const detailUrl = `https://gerrit.wikimedia.org/r/changes/design%2Fcodex~${changeNumber}/detail`
  const detail = await fetchJson(detailUrl)

  const patchset = detail.current_revision_number
  if (!patchset) {
    throw new Error('Gerrit response did not include current_revision_number')
  }

  const ref = computePatchRef(changeNumber, String(patchset))
  console.log(`Current patchset: ${patchset} (${ref})`)

  ensureRepo()
  run('git', ['fetch', 'origin', ref], { cwd: CODEX_REPO_DIR })
  run('git', ['checkout', '--detach', 'FETCH_HEAD'], { cwd: CODEX_REPO_DIR })

  ensureDependenciesInstalled()
  buildCodex()

  const tarballs = CODEX_PACKAGES.map(packOne)
  installTarballs(tarballs)

  const revision = detail.current_revision ?? '(unknown revision)'
  printInstalledVersions(`patched from Gerrit ${changeNumber}`)
  console.log(`\nApplied change ${changeNumber} at revision ${revision}.`)
  console.log('To restore registry versions: npm run patch-codex:reset')
}

async function main() {
  const [, , firstArg, secondArg] = process.argv
  if (firstArg === '--reset') {
    resetToRegistry()
    return
  }

  const changeInput = secondArg && firstArg === '--change' ? secondArg : firstArg
  if (!changeInput) {
    console.log('Usage:')
    console.log('  npm run patch-codex -- <gerrit-url-or-change-number>')
    console.log('  npm run patch-codex:reset')
    process.exit(1)
  }

  await applyChange(changeInput)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
