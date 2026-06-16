<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconChart } from '@wikimedia/codex-icons'

import DashboardModule from '@/components/dashboard/DashboardModule.vue'

interface Props {
  to?: RouteLocationRaw
  currentIndex?: number
  totalCount?: number
  articleTitle?: string
  articleDescription?: string
  thumbnailSrc?: string
  taskTypeLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  currentIndex: 1,
  totalCount: 173745,
  articleTitle: 'Full circle ringing',
  articleDescription: 'Method of hanging (church) bells and …',
  thumbnailSrc: undefined,
  taskTypeLabel: 'Find references',
})
</script>

<template>
  <div class="structured-tasks-module">
    <DashboardModule
      class="structured-tasks-module__variant structured-tasks-module__variant--mobile"
      title="Suggested edits"
      :to="props.to"
      cta="See all suggestions"
      subtle
    >
      <p class="structured-tasks-module__counter">
        {{ props.currentIndex }} of {{ props.totalCount.toLocaleString() }} suggestions
      </p>
      <div class="structured-tasks-module__preview">
        <img
          v-if="props.thumbnailSrc"
          class="structured-tasks-module__thumb"
          :src="props.thumbnailSrc"
          alt=""
          width="48"
          height="48"
        />
        <div class="structured-tasks-module__preview-text">
          <p class="structured-tasks-module__article-title">{{ props.articleTitle }}</p>
          <p class="structured-tasks-module__article-description">
            {{ props.articleDescription }}
          </p>
          <span class="structured-tasks-module__task-type">
            <CdxIcon :icon="cdxIconChart" size="small" class="structured-tasks-module__task-type-icon" />
            {{ props.taskTypeLabel }}
          </span>
        </div>
      </div>
    </DashboardModule>

    <DashboardModule
      class="structured-tasks-module__variant structured-tasks-module__variant--desktop"
      title="Suggested edits"
    >
      <p class="structured-tasks-module__desktop-stub">desktop component not supported</p>
    </DashboardModule>
  </div>
</template>

<style scoped>
/* Follow ancestor data-skin — parity with Dashboard.vue and src/theme.ts */
.structured-tasks-module__variant--mobile {
  display: none;
}

.structured-tasks-module__variant--desktop {
  display: block;
}

[data-skin='mobile'] .structured-tasks-module__variant--mobile {
  display: flex;
}

[data-skin='mobile'] .structured-tasks-module__variant--desktop {
  display: none;
}

.structured-tasks-module__counter {
  margin: 0 0 var(--spacing-75, 12px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}

.structured-tasks-module__preview {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75, 12px);
  padding: var(--spacing-75, 12px);
  background-color: var(--background-color-base, #fff);
  border: 1px solid var(--border-color-subtle, #a2a9b1);
  border-radius: 2px;
}

.structured-tasks-module__thumb {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  object-fit: cover;
  object-position: top;
  border-radius: 2px;
}

.structured-tasks-module__preview-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25, 4px);
}

.structured-tasks-module__article-title {
  margin: 0;
  font-weight: var(--font-weight-bold);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base, #202122);
}

.structured-tasks-module__article-description {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.structured-tasks-module__task-type {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  align-self: flex-end;
  margin-top: var(--spacing-25, 4px);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: #996600;
}

.structured-tasks-module__task-type-icon {
  flex-shrink: 0;
  color: inherit;
}

.structured-tasks-module__desktop-stub {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base--subtle, #54595d);
}
</style>
