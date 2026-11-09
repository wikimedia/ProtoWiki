// Dev server: fresh Codex build info + switch stock/patched without restarting Vite.

import { hasPatch } from './lib-codex-patch.mjs'
import { readCodexBuildInfo } from './lib-codex-build-info.mjs'
import { clearViteCache, ensureCodex } from './lib-codex-state.mjs'

const BUILD_INFO_PATH = '/__protowiki/codex/build-info'
const SWITCH_PATH = '/__protowiki/codex/switch'

function invalidateCodexModules(server) {
  for (const mod of server.moduleGraph.idToModuleMap.values()) {
    const id = mod.id
    if (id && id.includes('@wikimedia/codex')) {
      server.moduleGraph.invalidateModule(mod)
    }
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })
    req.on('error', reject)
  })
}

export function protowikiCodexDevSwitch() {
  return {
    name: 'protowiki-codex-dev-switch',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split('?')[0]
        if (url === BUILD_INFO_PATH && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(readCodexBuildInfo({ isDevServer: true }).codexBuild))
          return
        }

        if (url !== SWITCH_PATH || req.method !== 'POST') {
          next()
          return
        }

        if (!hasPatch()) {
          res.statusCode = 400
          res.end('No patch in patches/codex/')
          return
        }

        let body
        try {
          body = await readJsonBody(req)
        } catch {
          res.statusCode = 400
          res.end('Invalid JSON body')
          return
        }

        const target = body.target
        if (target !== 'stock' && target !== 'patched') {
          res.statusCode = 400
          res.end('Body must include target: "stock" | "patched"')
          return
        }

        try {
          await ensureCodex(target === 'patched', { log: console.log.bind(console) })
          clearViteCache()
          invalidateCodexModules(server)
          res.statusCode = 204
          res.end()
        } catch (error) {
          res.statusCode = 500
          res.end(error instanceof Error ? error.message : String(error))
        }
      })
    },
  }
}
