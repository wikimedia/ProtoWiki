<script setup lang="ts">
import { computed } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import { cdxIconMapPin, cdxIconMusicalScore, cdxIconUserAvatar } from '@wikimedia/codex-icons'

import WikitaExternalLink from './components/WikitaExternalLink.vue'
import { sentenceCaseList } from './data/formatLabel'
import type { MusicalGroupData } from './data/types'

interface Props {
  data: MusicalGroupData
}

const props = defineProps<Props>()

const primaryFact = computed(() => {
  const { typeLabel, inceptionYear, yearKind, isLocation, country } = props.data
  if (isLocation) {
    const showCountry =
      country &&
      country.localeCompare(props.data.label, undefined, { sensitivity: 'accent' }) !== 0
    if (typeLabel && showCountry) return `${typeLabel} in ${country}`
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

const factIcon = computed(() => {
  if (props.data.isLocation) return cdxIconMapPin
  if (props.data.isPerson) return cdxIconUserAvatar
  return cdxIconMusicalScore
})
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
      <p v-if="data.websiteUrl && !data.isPerson" class="musical-group-facts__website">
        <WikitaExternalLink :href="data.websiteUrl" :label="data.websiteHost" host-only />
      </p>
    </div>
  </section>
</template>

<style scoped>
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
</style>
