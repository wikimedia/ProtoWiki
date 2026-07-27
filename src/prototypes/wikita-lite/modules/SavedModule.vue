<script setup lang="ts">
import { computed } from 'vue'

import { CdxProgressBar } from '@wikimedia/codex'

import type { HomeSavedItem } from '../../musical-group/data/types'
import { savedItemHref } from '../composables/useWikitaLiteCardActions'
import WikitaLiteCard from '../components/WikitaLiteCard.vue'

interface Props {
  standalone?: boolean
  items?: HomeSavedItem[]
  loading?: boolean
  previewLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 5,
})

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)
</script>

<template>
  <div class="saved-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading saved pages" />

    <template v-else>
      <WikitaLiteCard
        v-for="item in displayItems"
        :key="item.id"
        :title="item.title"
        :subtitle="item.description"
        :show-subtitle="Boolean(item.description)"
        :show-thumbnail="Boolean(item.thumbnailUrl)"
        :thumbnail-url="item.thumbnailUrl"
        :thumbnail-alt="item.title"
        :external-href="savedItemHref(item)"
      />

      <p v-if="standalone && !displayItems.length && !loading" class="saved-module__empty">
        You have not saved any pages yet.
      </p>
    </template>
  </div>
</template>

<style scoped>
.saved-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.saved-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
