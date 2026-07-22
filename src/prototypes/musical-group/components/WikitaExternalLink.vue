<script setup lang="ts">
import { computed } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import { cdxIconLinkExternal } from '@wikimedia/codex-icons'

import { useWikitaUiSkin, type WikitaUiSkin } from '../composables/useWikitaUiSkin'
import { externalLinkLabel, websiteHost } from '../data/wikidataApi'

interface Props {
  href: string
  label?: string
  /** When true, show hostname only (e.g. facts header). Default shows host + path. */
  hostOnly?: boolean
  /** When true, truncate long labels with an ellipsis on one line. */
  truncate?: boolean
  skin?: WikitaUiSkin
}

const props = withDefaults(defineProps<Props>(), {
  hostOnly: false,
  truncate: false,
  skin: undefined,
})

const effectiveSkin = useWikitaUiSkin(() => props.skin)

const displayLabel = computed(() => {
  if (props.label) return props.label
  return props.hostOnly ? websiteHost(props.href) : externalLinkLabel(props.href)
})

const linkClass = computed(() => ({
  'wikita-external-link': effectiveSkin.value === 'wikita',
  'wikita-external-link--truncate': truncate,
  'wikita-external-link-wikipedia': effectiveSkin.value === 'wikipedia',
  'wikita-external-link-wikipedia--truncate': truncate && effectiveSkin.value === 'wikipedia',
}))
</script>

<template>
  <a
    :href="href"
    :class="linkClass"
    target="_blank"
    rel="noopener noreferrer"
  >
    <span
      class="wikita-external-link__text"
      :class="{ 'wikita-external-link__text--truncate': truncate }"
    >
      {{ displayLabel }}
    </span>
    <CdxIcon :icon="cdxIconLinkExternal" class="wikita-external-link__icon" size="small" />
  </a>
</template>

<style scoped>
.wikita-external-link,
.wikita-external-link-wikipedia {
  display: inline-flex;
  align-items: flex-start;
  gap: var(--spacing-25);
  max-width: 100%;
  color: var(--color-progressive);
  line-height: var(--line-height-small);
  text-decoration: none;
}

.wikita-external-link--truncate,
.wikita-external-link-wikipedia--truncate {
  position: relative;
  display: inline-block;
  max-width: 100%;
  vertical-align: top;
  padding-right: calc(1.0625em + var(--spacing-25));
}

.wikita-external-link:hover .wikita-external-link__text,
.wikita-external-link-wikipedia:hover .wikita-external-link__text {
  text-decoration: underline;
}

.wikita-external-link__text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.wikita-external-link__text--truncate {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow-wrap: normal;
}

.wikita-external-link__icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-progressive);
}

.wikita-external-link--truncate .wikita-external-link__icon,
.wikita-external-link-wikipedia--truncate .wikita-external-link__icon {
  position: absolute;
  top: 50%;
  right: 0;
  margin-top: 0;
  transform: translateY(-50%);
}

.wikita-external-link__icon :deep(svg),
.wikita-external-link__icon :deep(svg path) {
  fill: currentColor;
}
</style>
