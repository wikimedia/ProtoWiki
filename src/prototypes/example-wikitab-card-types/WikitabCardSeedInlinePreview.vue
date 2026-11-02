<script setup lang="ts">
import { computed } from 'vue'

import WikitabCard from '../wikitab/WikitabCard.vue'
import WikitabSearchResultCard from '../wikitab/WikitabSearchResultCard.vue'
import { previewModelForSeedCatalogEntry } from '../wikitab/data/wikitabCardTypeSeedArticle'

const props = defineProps<{
  catalogId: string
}>()

const preview = computed(() => previewModelForSeedCatalogEntry(props.catalogId))

const previewComponent = computed(() => {
  switch (preview.value?.component) {
    case 'WikitabCard':
      return WikitabCard
    case 'WikitabSearchResultCard':
      return WikitabSearchResultCard
    default:
      return null
  }
})

const isWide = computed(() => preview.value?.component === 'WikitabSearchResultCard')
</script>

<template>
  <div
    v-if="preview && previewComponent"
    class="wikitab-card-seed-inline-preview"
    :class="{ 'wikitab-card-seed-inline-preview--wide': isWide }"
  >
    <div class="wikitab wikitab-card-seed-inline-preview__surface">
      <component :is="previewComponent" v-bind="preview.props" />
    </div>
  </div>
  <span v-else class="wikitab-card-seed-inline-preview__missing">—</span>
</template>

<style scoped>
.wikitab-card-seed-inline-preview {
  box-sizing: border-box;
  width: fit-content;
  max-width: 100%;
}

.wikitab-card-seed-inline-preview__surface {
  width: 26rem;
  max-width: 100%;
}

.wikitab-card-seed-inline-preview--wide .wikitab-card-seed-inline-preview__surface {
  width: 36rem;
}

.wikitab-card-seed-inline-preview__missing {
  color: var(--color-subtle);
}
</style>
