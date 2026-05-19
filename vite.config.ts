import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

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

export default defineConfig(({ command }) => ({
  base: command === 'build' ? buildBase : '/',
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
    // Run before Vite hoists the module script into <head>.
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
    // Root SPA fallback: public/404.html (redirect script) is copied to dist/.
    // restoreGithubPagesSpaRedirect in main.ts is a backup after the bundle loads.
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
