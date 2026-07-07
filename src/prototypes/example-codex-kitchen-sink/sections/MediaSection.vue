<script setup lang="ts">
import { CdxImage, CdxThumbnail } from '@wikimedia/codex'
import { cdxIconImage } from '@wikimedia/codex-icons'

import { mediaSubTabs } from '../lib/component-tabs'
import { imageUrl, thumbnailUrl } from '../lib/fixtures'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundGrid from '../playground/PlaygroundGrid.vue'
import PlaygroundCell from '../playground/PlaygroundCell.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'

const aspectRatios = ['16:9', '3:2', '4:3', '1:1', '3:4', '2:3'] as const
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="components-media"
    :items="mediaSubTabs"
    default-active="image"
    ariaLabel="Media"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'image'">
        <PlaygroundGrid min="200px">
          <PlaygroundCell v-for="ratio in aspectRatios" :key="ratio" :label="ratio">
            <CdxImage :src="imageUrl" alt="Sample" :aspect-ratio="ratio" />
          </PlaygroundCell>
          <PlaygroundCell label="object-fit cover">
            <CdxImage :src="imageUrl" alt="Sample" aspect-ratio="1:1" object-fit="cover" />
          </PlaygroundCell>
          <PlaygroundCell label="object-fit contain">
            <CdxImage :src="imageUrl" alt="Sample" aspect-ratio="1:1" object-fit="contain" />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'thumbnail'">
        <PlaygroundGrid min="120px">
          <PlaygroundCell label="image">
            <CdxThumbnail :thumbnail="{ url: thumbnailUrl, width: 80, height: 80 }" />
          </PlaygroundCell>
          <PlaygroundCell label="placeholder">
            <CdxThumbnail :placeholder-icon="cdxIconImage" />
          </PlaygroundCell>
        </PlaygroundGrid>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped></style>
