import { shallowRef, type ShallowRef } from 'vue'

/** Dev-only runtime build info (after patch toggle); null until loaded. */
export const codexRuntimeBuild: ShallowRef<CodexBuildInfo | null> = shallowRef(null)

export function setCodexBuildInfo(info: CodexBuildInfo): void {
  codexRuntimeBuild.value = info
}

export function getCodexBuildInfo(): CodexBuildInfo {
  return codexRuntimeBuild.value ?? __CODEX_BUILD__
}

/** Gerrit change id for `html[data-codex-patched]`, or null on stock Codex. */
export function getCodexPatchChangeId(): string | null {
  const patch = getCodexBuildInfo().patch
  if (!patch) return null
  return patch.change ? String(patch.change) : 'patched'
}

export async function loadCodexBuildInfoForDev(): Promise<void> {
  if (!import.meta.env.DEV) return
  const response = await fetch('/__protowiki/codex/build-info')
  if (!response.ok) {
    throw new Error(`Failed to load Codex build info (${response.status})`)
  }
  setCodexBuildInfo(await response.json())
}

export const CODEX_DEV_SWITCH_PATH = '/__protowiki/codex/switch'
