<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton } from '@wikimedia/codex'

import { useSkin } from '@/composables/useSkin'

const props = defineProps<{
  canShowMore?: boolean
  showMoreDisabled?: boolean
  showRefresh?: boolean
  /**
   * Fullscreen module screen: no Show more (infinite scroll); Refresh still
   * shows when a saved-fingerprint reload is due. Home mobile uses
   * `WikitabModuleRefreshCard` in the scroller instead.
   */
  screen?: boolean
}>()

const emit = defineEmits<{
  'show-more': []
  refresh: []
}>()

const skin = useSkin()

/**
 * Desktop home by default. When a saved-fingerprint Refresh is due, it replaces
 * Show more. Fullscreen (`screen`) never shows Show more — only Refresh.
 */
const visible = computed(() => {
  if (props.screen) return Boolean(props.showRefresh)
  return (
    skin.value === 'desktop' &&
    (Boolean(props.showRefresh) || Boolean(props.canShowMore))
  )
})
</script>

<template>
  <div v-if="visible" class="wikitab-module-more">
    <CdxButton
      v-if="showRefresh"
      class="wikitab-module-more__refresh"
      weight="quiet"
      @click="emit('refresh')"
    >
      Refresh
    </CdxButton>
    <CdxButton
      v-else
      class="wikitab-module-more__show"
      action="progressive"
      weight="quiet"
      :disabled="showMoreDisabled"
      @click="emit('show-more')"
    >
      Show more
    </CdxButton>
  </div>
</template>

<style scoped>
.wikitab-module-more {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: var(--line-height-small);
  margin-top: var(--spacing-100);
}
</style>
