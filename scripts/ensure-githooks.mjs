#!/usr/bin/env node
// Point this repo at committed githooks/ when core.hooksPath is unset.
// Skips when .git is missing or hooksPath is already configured (e.g. Husky).

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { run, tryRun } from './lib-codex-patch.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const GIT_DIR = path.join(ROOT, '.git')
const HOOKS_DIR = path.join(ROOT, 'githooks')

if (!fs.existsSync(GIT_DIR)) {
  process.exit(0)
}

const current = tryRun('git', ['config', '--get', 'core.hooksPath'], { cwd: ROOT })
if (current.status === 0 && current.stdout.trim()) {
  process.exit(0)
}

run('git', ['config', 'core.hooksPath', 'githooks'], { cwd: ROOT })
