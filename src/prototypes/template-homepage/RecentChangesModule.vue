<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconEdit, cdxIconReload } from '@wikimedia/codex-icons'

import DashboardModule from '@/components/DashboardModule.vue'
import type { RouteLocationRaw } from 'vue-router'
import type { RecentChangeFeedItem } from '@/lib/dashpageRecentChangesTypes'
import { DASHPAGE_RC_PREVIEW_MAX } from '@/lib/dashpageRecentChangesConstants'

interface Props {
  to?: RouteLocationRaw
  items?: RecentChangeFeedItem[]
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

const previewItems = computed(() => (props.items ?? []).slice(0, DASHPAGE_RC_PREVIEW_MAX))

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
  <div class="recent-changes-module">
    <DashboardModule
      class="recent-changes-module__variant recent-changes-module__variant--mobile"
      title="Recent changes"
      :to="useLinkCard ? to : undefined"
      :cta="null"
      :mobile-card="!useLinkCard"
    >
      <template v-if="showRefreshInTitle" #header-actions>
        <CdxButton
          weight="quiet"
          :icon-only="true"
          aria-label="Refresh recent changes"
          :disabled="refreshing"
          @click="onRefreshClick"
        >
          <CdxIcon :icon="cdxIconReload" />
        </CdxButton>
      </template>

      <p v-if="refreshError" class="recent-changes-module__error" role="alert">
        {{ refreshError }}
      </p>

      <div v-if="showLoadPrompt" class="recent-changes-module__load-prompt">
        <CdxButton
          action="progressive"
          weight="primary"
          :disabled="refreshing"
          @click.stop="onLoadClick"
        >
          {{ refreshing ? 'Loading…' : 'Load' }}
        </CdxButton>
      </div>

      <template v-else-if="emptyMessage">
        <p class="recent-changes-module__empty">{{ emptyMessage }}</p>
        <CdxButton
          v-if="showRefresh"
          weight="quiet"
          :disabled="refreshing"
          @click.stop="onRefreshClick"
        >
          {{ refreshing ? 'Loading…' : 'Try again' }}
        </CdxButton>
      </template>

      <template v-else-if="hasPreview">
        <div
          v-for="item in previewItems"
          :key="`${item.pageTitle}-${item.revId}`"
          class="recent-changes-module__preview-item"
        >
          <CdxIcon :icon="cdxIconEdit" size="small" class="recent-changes-module__preview-icon" />
          <div class="recent-changes-module__preview-text">
            <span>
              <span class="recent-changes-module__username">{{ item.userName }}</span>
              edited
              <template v-if="item.pageTitle">
                the
                <strong class="recent-changes-module__page">{{ item.pageTitle }}</strong>
                article.
              </template>
              <template v-else>an article.</template>
            </span>
          </div>
        </div>
      </template>
    </DashboardModule>

    <DashboardModule
      class="recent-changes-module__variant recent-changes-module__variant--desktop"
      title="Recent changes"
    >
      <p class="recent-changes-module__desktop-stub">Available on mobile.</p>
    </DashboardModule>
  </div>
</template>

<style scoped>
.recent-changes-module__variant--mobile {
  display: none;
}

.recent-changes-module__variant--desktop {
  display: block;
}

[data-skin='mobile'] .recent-changes-module__variant--mobile {
  display: block;
}

[data-skin='mobile'] .recent-changes-module__variant--desktop {
  display: none;
}

.recent-changes-module__variant--mobile :deep(.dashboard-module__body) {
  padding-top: var(--spacing-100, 16px);
}

.recent-changes-module__load-prompt {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-75, 12px);
  min-height: 6rem;
  padding: var(--spacing-100, 16px) 0;
}

.recent-changes-module__error {
  margin: 0 0 var(--spacing-50, 8px);
  font-size: var(--font-size-small);
  color: var(--color-error, #bf3c2c);
}

.recent-changes-module__empty {
  margin: 0 0 var(--spacing-75, 12px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.recent-changes-module__preview-item {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
  margin-bottom: var(--spacing-50, 8px);
}

.recent-changes-module__preview-item:last-child {
  margin-bottom: 0;
}

.recent-changes-module__preview-icon {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--color-base--subtle, #54595d);
}

.recent-changes-module__preview-text {
  min-width: 0;
  overflow: hidden;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base, #202122);
}

.recent-changes-module__username {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

.recent-changes-module__page {
  font-weight: var(--font-weight-bold, bold);
}

.recent-changes-module__desktop-stub {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}
</style>
