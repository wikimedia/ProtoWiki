<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { CdxIcon } from '@wikimedia/codex'
import { cdxIconNext } from '@wikimedia/codex-icons'

interface Props {
  title: string
  to?: RouteLocationRaw
  standalone?: boolean
}

withDefaults(defineProps<Props>(), {
  to: undefined,
  standalone: false,
})
</script>

<template>
  <section
    class="wikita-lite-module"
    :class="{ 'wikita-lite-module--standalone': standalone }"
  >
    <RouterLink
      v-if="to && !standalone"
      :to="to"
      class="wikita-lite-module__title-link"
    >
      <h2 class="wikita-lite-module__title">{{ title }}</h2>
      <CdxIcon :icon="cdxIconNext" class="wikita-lite-module__arrow" />
    </RouterLink>

    <h2 v-else-if="standalone" class="wikita-lite-module__title wikita-lite-module__title--static">
      {{ title }}
    </h2>

    <div class="wikita-lite-module__cards">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.wikita-lite-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.wikita-lite-module__title-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25, 4px);
  padding: 0;
  color: inherit;
  text-decoration: none;
}

.wikita-lite-module__title {
  margin: 0;
  font-family: var(--font-family-base);
  font-size: var(--font-size-x-large, 1.25rem);
  font-weight: var(--font-weight-bold, 700);
  line-height: var(--line-height-x-large, 1.875);
  color: var(--color-base, #202122);
}

.wikita-lite-module__title--static {
  padding: 0;
}

.wikita-lite-module__arrow {
  flex-shrink: 0;
  width: 1.125rem;
  height: 1.125rem;
}

.wikita-lite-module__cards {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  padding: 0;
}

.wikita-lite-module--standalone .wikita-lite-module__cards {
  padding: 0;
}
</style>
