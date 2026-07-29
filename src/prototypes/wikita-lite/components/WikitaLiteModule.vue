<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router'
import { RouterLink } from 'vue-router'

import { CdxButton, CdxIcon } from '@wikimedia/codex'
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
      <h3 class="wikita-lite-module__title">{{ title }}</h3>
      <CdxButton weight="quiet" class="wikita-lite-module__arrow-button" :aria-hidden="true" tabindex="-1">
        <CdxIcon :icon="cdxIconNext" />
      </CdxButton>
    </RouterLink>

    <h3 v-else-if="standalone" class="wikita-lite-module__title wikita-lite-module__title--static">
      {{ title }}
    </h3>

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
}

.wikita-lite-module__title--static {
  padding: 0;
}

.wikita-lite-module__arrow-button {
  flex-shrink: 0;
  pointer-events: none;
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
