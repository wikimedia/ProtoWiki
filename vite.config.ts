import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { resolve } from 'node:path'

import { defineConfig } from 'vite'
import VueRouter from 'unplugin-vue-router/vite'
import vue from '@vitejs/plugin-vue'

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

// Written by scripts/lib-codex-state.mjs only while patched files are installed.
const codexPatchMarker = new URL(
  './node_modules/@wikimedia/codex/.protowiki-codex-patch.json',
  import.meta.url,
)
const codexPatch = existsSync(codexPatchMarker)
  ? JSON.parse(readFileSync(codexPatchMarker, 'utf8'))
  : null
const codexVersion: string = JSON.parse(
  readFileSync(new URL('./node_modules/@wikimedia/codex/package.json', import.meta.url), 'utf8'),
).version

// Set by scripts/build-codex-variants.mjs: the sibling builds of this deploy
// (patched + stock) so the app can link between them.
const codexVariants = JSON.parse(process.env.PROTOWIKI_CODEX_VARIANTS ?? '[]')
const isVariantSubpathBuild = process.env.PROTOWIKI_CODEX_VARIANT_SUBPATH === '1'

// Shape: CodexBuildInfo in src/env.d.ts.
const codexBuild = {
  codexVersion,
  patch: codexPatch && {
    change: codexPatch.change ? String(codexPatch.change) : null,
    patchset: codexPatch.patchset ?? null,
    subject: codexPatch.subject ?? null,
    url: codexPatch.url ?? null,
  },
  variant: codexPatch ? 'patched' : 'stock',
  variants: codexVariants,
}

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? buildBase : '/',
  define: {
    __CODEX_PATCH__: JSON.stringify(codexPatch ? String(codexPatch.change ?? 'patched') : null),
    __CODEX_BUILD__: JSON.stringify(codexBuild),
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
    // then prepend a script so pr-preview and codex/<variant> deep links redirect
    // into their base (sessionStorage + restore in index). Production deep links
    // unchanged. Pages only reads the site-root 404.html, so variant subpath
    // builds skip this.
    {
      name: 'protowiki-spa-404',
      apply: 'build',
      closeBundle() {
        if (isVariantSubpathBuild) {
          return
        }
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
    port: 5173,
    strictPort: false,
  },
}))
