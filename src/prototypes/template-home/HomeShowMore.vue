<script setup lang="ts">
/**
 * A module's "Show more". Vector reveals the next cards in place, and once
 * used a quiet button folds the module back. Minerva links to the module's own
 * page instead (`[module]/index.vue`), a feed of all its cards, since a phone
 * column would grow unreadably long.
 */
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconCollapse } from '@wikimedia/codex-icons'

import { preservedQueryFromLocationQuery } from '@/appearance/url-query'
import { useSkin } from '@/composables/useSkin'

import { HOME_PATH } from './homeRoutes'

const props = defineProps<{
  /** The module's id — its page is `/template-home/<id>`. */
  module: string
  hasMore: boolean
  expanded: boolean
  /** Held while the cards are loading. */
  disabled?: boolean
}>()

const emit = defineEmits<{ more: []; collapse: [] }>()

const skin = useSkin()
const route = useRoute()

const pageLocation = computed(() => ({
  path: `${HOME_PATH}/${props.module}`,
  query: preservedQueryFromLocationQuery(route.query),
}))
</script>

<template>
  <template v-if="skin === 'mobile'">
    <!-- A link that looks like a button: it goes somewhere (Codex's CSS-only button). -->
    <RouterLink
      v-if="hasMore"
      class="home-show-more home-show-more--page cdx-button cdx-button--fake-button cdx-button--fake-button--enabled"
      :to="pageLocation"
    >
      Show more
    </RouterLink>
  </template>

  <div v-else-if="hasMore || expanded" class="home-show-more home-show-more__row">
    <CdxButton v-if="hasMore" :disabled="disabled" @click="emit('more')">Show more</CdxButton>
    <CdxButton
      v-if="expanded"
      class="home-show-more__collapse"
      weight="quiet"
      aria-label="Show fewer"
      @click="emit('collapse')"
    >
      <CdxIcon :icon="cdxIconCollapse" />
    </CdxButton>
  </div>
</template>

<style scoped>
.home-show-more {
  margin-top: var(--spacing-75);
}

/* Vector: "Show more" hugs its label at the start, the collapse button sits at the end. */
.home-show-more__row {
  display: flex;
  align-items: center;
}

.home-show-more__collapse {
  margin-inline-start: auto;
}

/* Minerva: a full-width bar under the stacked cards. */
.home-show-more--page {
  display: flex;
  max-width: none;
}
</style>
