<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxCard, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
  cdxIconStar,
} from '@wikimedia/codex-icons'

import type { HomeFeatured } from '../../musical-group/data/types'
import {
  externalArticleHref,
  useWikitaLiteSaveActions,
} from '../composables/useWikitaLiteCardActions'
import WikitaLiteCardWithAction from '../components/WikitaLiteCardWithAction.vue'

interface Props {
  standalone?: boolean
  featuredArticle?: HomeFeatured
  loading?: boolean
  error?: string | null
  previewLimit?: number
  listsVersion?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  featuredArticle: undefined,
  loading: false,
  error: null,
  previewLimit: 3,
  listsVersion: 0,
})

defineEmits<{
  retry: []
}>()

const listsVersionRef = computed(() => props.listsVersion)

const { relatedReadingSaved, relatedReadingInList, onRelatedReadingSave } =
  useWikitaLiteSaveActions(listsVersionRef)

function saveIcon(itemId: string) {
  if (relatedReadingInList(itemId)) return cdxIconBookmarkList
  return relatedReadingSaved(itemId) ? cdxIconBookmark : cdxIconBookmarkOutline
}

function saveLabel(itemId: string): string {
  return relatedReadingSaved(itemId) ? 'Saved' : 'Save'
}

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}
</script>

<template>
  <div class="featured-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading featured" />

    <template v-else-if="error">
      <div class="featured-module__error">
        <p>{{ error }}</p>
        <CdxButton weight="quiet" @click="$emit('retry')">Try again</CdxButton>
      </div>
    </template>

    <template v-else>
      <WikitaLiteCardWithAction
        v-if="featuredArticle?.itemId"
        :url="externalArticleHref(featuredArticle)"
        :title="featuredArticle.title"
        :description="featuredArticle.description"
        supporting-text="Article of the day"
        :supporting-icon="cdxIconStar"
        :thumbnail-url="featuredArticle.thumbnailUrl"
        :force-thumbnail="true"
        :action-label="saveLabel(featuredArticle.itemId)"
        :action-icon="saveIcon(featuredArticle.itemId)"
        @action-click="
          onRelatedReadingSave(
            featuredArticle.itemId,
            featuredArticle.title,
            featuredArticle.thumbnailUrl,
          )
        "
      />

      <CdxCard
        v-else-if="featuredArticle"
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
          <CdxIcon :icon="cdxIconStar" size="small" />
          Article of the day
        </template>
      </CdxCard>

      <p v-else-if="standalone" class="featured-module__empty">
        No featured article is available right now.
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
