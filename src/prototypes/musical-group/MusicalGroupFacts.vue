<script setup lang="ts">
import { computed } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import {
  cdxIconLinkExternal,
  cdxIconMapPin,
  cdxIconMusicalScore,
} from '@wikimedia/codex-icons'

import { sentenceCaseList } from './data/formatLabel'
import type { MusicalGroupData } from './data/types'

interface Props {
  data: MusicalGroupData
}

const props = defineProps<Props>()

const primaryFact = computed(() => {
  const { typeLabel, inceptionYear, yearKind, isLocation, country } = props.data
  if (isLocation) {
    if (typeLabel && country) return `${typeLabel} in ${country}`
    if (typeLabel) return typeLabel
    return null
  }
  if (typeLabel && inceptionYear) {
    if (yearKind === 'birth') return `${typeLabel}, born ${inceptionYear}`
    return `${typeLabel} since ${inceptionYear}`
  }
  if (typeLabel) return typeLabel
  return null
})

const genreLine = computed(() =>
  props.data.isMusicPerformer && props.data.genres.length
    ? sentenceCaseList(props.data.genres)
    : null,
)

const locationLine = computed(() => {
  if (!props.data.isLocation || props.data.population == null) return null
  const formatted = new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(props.data.population)
  return `${formatted} people`
})

const factIcon = computed(() =>
  props.data.isLocation ? cdxIconMapPin : cdxIconMusicalScore,
)
</script>

<template>
  <section class="musical-group-facts">
    <div class="musical-group-facts__summary">
      <div v-if="primaryFact" class="musical-group-facts__primary-row">
        <h3 class="musical-group-facts__primary">{{ primaryFact }}</h3>
        <CdxIcon :icon="factIcon" class="musical-group-facts__note-icon" />
      </div>
      <small v-if="genreLine" class="musical-group-facts__genres">{{ genreLine }}</small>
      <small v-else-if="locationLine" class="musical-group-facts__genres">{{ locationLine }}</small>
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
