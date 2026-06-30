<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

import WikitaCardWrapper from './WikitaCardWrapper.vue'

export type WikitaCardItemTypeColor =
  | 'base'
  | 'success'
  | 'progressive'
  | 'warning'
  | 'error'

interface Props {
  showType?: boolean
  showTitle?: boolean
  showThumbnail?: boolean
  showSnippet?: boolean
  showInfo?: boolean
  titleBold?: boolean
  type?: string
  title?: string
  body?: string
  snippet?: string
  infoLeft?: string
  infoRight?: string
  thumbnailUrl?: string
  thumbnailAlt?: string
  typeIcon?: Icon
  typeColor?: WikitaCardItemTypeColor
  href?: RouteLocationRaw
  externalHref?: string
}

const props = withDefaults(defineProps<Props>(), {
  showType: true,
  showTitle: true,
  showThumbnail: true,
  showSnippet: true,
  showInfo: true,
  titleBold: true,
  type: 'Card type',
  title: 'Item title',
  body: 'Item body',
  snippet: '',
  infoLeft: 'Info (left)',
  infoRight: 'Info (right)',
  thumbnailUrl: undefined,
  thumbnailAlt: '',
  typeIcon: undefined,
  typeColor: 'base',
  href: undefined,
  externalHref: undefined,
})

const showTypeRow = computed(() => props.showType && Boolean(props.type || props.typeIcon))

const showTitleLine = computed(() => props.showTitle && Boolean(props.title))

const showBodyLine = computed(() => Boolean(props.body))

const showThumb = computed(() => props.showThumbnail && Boolean(props.thumbnailUrl))

const showSnippetBlock = computed(() => props.showSnippet && Boolean(props.snippet))

const showFooterRow = computed(() => props.showInfo && Boolean(props.infoLeft || props.infoRight))
</script>

<template>
  <WikitaCardWrapper :href="href" :external-href="externalHref">
    <div class="wikita-card-item">
      <div class="wikita-card-item__header-row">
        <div class="wikita-card-item__lead">
          <div
            v-if="showTypeRow"
            class="wikita-card-item__type"
            :class="`wikita-card-item__type--${typeColor}`"
          >
            <CdxIcon v-if="typeIcon" :icon="typeIcon" class="wikita-card-item__type-icon" />
            <span class="wikita-card-item__type-label">{{ type }}</span>
          </div>

          <div v-if="showTitleLine || showBodyLine" class="wikita-card-item__text">
            <p
              v-if="showTitleLine"
              class="wikita-card-item__title"
              :class="{ 'wikita-card-item__title--bold': titleBold }"
            >
              {{ title }}
            </p>
            <p v-if="showBodyLine" class="wikita-card-item__body">{{ body }}</p>
          </div>
        </div>

        <div v-if="showThumb" class="wikita-card-item__thumb-wrap">
          <img
            class="wikita-card-item__thumb"
            :src="thumbnailUrl"
            :alt="thumbnailAlt"
            loading="lazy"
            draggable="false"
          />
        </div>
        <div v-else-if="showThumbnail" class="wikita-card-item__thumb-wrap">
          <span class="wikita-card-item__thumb-placeholder" aria-hidden="true" />
        </div>
      </div>

      <p v-if="showSnippetBlock" class="wikita-card-item__snippet">{{ snippet }}</p>

      <small v-if="showFooterRow" class="wikita-card-item__footer">
        <span>{{ infoLeft }}</span>
        <span>{{ infoRight }}</span>
      </small>
    </div>
  </WikitaCardWrapper>
</template>

<style scoped>
.wikita-card-item {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  min-width: 0;
}

.wikita-card-item__header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  width: 100%;
}

.wikita-card-item__lead {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  min-width: 0;
}

.wikita-card-item__type {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.wikita-card-item__type--success {
  color: var(--color-success);
}

.wikita-card-item__type--progressive {
  color: var(--color-progressive);
}

.wikita-card-item__type--warning {
  color: var(--color-warning);
}

.wikita-card-item__type--error {
  color: var(--color-error);
}

/* Codex sets `.cdx-icon { color: var(--color-base) }`; this wins over that so the
 * flag icon matches the coloured label on its type row. */
.wikita-card-item__type .wikita-card-item__type-icon {
  flex-shrink: 0;
  color: inherit;
}

.wikita-card-item__type-label {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.wikita-card-item__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wikita-card-item__title {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card-item__title--bold {
  font-weight: var(--font-weight-bold);
}

.wikita-card-item__body {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card-item__snippet {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  max-height: calc(var(--line-height-small) * 3);
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
}

.wikita-card-item__thumb-wrap {
  flex-shrink: 0;
  padding-left: var(--spacing-50);
}

.wikita-card-item__thumb {
  display: block;
  width: 64px;
  height: 64px;
  object-fit: cover;
  border: 1px solid var(--color-base);
}

.wikita-card-item__thumb-placeholder {
  display: block;
  width: 64px;
  height: 64px;
  border: 1px solid var(--color-base);
  background-color: var(--background-color-interactive-subtle);
}

.wikita-card-item__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50);
  width: 100%;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}
</style>
