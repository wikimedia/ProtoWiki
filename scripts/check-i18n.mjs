#!/usr/bin/env node
/**
 * Report translation coverage for src/i18n/locales — `npm run i18n:check`.
 *
 *   npm run i18n:check          every language
 *   npm run i18n:check -- fr    one language (also lists the missing keys)
 *
 * Flags: keys used in code (`t('ns.key')`) but absent from `en`, keys a
 * language has that `en` doesn't (stale), and `en` keys with `$n` params but
 * no `qqq` documentation.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const localesDir = join(root, 'src/i18n/locales')
const only = process.argv[2]

function loadLang(lang) {
  const dir = join(localesDir, lang)
  const keys = {}
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json'))) {
    const namespace = file.replace(/\.json$/, '')
    const json = JSON.parse(readFileSync(join(dir, file), 'utf8'))
    for (const [key, value] of Object.entries(json)) {
      if (!key.startsWith('@')) keys[`${namespace}.${key}`] = value
    }
  }
  return keys
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      if (name !== 'node_modules' && name !== 'locales') walk(path, out)
    } else if (/\.(vue|ts|js)$/.test(name)) {
      out.push(path)
    }
  }
  return out
}

const langs = readdirSync(localesDir).filter((name) => statSync(join(localesDir, name)).isDirectory())
const en = loadLang('en')
const enKeys = Object.keys(en)
let problems = 0

const used = new Map()
for (const file of walk(join(root, 'src'))) {
  // Skip comment lines so doc examples don't count as usages.
  const source = readFileSync(file, 'utf8')
    .split('\n')
    .filter((line) => !/^\s*(\*|\/\/)/.test(line))
    .join('\n')
  for (const match of source.matchAll(/\bt\(\s*['"`]([a-zA-Z][\w-]*\.[\w.-]+)['"`]/g)) {
    if (!used.has(match[1])) used.set(match[1], relative(root, file))
  }
}
const undefinedKeys = [...used].filter(([key]) => !(key in en))
if (undefinedKeys.length) {
  problems += undefinedKeys.length
  console.log(`\nUsed in code but missing from en (${undefinedKeys.length}):`)
  for (const [key, file] of undefinedKeys) console.log(`  ${key}  (${file})`)
}

const qqq = langs.includes('qqq') ? loadLang('qqq') : {}
const undocumented = enKeys.filter((key) => /\$\d/.test(en[key]) && !qqq[key])
if (undocumented.length) {
  console.log(`\nen messages with parameters but no qqq doc (${undocumented.length}):`)
  for (const key of undocumented) console.log(`  ${key}`)
}

console.log(`\nen: ${enKeys.length} messages`)
for (const lang of langs) {
  if (lang === 'en' || lang === 'qqq' || (only && lang !== only)) continue
  const messages = loadLang(lang)
  const missing = enKeys.filter((key) => !(key in messages))
  const stale = Object.keys(messages).filter((key) => !(key in en))
  const pct = enKeys.length ? Math.round(((enKeys.length - missing.length) / enKeys.length) * 100) : 100
  console.log(`${lang}: ${pct}% (${missing.length} missing, ${stale.length} stale)`)
  if (only || missing.length <= 20) for (const key of missing) console.log(`  missing  ${key}`)
  for (const key of stale) console.log(`  stale    ${key}`)
  problems += stale.length
}

process.exitCode = problems ? 1 : 0
