<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { CdxIcon, CdxMessage } from '@wikimedia/codex'
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

function siblingHref(base: string): string {
  return base.replace(/\/$/, '') + route.fullPath
}
</script>

<template>
  <CdxMessage
    v-if="visible"
    type="notice"
    :allow-user-dismiss="true"
    @user-dismissed="dismissed = true"
  >
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
    <template v-if="sibling">
      <br>
      <a :href="siblingHref(sibling.base)">
        View with {{ sibling.id === 'stock' ? 'stock Codex' : sibling.label }}
      </a>
    </template>
  </CdxMessage>
</template>

<style scoped>
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
</style>
