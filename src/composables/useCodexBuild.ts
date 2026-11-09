import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import { CODEX_DEV_SWITCH_PATH, codexRuntimeBuild, getCodexBuildInfo } from '@/codex-build'

/** Restore Codex settings popover after reload or deploy variant navigation. */
export const CODEX_SETTINGS_POPOVER_OPEN_KEY = 'protowiki.settings-popover.codex'

function persistCodexSettingsPopoverOpen(): void {
  try {
    sessionStorage.setItem(CODEX_SETTINGS_POPOVER_OPEN_KEY, '1')
  } catch {
    /* ignore */
  }
}

function patchDisplayName(patch: CodexCommittedPatch): string {
  if (patch.subject) return patch.subject
  if (patch.change) return `Gerrit change ${patch.change}`
  return 'View change'
}

export function stackedChangesDescription(count: number): string | null {
  if (count <= 0) return null
  if (count === 1) return '+1 stacked change'
  return `+${count} stacked changes`
}

export function useCodexBuild() {
  const route = useRoute()
  const switching = ref(false)
  const switchError = ref<string | null>(null)

  const build = computed(() => {
    void codexRuntimeBuild.value
    return getCodexBuildInfo()
  })

  const sibling = computed(() =>
    build.value.variants.find((variant) => variant.id !== build.value.variant),
  )

  const canToggleVariant = computed(() => build.value.variants.length > 1)

  const usePatchedCodex = computed(() => build.value.variant === 'patched')

  const committedPatch = computed(() => build.value.availablePatch)

  const hasCommittedPatch = computed(() => committedPatch.value !== null)

  /** At most one patch today; list shape leaves room for more later. */
  const committedPatches = computed(() => {
    const patch = committedPatch.value
    if (!patch) return []
    const stackedChangeCount = patch.stackedChangeCount ?? 0
    return [
      {
        id: patch.change ?? 'committed-patch',
        label: patchDisplayName(patch),
        url: patch.url,
        stackedChangeCount,
      },
    ]
  })

  const stockStatusLine = computed(() => {
    const base = `ProtoWiki is running Codex ${build.value.codexVersion}`
    if (hasCommittedPatch.value) {
      return `${base} with no modifications.`
    }
    return `${base}.`
  })

  const patchedStatusLine = computed(
    () =>
      `ProtoWiki is running a modified version of Codex\u00a0${build.value.codexVersion}.`,
  )

  const runtimeStatusLine = computed(() =>
    usePatchedCodex.value ? patchedStatusLine.value : stockStatusLine.value,
  )

  function siblingHref(base: string): string {
    const path = base.replace(/\/$/, '') + route.fullPath
    // Absolute path so GitHub Pages / preview subpaths resolve correctly.
    if (path.startsWith('/')) {
      return path
    }
    return `/${path}`
  }

  async function setUsePatchedCodex(usePatch: boolean): Promise<void> {
    const target = usePatch ? 'patched' : 'stock'
    if (build.value.variant === target || switching.value) return

    const destination = build.value.variants.find((variant) => variant.id === target)
    if (!destination) return

    switching.value = true
    switchError.value = null

    if (destination.devSwitch) {
      try {
        const response = await fetch(CODEX_DEV_SWITCH_PATH, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ target }),
        })
        if (!response.ok) {
          const detail = await response.text()
          throw new Error(detail || `Switch failed (${response.status})`)
        }
        persistCodexSettingsPopoverOpen()
        window.location.reload()
      } catch (error) {
        switching.value = false
        switchError.value =
          error instanceof Error ? error.message : 'Failed to switch Codex build'
      }
      return
    }

    persistCodexSettingsPopoverOpen()
    window.location.assign(siblingHref(destination.base))
  }

  return {
    build,
    sibling,
    canToggleVariant,
    usePatchedCodex,
    hasCommittedPatch,
    stockStatusLine,
    patchedStatusLine,
    runtimeStatusLine,
    committedPatches,
    setUsePatchedCodex,
    switching,
    switchError,
  }
}
