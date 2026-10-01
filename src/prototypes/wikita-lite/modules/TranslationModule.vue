<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { CdxButton, CdxCard, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconLanguage } from '@wikimedia/codex-icons'

import type { HomeTranslationSuggestion } from '../../musical-group/data/types'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import WikitaLiteCardSkeletons from '../components/WikitaLiteCardSkeletons.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'
import { MESSAGES, format, t } from '../i18n'

interface Props {
  standalone?: boolean
  items?: HomeTranslationSuggestion[]
  loading?: boolean
  loadingMore?: boolean
  error?: string | null
  previewLimit?: number
  /** Empty card slots held at the end of the grid while the feed loads. */
  skeletons?: number
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  loadingMore: false,
  error: null,
  previewLimit: 2,
  skeletons: 0,
  moreTo: undefined,
})

defineEmits<{
  retry: []
}>()

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

const showMoreLink = computed(
  () => !props.standalone && Boolean(props.moreTo) && displayItems.value.length > 0,
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
    <div v-if="standalone && error && !displayItems.length" class="translation-module__error">
      <p>{{ error }}</p>
      <CdxButton weight="quiet" @click="$emit('retry')">{{ t('common.tryAgain') }}</CdxButton>
    </div>

    <div
      v-if="displayItems.length || skeletons"
      :class="['translation-module__cards', groupClass]"
      :aria-busy="skeletons > 0 || undefined"
    >
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
            {{ format(MESSAGES.translateTo, suggestion.targetLanguageLabel) }}
          </WikitaLiteSupportingRow>
        </template>
      </CdxCard>
      <WikitaLiteCardSkeletons :count="skeletons" />
    </div>

    <slot name="after-cards" />

    <RouterLink
      v-if="showMoreLink && moreTo"
      :to="moreTo"
      class="cdx-button cdx-button--fake-button cdx-button--fake-button--enabled wikita-lite-button-link"
    >
      {{ MESSAGES.showMoreSuggestions }}
    </RouterLink>

    <CdxProgressBar
      v-if="standalone && (loading || loadingMore)"
      inline
      :aria-label="t('home.loadingTranslationSuggestions')"
    />

    <p
      v-if="standalone && !displayItems.length && !loading && !loadingMore && !error"
      class="translation-module__empty"
    >
      {{ t('home.emptyTranslationSuggestions') }}
    </p>
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
