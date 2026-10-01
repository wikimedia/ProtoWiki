<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { CdxCard, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import {
  cdxIconBookmark,
  cdxIconBookmarkList,
  cdxIconBookmarkOutline,
} from '@wikimedia/codex-icons'

import type { HomeSavedItem } from '../../musical-group/data/types'
import {
  savedItemHref,
  useWikitaLiteSaveActions,
} from '../composables/useWikitaLiteCardActions'
import { useWikitaLiteCardListClasses } from '../composables/useWikitaLiteCardListClasses'
import { useWikitaLiteSaveFeedback } from '../composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteOverflowShowMore } from '../composables/useWikitaLiteOverflowShowMore'
import { WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE } from '../wikita-lite-card'
import WikitaLiteCardSkeletons from '../components/WikitaLiteCardSkeletons.vue'
import WikitaLiteCardWithAction from '../components/WikitaLiteCardWithAction.vue'
import WikitaLiteShowMore from '../components/WikitaLiteShowMore.vue'
import WikitaLiteSupportingRow from '../components/WikitaLiteSupportingRow.vue'
import { format, MESSAGES, t } from '../i18n'
import { messageParts } from '@/i18n'
import { formatElapsed } from '@/lib/contentFormat'
import { isDefaultContentLang } from '@/lib/contentLang'

interface Props {
  standalone?: boolean
  items?: HomeSavedItem[]
  loading?: boolean
  previewLimit?: number
  /** Empty card slots held at the end of the grid while the feed loads. */
  skeletons?: number
  /**
   * Reveal the next cards in place instead of navigating to the module's own
   * page. The owner grows `previewLimit` in response to `expand`.
   */
  expandable?: boolean
  moreTo?: RouteLocationRaw
}

const props = withDefaults(defineProps<Props>(), {
  standalone: false,
  items: () => [],
  loading: false,
  previewLimit: 4,
  skeletons: 0,
  expandable: false,
  moreTo: undefined,
})

defineEmits<{
  /** Desktop "Show more": reveal the next cards rather than navigate. */
  expand: []
}>()

/** Standalone Saved page keeps items visible after unsave until the user leaves. */
const sessionItems = ref<HomeSavedItem[] | null>(null)

watch(
  () => props.items,
  (items) => {
    if (!props.standalone) return

    if (sessionItems.value === null) {
      sessionItems.value = [...items]
      return
    }

    const existingIds = new Set(sessionItems.value.map((item) => item.id))
    for (const item of items) {
      if (!existingIds.has(item.id)) {
        sessionItems.value.push(item)
      }
    }
  },
  { immediate: true, deep: true },
)

const displayItems = computed(() => {
  const items =
    props.standalone && sessionItems.value !== null ? sessionItems.value : props.items
  return props.standalone ? items : items.slice(0, props.previewLimit)
})

const { listsVersion } = useWikitaLiteSaveFeedback()
const listsVersionRef = computed(() => listsVersion.value)
const { relatedReadingSaved, relatedReadingInList, onRelatedReadingSave } =
  useWikitaLiteSaveActions(listsVersionRef)

function saveIcon(itemId: string, title: string) {
  if (relatedReadingInList(itemId)) return cdxIconBookmarkList
  return relatedReadingSaved(title) ? cdxIconBookmark : cdxIconBookmarkOutline
}

function saveLabel(title: string): string {
  return relatedReadingSaved(title) ? t('common.savedState') : t('common.save')
}

function cardThumbnail(url?: string) {
  return url?.trim() ? { url: url.trim() } : null
}

function formatSavedLabel(savedAt: number | undefined): string {
  if (!Number.isFinite(savedAt) || savedAt <= 0) return ''

  const diffMs = Date.now() - savedAt
  if (!Number.isFinite(diffMs) || diffMs < 0) return ''

  if (!isDefaultContentLang()) return format(MESSAGES.savedRelative, formatElapsed(diffMs))
  if (diffMs < 60_000) return t('home.savedJustNow')

  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 60) return t('home.savedMinutesAgo', minutes)

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('home.savedHoursAgo', hours)

  const days = Math.floor(hours / 24)
  return t('home.savedDaysAgo', days)
}

const { groupClass, cardClass } = useWikitaLiteCardListClasses({ standalone: () => props.standalone })

/* Nothing to go to until there is a saved page the preview didn't fit. */
const hasOverflow = computed(() => props.items.length > props.previewLimit)

const showMoreLink = useWikitaLiteOverflowShowMore({
  standalone: () => props.standalone,
  moreTo: () => props.moreTo,
  hasItems: () => hasOverflow.value,
})

/*
 * Navigating always has somewhere to go; revealing in place only makes sense
 * while the feed holds more than the preview is showing.
 */
const showMoreControl = computed(
  () => showMoreLink.value && (!props.expandable || props.items.length > props.previewLimit),
)
</script>

<template>
  <div class="saved-module">
    <CdxProgressBar v-if="standalone && loading" inline :aria-label="t('home.loadingSavedPages')" />

    <template v-else>
      <template v-if="displayItems.length || skeletons">
        <div
          :class="['saved-module__cards', groupClass]"
          :aria-busy="skeletons > 0 || undefined"
        >
          <template v-for="item in displayItems" :key="item.id">
            <WikitaLiteCardWithAction
              v-if="standalone"
              :url="savedItemHref(item)"
              :title="item.title"
              :description="item.description"
              :supporting-text="
                relatedReadingSaved(item.title) ? formatSavedLabel(item.savedAt) : undefined
              "
              :supporting-icon="relatedReadingSaved(item.title) ? cdxIconBookmark : undefined"
              :thumbnail-url="item.thumbnailUrl"
              thumbnail-size="large"
              :force-thumbnail="true"
              :action-label="saveLabel(item.title)"
              :action-icon="saveIcon(item.id, item.title)"
              :action-active="relatedReadingSaved(item.title)"
              @action-click="onRelatedReadingSave(item.id, item.title, item.thumbnailUrl)"
            />

            <CdxCard
              v-else
              :class="[WIKITA_LITE_CARD_CLASS_THUMBNAIL_SIZE_LARGE, cardClass]"
              :url="savedItemHref(item)"
              :thumbnail="cardThumbnail(item.thumbnailUrl)"
              :force-thumbnail="true"
            >
              <template #title>
                {{ item.title }}
              </template>
              <template v-if="item.description" #description>
                {{ item.description }}
              </template>
              <template #supporting-text>
                <WikitaLiteSupportingRow :icon="cdxIconBookmark">
                  {{ formatSavedLabel(item.savedAt) }}
                </WikitaLiteSupportingRow>
              </template>
            </CdxCard>
          </template>
          <WikitaLiteCardSkeletons :count="skeletons" />
        </div>

        <slot name="after-cards" />

        <WikitaLiteShowMore
          v-if="showMoreControl"
          :to="moreTo"
          :expandable="expandable"
          @expand="$emit('expand')"
        >
          {{ MESSAGES.showMoreSaved }}
        </WikitaLiteShowMore>
      </template>

      <p
        v-else
        class="saved-module__empty"
        :class="{ 'saved-module__empty--standalone': standalone }"
      >
        <template v-for="part in messageParts('home.savedEmpty')" :key="String(part)">
          <CdxIcon
            v-if="part === 1"
            :icon="cdxIconBookmarkOutline"
            class="saved-module__empty-icon"
          />
          <template v-else>{{ part }}</template>
        </template>
      </p>
    </template>
  </div>
</template>

<style scoped>
.saved-module {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50, 8px);
  width: 100%;
}

.saved-module__cards {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.saved-module__empty {
  margin: 0;
  padding-bottom: var(--spacing-50, 8px);
  font-family: var(--font-family-base);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.saved-module__empty--standalone {
  padding-top: var(--spacing-75, 12px);
}

.saved-module__empty-icon {
  display: inline-block;
  vertical-align: text-bottom;
  color: var(--color-subtle, #54595d);
}

.saved-module__empty-icon :deep(svg path) {
  fill: currentColor;
}
</style>
