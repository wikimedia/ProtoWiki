<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxCard, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconLanguage } from '@wikimedia/codex-icons'

import type { HomeTranslationSuggestion } from '../../musical-group/data/types'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  items?: HomeTranslationSuggestion[]
  loading?: boolean
  error?: string | null
  previewLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  error: null,
  previewLimit: 2,
})

defineEmits<{
  retry: []
}>()

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

const { groupClass, cardClass } = useWikitaLiteCardListClasses({
  standalone: () => props.standalone,
})

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}
</script>

<template>
  <div class="translation-module">
    <CdxProgressBar v-if="standalone && loading" inline aria-label="Loading translation suggestions" />

    <template v-else-if="error">
      <div class="translation-module__error">
        <p>{{ error }}</p>
        <CdxButton weight="quiet" @click="$emit('retry')">Try again</CdxButton>
      </div>
    </template>

    <template v-else>
      <div :class="['translation-module__cards', groupClass]">
        <CdxCard
          v-for="suggestion in displayItems"
          :key="suggestion.id"
          :class="cardClass"
          :url="suggestion.translationUrl"
          :thumbnail="cardThumbnail(suggestion.thumbnailUrl)"
          :force-thumbnail="true"
        >
          <template #title>
            {{ suggestion.title }}
          </template>
          <template v-if="suggestion.description" #description>
            {{ suggestion.description }}
          </template>
          <template #supporting-text>
            <WikitaLiteSupportingRow :icon="cdxIconLanguage">
              Translate to {{ suggestion.targetLanguageLabel }}
            </WikitaLiteSupportingRow>
          </template>
        </CdxCard>
      </div>

      <p v-if="standalone && !displayItems.length" class="translation-module__empty">
        No translation suggestions right now.
      </p>
    </template>
  </div>
</template>

<style scoped>
.translation-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.translation-module__cards {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.translation-module__error,
.translation-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.translation-module__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}
</style>
