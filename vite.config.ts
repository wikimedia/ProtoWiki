import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import VueRouter from 'unplugin-vue-router/vite'
import vue from '@vitejs/plugin-vue'

import directionScope from './scripts/postcss-direction-scope.mjs'

// GitHub Pages project sites need an absolute path prefix. Do not use './' here:
// Vue Router's normalizeBase turns './' into '/.', so the current path never
// matches your routes (blank app). CI sets PROTOWIKI_BASE from the repo name.
// Override locally, e.g. PROTOWIKI_BASE='/ProtoWiki/' npm run build
const buildBase = process.env.PROTOWIKI_BASE ?? '/protowiki/'

const ghPagesRestoreScript = readFileSync(
  new URL('./public/gh-pages-restore.js', import.meta.url),
  'utf8',
)
const ghPagesPreview404Script = readFileSync(
  new URL('./public/gh-pages-preview-404.js', import.meta.url),
  'utf8',
)

export default defineConfig(({ command }) => ({
  base: command === 'build' ? buildBase : '/',
  css: {
    postcss: {
      plugins: [
        // LTR and RTL builds of Codex and the wiki skins, each applying only
        // under its `<html dir>` — see scripts/postcss-direction-scope.mjs.
        directionScope({
          files: [
            { test: /@wikimedia\/codex\/dist\/codex\.style\.css$/, dir: 'ltr' },
            { test: /@wikimedia\/codex\/dist\/codex\.style-rtl\.css$/, dir: 'rtl' },
            { test: /\/src\/styles\/wiki-skins\/(vector-2022|minerva)\.css$/, dir: 'ltr' },
            { test: /\/src\/styles\/wiki-skins\/(vector-2022|minerva)\.rtl\.css$/, dir: 'rtl' },
          ],
        }),
      ],
    },
  },
  plugins: [
    // Plugin order matters: VueRouter must come before vue() so the routes
    // virtual module is generated first.
    VueRouter({
      routesFolder: [
        {
          src: 'src/prototypes',
          // Only `index.vue` files are routes; co-located modules (e.g. HelpModule.vue) are imports.
          filePatterns: ['**/index'],
        },
      ],
      dts: 'src/typed-router.d.ts',
    }),
    vue(),
    {
      name: 'protowiki-gh-pages-restore',
      apply: 'build',
      transformIndexHtml: {
        order: 'pre',
        handler() {
          return [
            {
              tag: 'script',
              children: ghPagesRestoreScript,
              injectTo: 'head-prepend',
            },
          ]
        },
      },
    },
    // GitHub Pages serves a static 404.html for unknown paths. Copy index.html,
    // then prepend a script so pr-preview deep links redirect into the preview
    // base (sessionStorage + restore in index). Production deep links unchanged.
    {
      name: 'protowiki-spa-404',
      apply: 'build',
      closeBundle() {
        const dist = resolve(__dirname, 'dist')
        const index = resolve(dist, 'index.html')
        const fallback = resolve(dist, '404.html')
        if (!existsSync(index)) {
          return
        }
        copyFileSync(index, fallback)
        const html = readFileSync(fallback, 'utf8')
        const preamble = `<script>${ghPagesPreview404Script}</script>`
        writeFileSync(
          fallback,
          html.includes('<head>')
            ? html.replace('<head>', `<head>${preamble}`)
            : preamble + html,
        )
      },
    },
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 5173 by default; `PORT` wins so a second agent/session can run its own
    // dev server on an assigned port instead of silently landing on 5174.
    port: Number(process.env.PORT) || 5173,
    strictPort: false,
  },
}))
