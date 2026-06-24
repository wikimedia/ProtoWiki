<script setup lang="ts">
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconLinkExternal } from '@wikimedia/codex-icons'

import type { MusicalGroupInfobox } from './data/types'

interface Props {
  infobox?: MusicalGroupInfobox
  lastEditedLabel?: string
}

defineProps<Props>()
</script>

<template>
  <article class="musical-group-info">
    <dl v-if="infobox?.rows.length" class="musical-group-info__rows">
      <div v-for="row in infobox.rows" :key="row.label" class="musical-group-info__row">
        <dt class="musical-group-info__label">{{ row.label }}</dt>
        <dd class="musical-group-info__value">
          <template v-for="(value, index) in row.values" :key="index">
            <a
              v-if="value.href"
              class="musical-group-info__link"
              :href="value.href"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ value.text }}
              <CdxIcon :icon="cdxIconLinkExternal" size="small" />
            </a>
            <span v-else class="musical-group-info__value-line">{{ value.text }}</span>
          </template>
        </dd>
      </div>
    </dl>

    <p v-else class="musical-group-info__empty">No infobox available.</p>

    <small v-if="infobox?.rows.length" class="musical-group-info__footer">
      <span>{{ lastEditedLabel || 'Updated —' }}</span>
      <span>English Wikipedia</span>
    </small>
  </article>
</template>

<style scoped>
.musical-group-info {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  padding: var(--spacing-100);
  border: 1px solid var(--color-base);
  border-radius: 6px;
  background-color: var(--background-color-base);
}

.musical-group-info__rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin: 0;
}

.musical-group-info__row {
  display: grid;
  grid-template-columns: 7.5rem 1fr;
  gap: var(--spacing-50);
  align-items: start;
}

.musical-group-info__label {
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.musical-group-info__value {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.musical-group-info__value-line {
  min-width: 0;
}

.musical-group-info__link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
  color: var(--color-progressive);
  text-decoration: none;
}

.musical-group-info__link:hover {
  text-decoration: underline;
}

.musical-group-info__link :deep(.cdx-icon) {
  color: var(--color-progressive);
}

.musical-group-info__link :deep(.cdx-icon svg),
.musical-group-info__link :deep(.cdx-icon svg path) {
  fill: currentColor;
}

.musical-group-info__empty {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.musical-group-info__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50);
  padding-top: var(--spacing-100);
  border-top: 1px solid var(--color-base);
  line-height: var(--line-height-x-small);
  color: var(--color-subtle);
}
</style>
