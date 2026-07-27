<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxProgressBar } from '@wikimedia/codex'
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
import WikitaLiteCard from '../components/WikitaLiteCard.vue'

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
      <WikitaLiteCard
        v-if="featuredArticle"
        show-flag
        flag="Article of the day"
        :flag-icon="cdxIconStar"
        flag-color="success"
        :title="featuredArticle.title"
        :subtitle="featuredArticle.description"
        :show-subtitle="Boolean(featuredArticle.description)"
        :show-thumbnail="Boolean(featuredArticle.thumbnailUrl)"
        :thumbnail-url="featuredArticle.thumbnailUrl"
        :thumbnail-alt="featuredArticle.title"
        :external-href="externalArticleHref(featuredArticle)"
        :show-top-action="Boolean(featuredArticle.itemId)"
        :top-action-label="featuredArticle.itemId ? saveLabel(featuredArticle.itemId) : ''"
        :top-action-icon="featuredArticle.itemId ? saveIcon(featuredArticle.itemId) : undefined"
        @top-action-click="
          () =>
            featuredArticle.itemId &&
            onRelatedReadingSave(
              featuredArticle.itemId,
              featuredArticle.title,
              featuredArticle.thumbnailUrl,
            )
        "
      />

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
