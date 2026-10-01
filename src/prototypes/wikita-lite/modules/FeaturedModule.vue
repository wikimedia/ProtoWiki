<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxCard, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconStar } from '@wikimedia/codex-icons'

import type { HomeFeatured } from '../../musical-group/data/types'
import { externalArticleHref } from '../composables/useWikitaLiteCardActions'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import {
  WIKITA_LITE_CARD_CLASS_THUMBNAIL_POSITION_TOP,
  WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE,
} from '../wikita-lite-card'
import { MODULE_TITLES } from '../routes'
import WikitaLiteCardSkeletons from '../components/WikitaLiteCardSkeletons.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'
import { MESSAGES, t } from '../i18n'

interface Props {
  standalone?: boolean
  featuredArticle?: HomeFeatured
  loading?: boolean
  error?: string | null
  previewLimit?: number
  /** Hold the hero card's slot with an empty card while the article loads. */
  skeletons?: number
  listsVersion?: number
  /** `large`: thumbnail beside text; `portrait` (default): full-width image on top. */
  thumbnailLayout?: 'large' | 'portrait'
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  featuredArticle: undefined,
  loading: false,
  error: null,
  previewLimit: 3,
  skeletons: 0,
  listsVersion: 0,
  thumbnailLayout: 'portrait',
})

defineEmits<{
  retry: []
}>()

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}

const thumbnailClass = computed(() => {
  if (!props.featuredArticle?.thumbnailUrl) return ''
  if (props.thumbnailLayout === 'large') return WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE
  return WIKITA_LITE_CARD_CLASS_THUMBNAIL_POSITION_TOP
})

// Featured always shows a single hero card, so it keeps the outlined card
// look even on the fullscreen page — unlike list modules, it never switches
// to the divider-separated standalone treatment.
const { cardClass } = useWikitaLiteCardListClasses()
</script>

<template>
  <div class="featured-module">
    <CdxProgressBar v-if="standalone && loading" inline :aria-label="t('home.loadingFeatured')" />

    <template v-else-if="error">
      <div class="featured-module__error">
        <p>{{ error }}</p>
        <CdxButton weight="quiet" @click="$emit('retry')">{{ t('common.tryAgain') }}</CdxButton>
      </div>
    </template>

    <template v-else>
      <template v-if="featuredArticle">
        <CdxCard
          :class="[thumbnailClass, cardClass]"
          :url="externalArticleHref(featuredArticle)"
          :thumbnail="cardThumbnail(featuredArticle.thumbnailUrl)"
          :force-thumbnail="true"
        >
          <template #title>
            {{ featuredArticle.title }}
          </template>
          <template v-if="featuredArticle.description" #description>
            {{ featuredArticle.description }}
          </template>
          <template #supporting-text>
            <WikitaLiteSupportingRow :icon="cdxIconStar">
              {{
                featuredArticle.machineTranslated
                  ? MESSAGES.machineTranslated
                  : MODULE_TITLES.articleOfTheDay
              }}
            </WikitaLiteSupportingRow>
          </template>
        </CdxCard>

        <slot name="after-cards" />
      </template>

      <div v-else-if="skeletons" aria-busy="true">
        <WikitaLiteCardSkeletons :count="1" />
      </div>

      <p v-else-if="standalone" class="featured-module__empty">
        {{ MESSAGES.emptyFeatured }}
      </p>
    </template>
  </div>
</template>

<style scoped>
.featured-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.featured-module__error,
.featured-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.featured-module__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}
</style>
