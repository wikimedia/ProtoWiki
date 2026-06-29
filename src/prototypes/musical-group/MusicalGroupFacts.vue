<script setup lang="ts">
import { computed } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import { cdxIconLinkExternal, cdxIconMusicalScore } from '@wikimedia/codex-icons'

import { sentenceCaseList } from './data/formatLabel'
import type { MusicalGroupData } from './data/types'

interface Props {
  data: MusicalGroupData
}

const props = defineProps<Props>()

const primaryFact = computed(() => {
  const { typeLabel, inceptionYear, yearKind } = props.data
  if (typeLabel && inceptionYear) {
    if (yearKind === 'birth') return `${typeLabel}, born ${inceptionYear}`
    return `${typeLabel} since ${inceptionYear}`
  }
  if (typeLabel) return typeLabel
  return null
})

const genreLine = computed(() =>
  props.data.genres.length ? sentenceCaseList(props.data.genres) : null,
)
</script>

<template>
  <section class="musical-group-facts">
    <div class="musical-group-facts__summary">
      <div v-if="primaryFact" class="musical-group-facts__primary-row">
        <h3 class="musical-group-facts__primary">{{ primaryFact }}</h3>
        <CdxIcon :icon="cdxIconMusicalScore" class="musical-group-facts__note-icon" />
      </div>
      <small v-if="genreLine" class="musical-group-facts__genres">{{ genreLine }}</small>
    </div>

    <p v-if="data.websiteUrl && data.websiteHost" class="musical-group-facts__website">
      <a :href="data.websiteUrl" target="_blank" rel="noopener noreferrer">
        {{ data.websiteHost }}
        <CdxIcon :icon="cdxIconLinkExternal" size="small" />
      </a>
    </p>
  </section>
</template>

<style scoped>
.musical-group-facts {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.musical-group-facts__summary {
  display: flex;
  flex-direction: column;
}

.musical-group-facts__primary-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50);
}

.musical-group-facts__primary {
  margin: 0;
}

.musical-group-facts__note-icon {
  flex-shrink: 0;
  margin-top: 3px;
}

.musical-group-facts__genres {
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.musical-group-facts__website {
  margin: 0;
}

.musical-group-facts__website a {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  color: var(--color-progressive);
  line-height: var(--line-height-small);
  text-decoration: none;
}

.musical-group-facts__website a:hover {
  text-decoration: underline;
}

.musical-group-facts__website a :deep(.cdx-icon) {
  color: var(--color-progressive);
}

.musical-group-facts__website a :deep(.cdx-icon svg),
.musical-group-facts__website a :deep(.cdx-icon svg path) {
  fill: currentColor;
}
</style>
