/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />

/** Gerrit change id of the Codex patch installed in node_modules, or null on stock Codex. */
declare const __CODEX_PATCH__: string | null

/** One sibling build of the same deploy (patched or stock), see build-codex-variants.mjs. */
interface CodexBuildVariant {
  id: 'patched' | 'stock'
  label: string
  base: string
  /** Gerrit subject; set on the patched variant when npm run build runs with a patch. */
  patchSubject?: string | null
  /** Gerrit change id; fallback label when subject is missing. */
  patchChange?: string | null
  /** Local dev: switch via POST /__protowiki/codex/switch instead of sibling URL. */
  devSwitch?: boolean
}

/** Gerrit metadata from patches/codex/manifest.json when a patch is committed. */
interface CodexCommittedPatch {
  change: string | null
  subject: string | null
  url: string | null
  stackedChangeCount?: number
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
  /** Present when patches/codex/ holds a patch, even if this bundle runs stock Codex. */
  availablePatch: CodexCommittedPatch | null
  variant: 'patched' | 'stock'
  variants: CodexBuildVariant[]
}

declare const __CODEX_BUILD__: CodexBuildInfo

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
