<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton } from '@wikimedia/codex'

import SuggestionFeedItem from './SuggestionFeedItem.vue'
import type { SuggestionFeedItem as SuggestionFeedItemType } from './useDashpageSuggestionModule'

import './recent-changes-feed.css'
import './suggestion-feed.css'

interface Props {
  items?: SuggestionFeedItemType[]
  loadPending?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  emptyMessage?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  items: undefined,
  loadPending: false,
  showRefresh: false,
  refreshing: false,
  refreshError: undefined,
  emptyMessage: undefined,
})

const emit = defineEmits<{
  load: []
  refresh: []
}>()

const feedItems = computed(() => props.items ?? [])

const showLoadPrompt = computed(() => props.loadPending && !feedItems.value.length)

function onLoadClick(): void {
  emit('load')
}

function onRefreshClick(): void {
  emit('refresh')
}
</script>

<template>
  <div class="review-changes-view">
    <p v-if="refreshError" class="review-changes-view__error" role="alert">
      {{ refreshError }}
    </p>

    <div v-if="showLoadPrompt" class="review-changes-view__load-prompt">
      <CdxButton
        action="progressive"
        weight="primary"
        :disabled="refreshing"
        @click="onLoadClick"
      >
        {{ refreshing ? 'Loading…' : 'Load' }}
      </CdxButton>
    </div>

    <ul v-if="feedItems.length" class="review-changes__feed">
      <SuggestionFeedItem
        v-for="item in feedItems"
        :key="item.id"
        :item="item"
      />
    </ul>

    <div v-else-if="emptyMessage && !showLoadPrompt" class="review-changes-view__empty-state">
      <p class="review-changes-view__empty">{{ emptyMessage }}</p>
      <div v-if="showRefresh" class="review-changes-view__empty-actions">
        <CdxButton weight="quiet" :disabled="refreshing" @click="onRefreshClick">
          {{ refreshing ? 'Loading…' : 'Try again' }}
        </CdxButton>
      </div>
    </div>
  </div>
</template>
