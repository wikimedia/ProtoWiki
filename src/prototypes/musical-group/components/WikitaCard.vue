<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

import { CdxIcon } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'

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
  href?: RouteLocationRaw
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
  href: undefined,
})

const showTypeRow = computed(() => props.showType && Boolean(props.type || props.typeIcon))

const showTitleLine = computed(() => props.showTitle && Boolean(props.title))

const showBodyLine = computed(() => Boolean(props.body))

const showThumb = computed(() => props.showThumbnail && Boolean(props.thumbnailUrl))

const showSnippetBlock = computed(() => props.showSnippet && Boolean(props.snippet))

const showFooterRow = computed(() => props.showInfo && Boolean(props.infoLeft || props.infoRight))
</script>

<template>
  <RouterLink v-if="href" v-slot="{ href: linkHref, navigate }" :to="href" custom>
    <a :href="linkHref" class="wikita-card wikita-card--link" @click="navigate">
      <div class="wikita-card__inner">
        <div class="wikita-card__header-row">
          <div class="wikita-card__lead">
            <div v-if="showTypeRow" class="wikita-card__type">
              <CdxIcon v-if="typeIcon" :icon="typeIcon" class="wikita-card__type-icon" />
              <span class="wikita-card__type-label">{{ type }}</span>
            </div>

            <div v-if="showTitleLine || showBodyLine" class="wikita-card__text">
              <p
                v-if="showTitleLine"
                class="wikita-card__title"
                :class="{ 'wikita-card__title--bold': titleBold }"
              >
                {{ title }}
              </p>
              <p v-if="showBodyLine" class="wikita-card__body">{{ body }}</p>
            </div>
          </div>

          <div v-if="showThumb" class="wikita-card__thumb-wrap">
            <img
              class="wikita-card__thumb"
              :src="thumbnailUrl"
              :alt="thumbnailAlt"
              loading="lazy"
            />
          </div>
          <div v-else-if="showThumbnail" class="wikita-card__thumb-wrap">
            <span class="wikita-card__thumb-placeholder" aria-hidden="true" />
          </div>
        </div>

        <p v-if="showSnippetBlock" class="wikita-card__snippet">{{ snippet }}</p>

        <small v-if="showFooterRow" class="wikita-card__footer">
          <span>{{ infoLeft }}</span>
          <span>{{ infoRight }}</span>
        </small>
      </div>
    </a>
  </RouterLink>

  <article v-else class="wikita-card">
    <div class="wikita-card__inner">
      <div class="wikita-card__header-row">
        <div class="wikita-card__lead">
          <div v-if="showTypeRow" class="wikita-card__type">
            <CdxIcon v-if="typeIcon" :icon="typeIcon" class="wikita-card__type-icon" />
            <span class="wikita-card__type-label">{{ type }}</span>
          </div>

          <div v-if="showTitleLine || showBodyLine" class="wikita-card__text">
            <p
              v-if="showTitleLine"
              class="wikita-card__title"
              :class="{ 'wikita-card__title--bold': titleBold }"
            >
              {{ title }}
            </p>
            <p v-if="showBodyLine" class="wikita-card__body">{{ body }}</p>
          </div>
        </div>

        <div v-if="showThumb" class="wikita-card__thumb-wrap">
          <img
            class="wikita-card__thumb"
            :src="thumbnailUrl"
            :alt="thumbnailAlt"
            loading="lazy"
            draggable="false"
          />
        </div>
        <div v-else-if="showThumbnail" class="wikita-card__thumb-wrap">
          <span class="wikita-card__thumb-placeholder" aria-hidden="true" />
        </div>
      </div>

      <p v-if="showSnippetBlock" class="wikita-card__snippet">{{ snippet }}</p>

      <small v-if="showFooterRow" class="wikita-card__footer">
        <span>{{ infoLeft }}</span>
        <span>{{ infoRight }}</span>
      </small>
    </div>
  </article>
</template>

<style scoped>
.wikita-card {
  box-sizing: border-box;
  display: flex;
  width: 100%;
  margin: 0;
  padding: 0;
  border: 1px solid var(--color-base);
  border-radius: 4px;
  background-color: var(--background-color-base);
  color: var(--color-base);
  font: inherit;
  text-align: start;
  text-decoration: none;
}

.wikita-card--link {
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.wikita-card--link:hover,
.wikita-card--link:focus,
.wikita-card--link:visited {
  color: var(--color-base);
  text-decoration: none;
}

.wikita-card__inner {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--spacing-50);
  min-width: 0;
  padding: var(--spacing-100);
}

.wikita-card__header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--spacing-50);
  width: 100%;
}

.wikita-card__lead {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  min-width: 0;
}

.wikita-card__type {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.wikita-card__type-icon {
  flex-shrink: 0;
}

.wikita-card__type-label {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
}

.wikita-card__text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.wikita-card__title {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card__title--bold {
  font-weight: var(--font-weight-bold);
}

.wikita-card__body {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card__snippet {
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

.wikita-card__thumb-wrap {
  flex-shrink: 0;
  padding-left: var(--spacing-50);
}

.wikita-card__thumb {
  display: block;
  width: 64px;
  height: 64px;
  object-fit: cover;
  border: 1px solid var(--color-base);
}

.wikita-card__thumb-placeholder {
  display: block;
  width: 64px;
  height: 64px;
  border: 1px solid var(--color-base);
  background-color: var(--background-color-interactive-subtle);
}

.wikita-card__footer {
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
