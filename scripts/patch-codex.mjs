#!/usr/bin/env node
// Trial an unmerged Codex Gerrit change in ProtoWiki by committing a tiny,
// deterministic diff instead of vendored tarballs.
//
//   npm run patch-codex -- <gerrit-url-or-change-number>   (build + emit patch)
//   npm run patch-codex:reset                              (remove the patch)
//
// All heavy work (cloning + building Codex) happens locally. The committed
// output is a small `patches/codex/*` diff that is re-applied at install time
// by scripts/apply-codex-patch.mjs (wired as `postinstall`), so CI / PR
// previews reproduce the change with no Codex build step. See
// .agents/skills/protowiki-update-codex/references/gerrit-patch-trial.md.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import {
  CODEX_PACKAGES,
  MANIFEST_PATH,
  PATCHES_DIR,
  ROOT,
  formatContent,
  installedPackageDir,
  isFormattable,
  loadJsDiff,
  loadPrettier,
  patchFileName,
  prettierVersion,
  readManifest,
  readPrettierOptions,
  run,
  sha256,
  tryRun,
} from './lib-codex-patch.mjs'

const CACHE_ROOT = path.join(os.tmpdir(), 'protowiki-codex-gerrit-cache')
const CODEX_REPO_DIR = path.join(CACHE_ROOT, 'design-codex')
const GERRIT_REPO = 'https://gerrit.wikimedia.org/r/design/codex'

const PACKAGE_DIRS = new Map([
  ['@wikimedia/codex', 'packages/codex'],
  ['@wikimedia/codex-design-tokens', 'packages/codex-design-tokens'],
  ['@wikimedia/codex-icons', 'packages/codex-icons'],
])

// Build order matters: codex imports codex-icons' built output, so tokens and
// icons must be built before codex.
const CODEX_BUILD_ORDER = [
  '@wikimedia/codex-design-tokens',
  '@wikimedia/codex-icons',
  '@wikimedia/codex',
]

function parseChangeNumber(input) {
  if (!input) {
    throw new Error('Missing Gerrit URL or change number.')
  }
  const trimmed = input.trim()
  if (/^\d+$/.test(trimmed)) {
    return trimmed
  }
  const url = new URL(trimmed)
  const match =
    url.pathname.match(/\/\+\/(\d+)(?:\/)?$/) ||
    url.pathname.match(/\/c\/[^/]+\/[^/]+\/\+\/(\d+)(?:\/)?$/)
  if (match) {
    return match[1]
  }
  throw new Error(`Could not parse Gerrit change number from: ${input}`)
}

function stripXssiPrefix(body) {
  const lines = body.split('\n')
  return lines[0] === `)]}'` ? lines.slice(1).join('\n') : body
}

async function fetchJson(url) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}): ${url}`)
  }
  return JSON.parse(stripXssiPrefix(await response.text()))
}

function computePatchRef(changeNumber, patchsetNumber) {
  const twoDigit = changeNumber.slice(-2).padStart(2, '0')
  return `refs/changes/${twoDigit}/${changeNumber}/${patchsetNumber}`
}

function removeInstalledCodex() {
  for (const pkg of CODEX_PACKAGES) {
    fs.rmSync(installedPackageDir(pkg), { recursive: true, force: true })
  }
}

function removePatches() {
  fs.rmSync(PATCHES_DIR, { recursive: true, force: true })
}

function freshRegistryInstall() {
  // Patches are gone, so the postinstall applier is a no-op and node_modules
  // ends up holding the pristine published packages (our patch baseline).
  console.log('Installing pristine published Codex packages')
  run('npm', ['install'], { cwd: ROOT })
}

function installedVersion(pkg) {
  const p = path.join(installedPackageDir(pkg), 'package.json')
  return JSON.parse(fs.readFileSync(p, 'utf8')).version
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

function installCodexDeps() {
  console.log('Installing Codex build dependencies')
  const ci = tryRun('npm', ['ci', '--ignore-scripts'], { cwd: CODEX_REPO_DIR })
  if (ci.status !== 0) {
    console.warn('npm ci failed; falling back to npm install --ignore-scripts')
    run('npm', ['install', '--ignore-scripts'], { cwd: CODEX_REPO_DIR })
  }
}

function buildCodex() {
  for (const pkg of CODEX_BUILD_ORDER) {
    run('npm', ['run', 'build', '--workspace', pkg], { cwd: CODEX_REPO_DIR })
  }
}

// Collect every distributed build artifact of the installed Codex packages:
// everything under `dist/**` plus the root `theme-*` token files. Patching the
// full distribution (rather than only the files ProtoWiki imports today) keeps
// the patched node_modules self-contained — any current or future import sees
// the change, with no need to re-run when ProtoWiki's imports change. Package
// metadata (package.json / README / LICENSE) is deliberately excluded.
function collectCandidates() {
  const candidates = []

  for (const pkg of CODEX_PACKAGES) {
    const pkgRoot = installedPackageDir(pkg)
    if (!fs.existsSync(pkgRoot)) continue
    const buildPkgDir = path.join(CODEX_REPO_DIR, PACKAGE_DIRS.get(pkg))

    const add = (rel) => {
      const installedFile = path.join(pkgRoot, rel)
      if (!isFormattable(installedFile)) return
      // Token theme files ship at the package root but are built into dist/.
      const buildRel =
        !rel.includes('/') && rel.startsWith('theme-') ? path.join('dist', rel) : rel
      candidates.push({
        target: `${pkg}/${rel}`,
        pkg,
        rel,
        installedFile,
        buildFile: path.join(buildPkgDir, buildRel),
      })
    }

    const distDir = path.join(pkgRoot, 'dist')
    if (fs.existsSync(distDir)) {
      const walk = (dir) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const abs = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            walk(abs)
          } else if (entry.isFile()) {
            add(path.relative(pkgRoot, abs))
          }
        }
      }
      walk(distDir)
    }

    for (const entry of fs.readdirSync(pkgRoot, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.startsWith('theme-')) {
        add(entry.name)
      }
    }
  }

  return candidates
}

function snapshotBuild(candidates) {
  const map = new Map()
  for (const candidate of candidates) {
    if (fs.existsSync(candidate.buildFile)) {
      map.set(candidate.target, fs.readFileSync(candidate.buildFile, 'utf8'))
    }
  }
  return map
}

// 3-way merge: layer the base->other change onto current, returning the merged
// text. Throws on conflict so we never emit a wrong patch silently.
function mergeThreeWay(rel, current, base, other) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'codex-merge-'))
  try {
    const cur = path.join(tmp, 'current')
    const bse = path.join(tmp, 'base')
    const oth = path.join(tmp, 'other')
    fs.writeFileSync(cur, current)
    fs.writeFileSync(bse, base)
    fs.writeFileSync(oth, other)
    const res = tryRun('git', ['merge-file', '-p', cur, bse, oth])
    if (res.status === 0) return res.stdout
    if (res.status > 0) {
      throw new Error(
        `Could not cleanly merge the change into the published ${rel} ` +
          '(the change overlaps with version differences). Try a newer patchset or re-run.',
      )
    }
    throw new Error(`git merge-file failed for ${rel}: ${res.stderr}`)
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true })
  }
}

async function makePatch(changeInput) {
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

  // 1. Establish a pristine published baseline in node_modules.
  removePatches()
  removeInstalledCodex()
  freshRegistryInstall()
  const versions = Object.fromEntries(CODEX_PACKAGES.map((pkg) => [pkg, installedVersion(pkg)]))
  console.log(`Baseline Codex version: ${versions['@wikimedia/codex']}`)

  // 2. Fetch the change and its parent.
  ensureRepo()
  run('git', ['fetch', 'origin', ref], { cwd: CODEX_REPO_DIR })
  const changeSha = run('git', ['rev-parse', 'FETCH_HEAD'], { cwd: CODEX_REPO_DIR })
  const parentSha = run('git', ['rev-parse', 'FETCH_HEAD^'], { cwd: CODEX_REPO_DIR })

  // 3. Build the unpatched parent and the patched change.
  const candidates = collectCandidates()

  console.log('Building Codex at the parent commit (unpatched)')
  run('git', ['checkout', '--force', '--detach', parentSha], { cwd: CODEX_REPO_DIR })
  installCodexDeps()
  buildCodex()
  const unpatched = snapshotBuild(candidates)

  console.log('Building Codex at the change commit (patched)')
  run('git', ['checkout', '--force', '--detach', changeSha], { cwd: CODEX_REPO_DIR })
  buildCodex()
  const patched = snapshotBuild(candidates)

  // 4. The change's true footprint: files that differ between the two builds.
  const changed = candidates.filter((candidate) => {
    const before = unpatched.get(candidate.target)
    const after = patched.get(candidate.target)
    return before !== undefined && after !== undefined && before !== after
  })

  if (changed.length === 0) {
    throw new Error('The change produced no differences in any distributed Codex file.')
  }

  // 5. For each changed file, layer the change onto the published file (after
  // formatting, so the minified single-line CSS diffs by content not file size).
  const prettier = await loadPrettier()
  const jsdiff = await loadJsDiff()
  const prettierOpts = readPrettierOptions()

  fs.mkdirSync(PATCHES_DIR, { recursive: true })
  const manifestFiles = []

  for (const candidate of changed) {
    const published = fs.readFileSync(candidate.installedFile, 'utf8')
    const fmtPublished = await formatContent(prettier, published, candidate.rel, prettierOpts)
    const fmtBase = await formatContent(
      prettier,
      unpatched.get(candidate.target),
      candidate.rel,
      prettierOpts,
    )
    const fmtOther = await formatContent(
      prettier,
      patched.get(candidate.target),
      candidate.rel,
      prettierOpts,
    )

    const merged = mergeThreeWay(candidate.rel, fmtPublished, fmtBase, fmtOther)
    const fmtMerged = await formatContent(prettier, merged, candidate.rel, prettierOpts)
    if (fmtMerged === fmtPublished) continue

    const diff = jsdiff.createPatch(candidate.rel, fmtPublished, fmtMerged, '', '')
    const fileName = patchFileName(candidate.target)
    fs.writeFileSync(path.join(PATCHES_DIR, fileName), diff)
    manifestFiles.push({
      target: candidate.target,
      package: candidate.pkg,
      rel: candidate.rel,
      patch: fileName,
      // Content hashes of the formatted baseline and patched result, so the
      // applier can apply (and skip re-applying) deterministically.
      baseSha: sha256(fmtPublished),
      patchedSha: sha256(fmtMerged),
    })
    console.log(`  patched ${candidate.target}`)
  }

  if (manifestFiles.length === 0) {
    throw new Error('No effective changes remained after merging into the published files.')
  }

  const manifest = {
    change: changeNumber,
    patchset,
    revision: changeSha,
    generatedAt: new Date().toISOString(),
    codexVersions: versions,
    prettierVersion: prettierVersion(prettier),
    files: manifestFiles,
  }
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)

  // 6. Apply locally via the same path CI uses.
  console.log('Applying patch locally')
  console.log(run('node', ['scripts/apply-codex-patch.mjs'], { cwd: ROOT }))

  console.log(`\nWrote ${manifestFiles.length} patch file(s) to patches/codex/.`)
  console.log('Commit patches/codex/ so the PR preview reproduces the change.')
  console.log('To remove the patch: npm run patch-codex:reset')
}

function reset() {
  const manifest = readManifest()
  removePatches()
  removeInstalledCodex()
  freshRegistryInstall()
  if (manifest) {
    console.log(`Removed Codex patch for change ${manifest.change}; restored published packages.`)
  } else {
    console.log('No Codex patch present; reinstalled published packages.')
  }
}

function printUsage() {
  console.log('Usage:')
  console.log('  npm run patch-codex -- <gerrit-url-or-change-number>')
  console.log('  npm run patch-codex:reset')
}

async function main() {
  const [, , firstArg] = process.argv
  if (firstArg === '--reset') {
    reset()
    return
  }
  if (!firstArg) {
    printUsage()
    process.exit(1)
  }
  await makePatch(firstArg)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
