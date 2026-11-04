<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { CdxInfoChip, CdxTable } from '@wikimedia/codex'

import {
  cacheRowMatchesFilter,
  formatCacheAge,
  formatCacheRemaining,
  snapshotWikitabCaches,
  type WikitabCacheFreshness,
  type WikitabCacheRow,
} from '../wikitab/data/wikitabCachePlayground'

const props = defineProps<{
  filterText?: string
}>()

const now = ref(Date.now())
const rows = ref<WikitabCacheRow[]>([])

let tickTimer: ReturnType<typeof setInterval> | null = null

function refresh(): void {
  now.value = Date.now()
  rows.value = snapshotWikitabCaches(now.value)
}

const filtered = computed(() =>
  rows.value.filter((row) => cacheRowMatchesFilter(row, props.filterText ?? '')),
)

const tableColumns = [
  { id: 'module', label: 'Module', width: '8.5rem' },
  { id: 'status', label: 'Status', width: '8rem' },
  { id: 'ttl', label: 'TTL', width: '5.5rem' },
  { id: 'remaining', label: 'Time left', width: '5.75rem' },
  { id: 'age', label: 'Age', width: '6.25rem' },
  { id: 'invalidates', label: 'Invalidates', width: '8.5rem' },
  { id: 'key', label: 'Key', width: '9rem' },
]

const tableData = computed(() =>
  filtered.value.map((row) => ({
    id: row.id,
    module: row.module,
    status: row.statuses,
    ttl: row.ttlLabel,
    remaining: formatCacheRemaining(row.remainingMs),
    age: formatCacheAge(row.fetchedAt, now.value),
    invalidates: row.invalidates,
    key: row.storageKey,
  })),
)

function freshnessStatus(
  freshness: WikitabCacheFreshness,
): 'success' | 'warning' | 'error' | 'notice' {
  switch (freshness) {
    case 'up-to-date':
      return 'success'
    case 'stale':
      return 'warning'
    case 'invalid':
      return 'error'
    case 'bypassed':
    case 'missing':
    case 'off':
      return 'notice'
    default:
      return 'notice'
  }
}

function freshnessLabel(freshness: WikitabCacheFreshness): string {
  switch (freshness) {
    case 'up-to-date':
      return 'Up to date'
    case 'stale':
      return 'Stale'
    case 'invalid':
      return 'Invalid'
    case 'bypassed':
      return 'Bypassed'
    case 'missing':
      return 'Missing'
    case 'off':
      return 'Turned off'
    default:
      return freshness
  }
}

onMounted(() => {
  refresh()
  tickTimer = setInterval(refresh, 1000)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
})
</script>

<template>
  <div class="wikitab-cache-status">
    <CdxTable
      v-if="filtered.length"
      class="wikitab-cache-status__table"
      caption="Wikitab module caches"
      hide-caption
      :columns="tableColumns"
      :data="tableData"
      :show-vertical-borders="false"
    >
      <template #item-status="{ row }">
        <div class="wikitab-cache-status__chips">
          <CdxInfoChip
            v-for="status in row.status"
            :key="status"
            :status="freshnessStatus(status)"
          >
            {{ freshnessLabel(status) }}
          </CdxInfoChip>
        </div>
      </template>

      <template #item-key="{ row }">
        <code class="wikitab-cache-status__key">{{ row.key }}</code>
      </template>
    </CdxTable>
    <p v-else class="wikitab-cache-status__empty">No matches.</p>
  </div>
</template>

<style scoped>
.wikitab-cache-status {
  max-width: 100%;
  overflow-x: hidden;
  margin-block-start: var(--spacing-150);
}

.wikitab-cache-status__table {
  width: 100%;
  max-width: 100%;
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
}

.wikitab-cache-status__table :deep(th),
.wikitab-cache-status__table :deep(td) {
  padding: var(--spacing-50) var(--spacing-75);
  vertical-align: middle;
  overflow-wrap: break-word;
  word-break: normal;
}

.wikitab-cache-status__chips {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  align-items: flex-start;
}

.wikitab-cache-status__chips :deep(.cdx-info-chip) {
  max-width: 100%;
  flex-shrink: 0;
}

.wikitab-cache-status__chips :deep(.cdx-info-chip__text) {
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
  max-width: none;
}

.wikitab-cache-status__key {
  overflow-wrap: anywhere;
  word-break: break-word;
  color: var(--color-subtle);
  font-size: inherit;
}

.wikitab-cache-status__empty {
  margin: var(--spacing-100) 0 0;
  color: var(--color-subtle);
}
</style>
