<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import * as codexIcons from '@wikimedia/codex-icons'
import type { IconSize } from '@wikimedia/codex'
import { cdxIconSearch } from '@wikimedia/codex-icons'

import { iconSizeEntries, iconsSubTabs } from '../lib/component-tabs'
import PlaygroundSection from '../playground/PlaygroundSection.vue'
import PlaygroundSubTabs from '../playground/PlaygroundSubTabs.vue'
import TokenDeprecatedLabel from '../playground/TokenDeprecatedLabel.vue'

const iconEntries = computed(() =>
  Object.entries(codexIcons)
    .filter(([name]) => name.startsWith('cdxIcon'))
    .sort(([a], [b]) => a.localeCompare(b)),
)
</script>

<template>
  <PlaygroundSubTabs
    main-tab-id="icons"
    :items="iconsSubTabs"
    default-active="size"
    ariaLabel="Icons"
  >
    <template #default="{ id }">
      <PlaygroundSection v-if="id === 'size'">
        <div class="icon-size-list">
          <div
            v-for="entry in iconSizeEntries"
            :key="entry.id"
            class="icon-size-list__item"
            :class="{ 'icon-size-list__item--deprecated': entry.deprecated }"
          >
            <CdxIcon :icon="cdxIconSearch" :size="entry.id as IconSize" />
            <code class="icon-size-list__label">{{ entry.id }}</code>
            <TokenDeprecatedLabel v-if="entry.deprecated" />
          </div>
        </div>
      </PlaygroundSection>

      <PlaygroundSection v-else-if="id === 'type'">
        <div class="icon-catalogue">
          <div v-for="[name, icon] in iconEntries" :key="name" class="icon-catalogue__item">
            <CdxIcon :icon="icon" />
            <code class="icon-catalogue__name">{{ name }}</code>
          </div>
        </div>
      </PlaygroundSection>
    </template>
  </PlaygroundSubTabs>
</template>

<style scoped>
.icon-size-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--spacing-75);
}

.icon-size-list__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
}

.icon-size-list__label {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
}

.icon-size-list__item--deprecated {
  opacity: 0.7;
}

.icon-catalogue {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(17.5rem, 1fr));
  column-gap: var(--spacing-100);
  row-gap: var(--spacing-35);
}

.icon-catalogue__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  min-width: 0;
}

.icon-catalogue__name {
  font-family: var(--font-family-monospace);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-subtle);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
