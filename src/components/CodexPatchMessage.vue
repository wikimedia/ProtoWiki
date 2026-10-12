<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CdxButton, CdxIcon, CdxMessage } from '@wikimedia/codex'
import { cdxIconLinkExternal } from '@wikimedia/codex-icons'

const build = __CODEX_BUILD__
const route = useRoute()

const dismissed = ref(false)

const sibling = computed(() => build.variants.find((variant) => variant.id !== build.variant))
const visible = computed(
  () => !dismissed.value && (build.patch !== null || sibling.value !== undefined),
)

const patchLinkLabel = computed(() => {
  const patch = build.patch
  if (!patch) return null
  if (patch.subject) return patch.subject
  if (patch.change) return `Gerrit change ${patch.change}`
  return 'View change'
})

function patchNameForVariant(variant: CodexBuildVariant): string {
  if (variant.patchSubject) return variant.patchSubject
  if (variant.patchChange) return `Gerrit change ${variant.patchChange}`
  return variant.label
}

const siblingButtonLabel = computed(() => {
  const s = sibling.value
  if (!s) return ''
  if (s.id === 'stock') return 'Open with unmodified Codex'
  const name =
    patchNameForVariant(s) ||
    patchLinkLabel.value ||
    s.label
  return `Open with Codex patch: “${name}”`
})

function siblingHref(base: string): string {
  const path = base.replace(/\/$/, '') + route.fullPath
  // Absolute path so GitHub Pages / preview subpaths resolve correctly.
  if (path.startsWith('/')) {
    return path
  }
  return `/${path}`
}

/** Stock/patched previews are separate Vite builds; Vue Router must not handle this. */
function openSibling(event: MouseEvent) {
  const s = sibling.value
  if (!s) return
  event.preventDefault()
  window.location.assign(siblingHref(s.base))
}
</script>

<template>
  <CdxMessage
    v-if="visible"
    type="notice"
    :allow-user-dismiss="true"
    @user-dismissed="dismissed = true"
  >
    <div class="codex-patch-message">
      <div class="codex-patch-message__text">
        <template v-if="build.patch">
          ProtoWiki is running with a modified version of Codex.
          <template v-if="patchLinkLabel">
            <br>
            <a
              v-if="build.patch.url"
              class="codex-patch-message__link"
              :href="build.patch.url"
              target="_blank"
              rel="noopener"
            >“{{ patchLinkLabel }}”<CdxIcon :icon="cdxIconLinkExternal" size="small" /></a>
            <span v-else>“{{ patchLinkLabel }}”</span>
          </template>
        </template>
        <template v-else>
          ProtoWiki is running stock Codex.
        </template>
      </div>
      <CdxButton
        v-if="sibling"
        class="codex-patch-message__variant-button"
        tag="a"
        :href="siblingHref(sibling.base)"
        action="progressive"
        weight="normal"
        @click="openSibling"
      >
        {{ siblingButtonLabel }}
      </CdxButton>
    </div>
  </CdxMessage>
</template>

<style scoped>
.codex-patch-message {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50);
}

.codex-patch-message__link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  color: var(--color-progressive);
  text-decoration: none;
}

.codex-patch-message__link:hover {
  text-decoration: underline;
}

.codex-patch-message__link :deep(.cdx-icon) {
  color: var(--color-progressive);
}

.codex-patch-message__variant-button {
  display: inline-flex;
}
</style>
