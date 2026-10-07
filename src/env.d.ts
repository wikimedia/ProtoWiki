/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />

/** Gerrit change id of the Codex patch installed in node_modules, or null on stock Codex. */
declare const __CODEX_PATCH__: string | null

/** One sibling build of the same deploy (patched or stock), see build-codex-variants.mjs. */
interface CodexBuildVariant {
  id: 'patched' | 'stock'
  label: string
  base: string
}

/** What Codex this bundle was built with, plus the other variants deployed alongside it. */
interface CodexBuildInfo {
  codexVersion: string
  patch: {
    change: string | null
    patchset: number | null
    subject: string | null
    url: string | null
  } | null
  variant: 'patched' | 'stock'
  variants: CodexBuildVariant[]
}

declare const __CODEX_BUILD__: CodexBuildInfo

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, any>
  export default component
}
