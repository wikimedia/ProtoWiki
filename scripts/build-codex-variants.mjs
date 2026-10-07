#!/usr/bin/env node
// Build patched and stock Codex side by side in one deploy:
//
//   <base>               patched Codex (the committed patches/codex/)
//   <base>codex/stock/   published Codex
//
// Without a committed patch this is a plain stock build. Both builds share one
// install: stock is restored from the local snapshot, the patch is a fast text
// apply. node_modules is put back on patched afterwards.
//
//   PROTOWIKI_BASE=/protowiki/pr-preview/pr-7/ npm run build:variants

import fs from 'node:fs'
import path from 'node:path'

import { ROOT, hasPatch, patchLabel, readManifest, run } from './lib-codex-patch.mjs'
import { ensureCodex } from './lib-codex-state.mjs'

const base = (process.env.PROTOWIKI_BASE ?? '/protowiki/').replace(/\/?$/, '/')

const variants = hasPatch()
  ? [
      { id: 'patched', label: patchLabel(readManifest()), base },
      { id: 'stock', label: 'Stock', base: `${base}codex/stock/` },
    ]
  : [{ id: 'stock', label: 'Stock', base }]

try {
  for (const [index, variant] of variants.entries()) {
    const isRoot = index === 0
    const outDir = isRoot ? 'dist' : path.join('dist', 'codex', variant.id)
    console.log(`\n=== ${variant.label} → ${variant.base} (${outDir})`)
    await ensureCodex(variant.id === 'patched')
    run('npx', ['vite', 'build', '--outDir', outDir, '--emptyOutDir'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        PROTOWIKI_BASE: variant.base,
        PROTOWIKI_CODEX_VARIANTS: JSON.stringify(variants),
        PROTOWIKI_CODEX_VARIANT_SUBPATH: isRoot ? '0' : '1',
      },
    })
  }
} finally {
  await ensureCodex(hasPatch())
}

console.log('\nBuilt Codex variants:')
for (const variant of variants) {
  console.log(`  ${variant.label.padEnd(20)} ${variant.base}`)
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = variants.map((v) => `| ${v.label} | \`${v.base}\` |`).join('\n')
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    `### Codex variants in this deploy\n\n| Variant | Path |\n| --- | --- |\n${rows}\n`,
  )
}
