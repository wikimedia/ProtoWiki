<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { RouteLocationRaw } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconReload } from '@wikimedia/codex-icons'

import DashboardModule from '@/components/DashboardModule.vue'

import SuggestionFeedItem from './SuggestionFeedItem.vue'
import type { SuggestionFeedItem as SuggestionFeedItemType } from './useDashpageSuggestionModule'

import './recent-changes-feed.css'
import './suggestion-feed.css'

interface Props {
  to?: RouteLocationRaw
  items?: SuggestionFeedItemType[]
  loadPending?: boolean
  showRefresh?: boolean
  refreshing?: boolean
  refreshError?: string | null
  emptyMessage?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
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

const previewItems = computed(() => props.items ?? [])

const hasPreview = computed(() => previewItems.value.length > 0)

const showLoadPrompt = computed(() => props.loadPending && !hasPreview.value)

const isLinkCard = computed(() => props.to != null)

const useLinkCard = computed(() => isLinkCard.value && hasPreview.value)

const showRefreshInTitle = computed(
  () => props.showRefresh && !showLoadPrompt.value && !useLinkCard.value,
)

function onRefreshClick(event: Event): void {
  event.preventDefault()
  event.stopPropagation()
  emit('refresh')
}

function onLoadClick(): void {
  emit('load')
}
</script>

<template>
  <div class="suggestion-feed-module">
    <DashboardModule
      class="suggestion-feed-module__variant suggestion-feed-module__variant--mobile"
      title="Suggested edits"
      :to="useLinkCard ? to : undefined"
      :cta="useLinkCard ? 'See all suggestions' : null"
      :mobile-card="!useLinkCard"
    >
      <template v-if="showRefreshInTitle" #header-actions>
        <CdxButton
          weight="quiet"
          :icon-only="true"
          aria-label="Refresh suggestions"
          :disabled="refreshing"
          @click="onRefreshClick"
        >
          <CdxIcon :icon="cdxIconReload" />
        </CdxButton>
      </template>

      <p v-if="refreshError" class="suggestion-feed-module__error" role="alert">
        {{ refreshError }}
      </p>

      <div v-if="showLoadPrompt" class="suggestion-feed-module__load-prompt">
        <CdxButton
          action="progressive"
          weight="primary"
          :disabled="refreshing"
          @click.stop="onLoadClick"
        >
          {{ refreshing ? 'Loading…' : 'Load' }}
        </CdxButton>
        <RouterLink v-if="isLinkCard" :to="to!" class="suggestion-feed-module__see-all">
          See all suggestions
        </RouterLink>
      </div>

      <template v-else-if="emptyMessage">
        <p class="suggestion-feed-module__empty">{{ emptyMessage }}</p>
        <CdxButton
          v-if="showRefresh"
          weight="quiet"
          :disabled="refreshing"
          @click.stop="onRefreshClick"
        >
          {{ refreshing ? 'Loading…' : '' }}
        </CdxButton>
      </template>

      <template v-else-if="hasPreview">
        <ul class="suggestion-feed-module__feed">
          <SuggestionFeedItem v-for="item in previewItems" :key="item.id" :item="item" preview />
        </ul>
      </template>
    </DashboardModule>

    <DashboardModule
      class="suggestion-feed-module__variant suggestion-feed-module__variant--desktop"
      title="Suggested edits"
    >
      <p class="suggestion-feed-module__desktop-stub">desktop component not supported</p>
    </DashboardModule>
  </div>
</template>

<style scoped>
.suggestion-feed-module__variant--mobile {
  display: none;
}

.suggestion-feed-module__variant--desktop {
  display: block;
}

[data-skin='mobile'] .suggestion-feed-module__variant--mobile {
  display: block;
}

[data-skin='mobile'] .suggestion-feed-module__variant--desktop {
  display: none;
}

.suggestion-feed-module__load-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-75, 12px);
  min-height: 8rem;
  padding: var(--spacing-100, 16px) 0;
}

.suggestion-feed-module__see-all {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.suggestion-feed-module__see-all:hover {
  text-decoration: underline;
}

.suggestion-feed-module__error {
  margin: 0 0 var(--spacing-50, 8px);
  font-size: var(--font-size-small);
  color: var(--color-error, #bf3c2c);
}

.suggestion-feed-module__empty {
  margin: 0 0 var(--spacing-75, 12px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.suggestion-feed-module__desktop-stub {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}
</style>
