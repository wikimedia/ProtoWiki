<script setup lang="ts">
import { computed, inject, useId } from 'vue'

import { CdxCard, CdxInfoChip } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

import WikitaLiteSupportingRow from './WikitaLiteSupportingRow.vue'
import {
  WIKITA_LITE_CARD_CLASS_SEPARATION_DIVIDER,
  WIKITA_LITE_CARD_CLASS_SEPARATION_NONE,
  WIKITA_LITE_CARD_SEPARATION,
  type WikitaLiteCardSeparation,
} from '../wikita-lite-card'

export type WikitaLiteChipStatus = 'notice' | 'warning' | 'error' | 'success'

export interface WikitaLiteChip {
  label: string
  icon?: Icon
  status?: WikitaLiteChipStatus
}

interface Props {
  url?: string
  chips: WikitaLiteChip[]
  title: string
  description?: string
  supportingText?: string
  supportingIcon?: Icon
  thumbnailUrl?: string
  forceThumbnail?: boolean
  separation?: WikitaLiteCardSeparation
}

const props = withDefaults(defineProps<Props>(), {
  url: undefined,
  description: undefined,
  supportingText: undefined,
  supportingIcon: undefined,
  thumbnailUrl: undefined,
  forceThumbnail: true,
})

const injectedSeparation = inject(WIKITA_LITE_CARD_SEPARATION, null)

const resolvedSeparation = computed(
  (): WikitaLiteCardSeparation => props.separation ?? injectedSeparation?.value ?? 'outline',
)

const shellSeparationClass = computed(() => {
  if (resolvedSeparation.value === 'divider') return 'wikita-lite-card-with-chip--separation-divider'
  if (resolvedSeparation.value === 'none') return 'wikita-lite-card-with-chip--separation-none'
  return ''
})

const cardSeparationClass = computed(() => {
  if (resolvedSeparation.value === 'divider') return WIKITA_LITE_CARD_CLASS_SEPARATION_DIVIDER
  if (resolvedSeparation.value === 'none') return WIKITA_LITE_CARD_CLASS_SEPARATION_NONE
  return ''
})

const titleId = useId()

const hasLink = computed(() => Boolean(props.url?.trim()))

const thumbnail = computed(() =>
  props.thumbnailUrl?.trim() ? { url: props.thumbnailUrl.trim() } : null,
)

const showSupporting = computed(
  () => Boolean(props.supportingText?.trim() || props.supportingIcon),
)
</script>

<template>
  <article
    class="wikita-lite-card-with-chip"
    :class="[
      {
        'wikita-lite-card-with-chip--linked': hasLink,
      },
      shellSeparationClass,
    ]"
  >
    <a
      v-if="hasLink"
      :href="url"
      class="wikita-lite-card-with-chip__cover-link"
      :aria-labelledby="titleId"
      target="_blank"
      rel="noopener noreferrer"
    />

    <div class="wikita-lite-card-with-chip__shell">
      <div v-if="chips.length" class="wikita-lite-card-with-chip__chips">
        <CdxInfoChip
          v-for="(chip, index) in chips"
          :key="`${chip.label}-${index}`"
          class="wikita-lite-card-with-chip__chip"
          :status="chip.status ?? 'notice'"
          :icon="chip.icon"
        >
          {{ chip.label }}
        </CdxInfoChip>
      </div>

      <CdxCard
        class="wikita-lite-card-with-chip__card"
        :class="cardSeparationClass"
        :thumbnail="thumbnail"
        :force-thumbnail="forceThumbnail"
      >
        <template #title>
          <span :id="titleId">{{ title }}</span>
        </template>

        <template v-if="description" #description>
          {{ description }}
        </template>

        <template v-if="showSupporting" #supporting-text>
          <WikitaLiteSupportingRow :icon="supportingIcon">
            {{ supportingText }}
          </WikitaLiteSupportingRow>
        </template>
      </CdxCard>
    </div>
  </article>
</template>

<style scoped>
.wikita-lite-card-with-chip {
  position: relative;
  display: block;
  width: 100%;
}

.wikita-lite-card-with-chip__cover-link {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  color: inherit;
  text-decoration: none;
}

.wikita-lite-card-with-chip__cover-link:focus-visible {
  outline: 2px solid var(--color-progressive);
  outline-offset: 2px;
}

.wikita-lite-card-with-chip__shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75, 12px);
  box-sizing: border-box;
  width: 100%;
  padding: var(--spacing-75, 12px);
  border: 1px solid var(--border-color-base, #a2a9b1);
  border-radius: 2px;
  background-color: var(--background-color-base, #fff);
  pointer-events: none;
}

.wikita-lite-card-with-chip--linked .wikita-lite-card-with-chip__shell:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.wikita-lite-card-with-chip__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50, 8px);
  align-self: flex-start;
}

.wikita-lite-card-with-chip__chip {
  flex-shrink: 0;
}

.wikita-lite-card-with-chip__shell :deep(.cdx-card) {
  padding: 0;
  border: none;
  background: transparent;
}
</style>
