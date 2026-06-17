<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import * as codexIcons from '@wikimedia/codex-icons'
import type { IconSize } from '@wikimedia/codex'
import { cdxIconSearch } from '@wikimedia/codex-icons'

import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'

const iconEntries = computed(() =>
  Object.entries(codexIcons)
    .filter(([name]) => name.startsWith('cdxIcon'))
    .sort(([a], [b]) => a.localeCompare(b)),
)

const iconSizes: IconSize[] = ['xx-small', 'x-small', 'small', 'medium']
</script>

<template>
  <PlaygroundSection title="Sizes">
    <PlaygroundGrid min="100px">
      <PlaygroundCell v-for="size in iconSizes" :key="size" :label="size">
        <CdxIcon :icon="cdxIconSearch" :size="size" />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>

  <PlaygroundSection title="Catalogue">
    <PlaygroundGrid min="100px" dense>
      <PlaygroundCell v-for="[name, icon] in iconEntries" :key="name" :label="name">
        <CdxIcon :icon="icon" />
      </PlaygroundCell>
    </PlaygroundGrid>
  </PlaygroundSection>
</template>
