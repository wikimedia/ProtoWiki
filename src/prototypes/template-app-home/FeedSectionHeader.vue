<script setup lang="ts">
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconEllipsis } from '@wikimedia/codex-icons'

interface Props {
  heading: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  description: undefined,
})
</script>

<template>
  <div class="feed-section-header">
    <div class="feed-section-header__text">
      <h3 class="feed-section-header__heading">
        {{ heading }}
      </h3>
      <p
        v-if="description"
        class="feed-section-header__description"
      >
        {{ description }}
      </p>
    </div>
    <CdxButton
      weight="quiet"
      aria-label="More options"
    >
      <CdxIcon :icon="cdxIconEllipsis" />
    </CdxButton>
  </div>
</template>

<style scoped>
.feed-section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50, 8px);
  margin-bottom: calc(-1 * var(--spacing-50, 8px));
}

.feed-section-header__text {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-12, 2px);
  min-width: 0;
}

.feed-section-header__heading {
  margin: 0;
  font-size: var(--font-size-large, 1.125rem);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-base, #202122);
}

.feed-section-header__description {
  margin: 0;
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small, 0.875rem);
}
</style>
