<script setup lang="ts">
import { computed } from 'vue'

import { CdxIcon } from '@wikimedia/codex'
import { cdxIconLinkExternal } from '@wikimedia/codex-icons'

import WikitaCardWrapper from './WikitaCardWrapper.vue'

export interface WikitaCardTableValue {
  text: string
  href?: string
}

export interface WikitaCardTableRow {
  label: string
  values: WikitaCardTableValue[]
}

interface Props {
  rows?: WikitaCardTableRow[]
  infoLeft?: string
  infoRight?: string
  showFooter?: boolean
  emptyText?: string
}

const props = withDefaults(defineProps<Props>(), {
  rows: () => [],
  infoLeft: '',
  infoRight: '',
  showFooter: true,
  emptyText: 'No infobox available.',
})

const hasRows = computed(() => props.rows.length > 0)

const showFooterRow = computed(
  () => props.showFooter && hasRows.value && Boolean(props.infoLeft || props.infoRight),
)
</script>

<template>
  <WikitaCardWrapper>
    <div class="wikita-card-table">
      <dl v-if="hasRows" class="wikita-card-table__rows">
        <div v-for="row in rows" :key="row.label" class="wikita-card-table__row">
          <dt class="wikita-card-table__label">{{ row.label }}</dt>
          <dd class="wikita-card-table__value">
            <template v-for="(value, index) in row.values" :key="index">
              <a
                v-if="value.href"
                class="wikita-card-table__link"
                :href="value.href"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ value.text }}
                <CdxIcon :icon="cdxIconLinkExternal" size="small" />
              </a>
              <span v-else class="wikita-card-table__value-line">{{ value.text }}</span>
            </template>
          </dd>
        </div>
      </dl>

      <p v-else class="wikita-card-table__empty">{{ emptyText }}</p>

      <small v-if="showFooterRow" class="wikita-card-table__footer">
        <span>{{ infoLeft }}</span>
        <span>{{ infoRight }}</span>
      </small>
    </div>
  </WikitaCardWrapper>
</template>

<style scoped>
.wikita-card-table {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  min-width: 0;
}

.wikita-card-table__rows {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  margin: 0;
}

.wikita-card-table__row {
  display: grid;
  grid-template-columns: 105px 1fr;
  gap: var(--spacing-100);
  align-items: start;
}

.wikita-card-table__label {
  margin: 0;
  font-size: var(--font-size-medium);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card-table__value {
  display: flex;
  flex-direction: column;
  min-width: 0;
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-small);
  color: var(--color-base);
}

.wikita-card-table__value-line {
  min-width: 0;
}

.wikita-card-table__link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
  min-width: 0;
  color: var(--color-progressive);
  text-decoration: none;
}

.wikita-card-table__link:hover {
  text-decoration: underline;
}

.wikita-card-table__link :deep(.cdx-icon) {
  color: var(--color-progressive);
}

.wikita-card-table__link :deep(.cdx-icon svg),
.wikita-card-table__link :deep(.cdx-icon svg path) {
  fill: currentColor;
}

.wikita-card-table__empty {
  margin: 0;
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-subtle);
}

.wikita-card-table__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-50);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-base);
}
</style>
