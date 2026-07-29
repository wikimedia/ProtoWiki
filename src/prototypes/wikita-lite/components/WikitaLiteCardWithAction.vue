<script setup lang="ts">
import { computed, useId } from 'vue'

import { CdxButton, CdxCard, CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

import WikitaLiteSupportingRow from './WikitaLiteSupportingRow.vue'

interface Props {
  url?: string
  title: string
  description?: string
  supportingText?: string
  supportingIcon?: Icon
  thumbnailUrl?: string
  forceThumbnail?: boolean
  actionLabel: string
  actionIcon?: Icon
}

const props = withDefaults(defineProps<Props>(), {
  url: undefined,
  description: undefined,
  supportingText: undefined,
  supportingIcon: undefined,
  thumbnailUrl: undefined,
  forceThumbnail: true,
  actionIcon: undefined,
})

defineEmits<{
  'action-click': [event: MouseEvent]
}>()

const titleId = useId()

const hasLink = computed(() => Boolean(props.url?.trim()))

const thumbnail = computed(() =>
  props.thumbnailUrl?.trim() ? { url: props.thumbnailUrl.trim() } : null,
)

const showSupporting = computed(
  () => Boolean(props.supportingText?.trim() || props.supportingIcon),
)

function onActionClick(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
}
</script>

<template>
  <article
    class="wikita-lite-card-with-action"
    :class="{ 'wikita-lite-card-with-action--linked': hasLink }"
  >
    <a
      v-if="hasLink"
      :href="url"
      class="wikita-lite-card-with-action__cover-link"
      :aria-labelledby="titleId"
      target="_blank"
      rel="noopener noreferrer"
    />

    <CdxCard
      class="wikita-lite-card-with-action__card"
      :thumbnail="thumbnail"
      :force-thumbnail="forceThumbnail"
    >
      <template #title>
        <span :id="titleId">{{ title }}</span>
      </template>

      <template v-if="description" #description>
        <span class="wikita-lite-card-with-action__description">{{ description }}</span>
      </template>

      <template v-if="showSupporting || actionLabel" #supporting-text>
        <div class="wikita-lite-card-with-action__footer">
          <WikitaLiteSupportingRow
            v-if="showSupporting"
            class="wikita-lite-card-with-action__supporting"
            :icon="supportingIcon"
          >
            {{ supportingText }}
          </WikitaLiteSupportingRow>
          <CdxButton
            class="wikita-lite-card-with-action__action"
            weight="normal"
            @click="onActionClick($event); $emit('action-click', $event)"
          >
            <CdxIcon v-if="actionIcon" :icon="actionIcon" />
            {{ actionLabel }}
          </CdxButton>
        </div>
      </template>
    </CdxCard>
  </article>
</template>

<style scoped>
.wikita-lite-card-with-action {
  position: relative;
  display: block;
  width: 100%;
}

.wikita-lite-card-with-action__cover-link {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  color: inherit;
  text-decoration: none;
}

.wikita-lite-card-with-action__cover-link:focus-visible {
  outline: 2px solid var(--color-progressive);
  outline-offset: 2px;
}

.wikita-lite-card-with-action__card {
  position: relative;
  z-index: 1;
  width: 100%;
  pointer-events: none;
}

.wikita-lite-card-with-action__description {
  display: block;
}

.wikita-lite-card-with-action__footer {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  width: 100%;
}

.wikita-lite-card-with-action__supporting {
  width: 100%;
}

.wikita-lite-card-with-action__action {
  pointer-events: auto;
  align-self: flex-start;
  margin-top: var(--spacing-50, 8px);
}

.wikita-lite-card-with-action :deep(.cdx-card__text__supporting-text) {
  display: block;
  width: 100%;
}
</style>
