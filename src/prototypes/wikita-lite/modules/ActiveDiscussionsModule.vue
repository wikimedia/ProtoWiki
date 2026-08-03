<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxCard, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconSpeechBubble } from '@wikimedia/codex-icons'

import type { HomeActiveDiscussion } from '../../musical-group/data/types'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'

interface Props {
  standalone?: boolean
  items?: HomeActiveDiscussion[]
  loading?: boolean
  error?: string | null
  previewLimit?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  error: null,
  previewLimit: 3,
})

defineEmits<{
  retry: []
}>()

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)
</script>

<template>
  <div class="active-discussions-module">
    <CdxProgressBar
      v-if="standalone && loading"
      inline
      aria-label="Loading active discussions"
    />

    <template v-else-if="error">
      <div class="active-discussions-module__error">
        <p>{{ error }}</p>
        <CdxButton weight="quiet" @click="$emit('retry')">Try again</CdxButton>
      </div>
    </template>

    <template v-else>
      <CdxCard
        v-for="discussion in displayItems"
        :key="discussion.id"
        :url="discussion.discussionUrl"
      >
        <template #title>
          {{ discussion.noticeboardTitle }}
        </template>
        <template #description>
          {{ discussion.title }}
        </template>
        <template #supporting-text>
          <WikitaLiteSupportingRow :icon="cdxIconSpeechBubble">
            {{ discussion.latestCommentLabel }}
          </WikitaLiteSupportingRow>
        </template>
      </CdxCard>

      <p v-if="standalone && !displayItems.length" class="active-discussions-module__empty">
        No active discussions right now.
      </p>
    </template>
  </div>
</template>

<style scoped>
.active-discussions-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.active-discussions-module__error,
.active-discussions-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.active-discussions-module__error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
}
</style>
