<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

const emit = defineEmits<{
  refresh: []
}>()

function onRefresh(event: MouseEvent): void {
  const card = event.currentTarget as HTMLElement | null
  const row = card?.parentElement
  if (row) row.scrollLeft = 0
  emit('refresh')
}
</script>

<template>
  <!--
    Quiet progressive CdxButton stretched to a feed-card slot. Rest fill is
    neutral-subtle (card chrome); hover / active / focus come from Codex.
  -->
  <CdxButton
    class="wikitab-module-refresh-card"
    action="progressive"
    weight="quiet"
    @click="onRefresh"
  >
    <CdxIcon :icon="cdxIconReload" />
    Refresh
  </CdxButton>
</template>

<style scoped>
.wikitab-module-refresh-card {
  flex: 0 0 320px;
  /* Match sibling card height via the row’s stretch — never set the floor. */
  align-self: stretch;
  box-sizing: border-box;
  max-width: none;
  min-height: 0;
  height: auto;
  scroll-snap-align: start;
}

/*
 * Quiet Codex rest is transparent (higher specificity than a single class).
 * Keep the card chrome at rest; leave :hover / :active to Codex progressive-subtle.
 */
.wikitab-module-refresh-card.cdx-button:enabled:not(:hover):not(:active):not(
    .cdx-button--is-active
  ) {
  background-color: var(--background-color-neutral-subtle);
}
</style>
