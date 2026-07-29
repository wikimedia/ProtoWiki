<script setup lang="ts">
import { computed } from 'vue'

import { CdxCard, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconCalendar } from '@wikimedia/codex-icons'

import type { HomeBornOnThisDay } from '../../musical-group/data/types'
import {
  bornOnThisDayDescription,
  bornOnThisDayYearLabel,
} from '../composables/bornOnThisDayDescription'
import { externalArticleHref } from '../composables/useWikitaLiteCardActions'

interface Props {
  standalone?: boolean
  items?: HomeBornOnThisDay[]
  loading?: boolean
  previewLimit?: number
  listsVersion?: number
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 3,
  listsVersion: 0,
})

const displayItems = computed(() =>
  props.standalone ? props.items : props.items.slice(0, props.previewLimit),
)

const displayCards = computed(() =>
  displayItems.value.map((item) => ({
    item,
    description: bornOnThisDayDescription(item),
  })),
)

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}
</script>

<template>
  <div class="born-on-this-day-module">
    <CdxProgressBar v-if="loading" inline aria-label="Loading Born on this day" />

    <template v-else>
      <CdxCard
        v-for="{ item, description } in displayCards"
        :key="item.enwikiTitle"
        :url="externalArticleHref(item)"
        :thumbnail="cardThumbnail(item.thumbnailUrl)"
        :force-thumbnail="true"
      >
        <template #title>
          {{ item.title }}
        </template>
        <template v-if="description" #description>
          {{ description }}
        </template>
        <template #supporting-text>
          <CdxIcon :icon="cdxIconCalendar" size="small" />
          {{ bornOnThisDayYearLabel(item.year) }}
        </template>
      </CdxCard>

      <p v-if="standalone && !displayItems.length" class="born-on-this-day-module__empty">
        No birthdays are available right now.
      </p>
    </template>
  </div>
</template>

<style scoped>
.born-on-this-day-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.born-on-this-day-module__empty {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}
</style>
