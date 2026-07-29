<script setup lang="ts">
import { computed, useId } from 'vue'

import { CdxCard, CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'
import { cdxIconPlay } from '@wikimedia/codex-icons'

interface Props {
  url?: string
  mediaUrl: string
  mediaAlt?: string
  title: string
  description?: string
  supportingText?: string
  supportingIcon?: Icon
}

const props = withDefaults(defineProps<Props>(), {
  url: undefined,
  mediaAlt: '',
  description: undefined,
  supportingText: undefined,
  supportingIcon: undefined,
})

const titleId = useId()

const hasLink = computed(() => Boolean(props.url?.trim()))

const showSupporting = computed(
  () => Boolean(props.supportingText?.trim() || props.supportingIcon),
)
</script>

<template>
  <article
    class="wikita-lite-card-portrait"
    :class="{ 'wikita-lite-card-portrait--linked': hasLink }"
  >
    <a
      v-if="hasLink"
      :href="url"
      class="wikita-lite-card-portrait__cover-link"
      :aria-labelledby="titleId"
      target="_blank"
      rel="noopener noreferrer"
    />

    <div class="wikita-lite-card-portrait__shell">
      <div class="wikita-lite-card-portrait__media">
        <img
          class="wikita-lite-card-portrait__image"
          :src="mediaUrl"
          :alt="mediaAlt || title"
          loading="lazy"
        />
        <span class="wikita-lite-card-portrait__play" aria-hidden="true">
          <CdxIcon :icon="cdxIconPlay" />
        </span>
      </div>

      <CdxCard class="wikita-lite-card-portrait__card">
        <template #title>
          <span :id="titleId">{{ title }}</span>
        </template>

        <template v-if="description" #description>
          {{ description }}
        </template>

        <template v-if="showSupporting" #supporting-text>
          <CdxIcon v-if="supportingIcon" :icon="supportingIcon" size="small" />
          <span v-if="supportingText">{{ supportingText }}</span>
        </template>
      </CdxCard>
    </div>
  </article>
</template>

<style scoped>
.wikita-lite-card-portrait {
  position: relative;
  display: block;
  width: 100%;
}

.wikita-lite-card-portrait__cover-link {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  color: inherit;
  text-decoration: none;
}

.wikita-lite-card-portrait__cover-link:focus-visible {
  outline: 2px solid var(--color-progressive);
  outline-offset: 2px;
}

.wikita-lite-card-portrait__shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border-color-base, #a2a9b1);
  border-radius: 2px;
  background-color: var(--background-color-base, #fff);
  pointer-events: none;
}

.wikita-lite-card-portrait--linked .wikita-lite-card-portrait__shell:hover {
  border-color: var(--border-color-interactive--hover, #27292d);
}

.wikita-lite-card-portrait__media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-bottom: 1px solid var(--border-color-subtle, #c8ccd1);
}

.wikita-lite-card-portrait__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.wikita-lite-card-portrait__play {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-inverted, #fff);
  background: rgb(0 0 0 / 35%);
}

.wikita-lite-card-portrait__shell :deep(.cdx-card) {
  border: none;
  border-radius: 0;
}
</style>
