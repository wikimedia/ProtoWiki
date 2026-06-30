<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { CdxProgressBar } from '@wikimedia/codex'
import type { Icon } from '@wikimedia/codex-icons'
import {
  cdxIconAlert,
  cdxIconError,
  cdxIconHeartOutline,
  cdxIconReference,
  cdxIconStar,
  cdxIconUserAvatar,
} from '@wikimedia/codex-icons'

import WikitaCardItem, {
  type WikitaCardItemTypeColor,
} from './components/WikitaCardItem.vue'
import WikitaChromeHeader, {
  type WikitaChromeHeaderVariant,
} from './components/WikitaChromeHeader.vue'
import WikitaHomeSection from './components/WikitaHomeSection.vue'
import WikitaHomeTabs, { type HomeTabId } from './components/WikitaHomeTabs.vue'
import type { HomeRecentChangeFlag } from './data/types'
import {
  getMusicalGroupScrollPage,
  measureMusicalGroupTabsStuckBaseline,
} from './musicalGroupScrollOffset'
import { useMusicalGroupHome } from './useMusicalGroupHome'
import { useMusicalGroupScrollStates } from './useMusicalGroupScrollStates'

const headerVariant = defineModel<WikitaChromeHeaderVariant>('headerVariant', {
  default: 'black',
})

const emit = defineEmits<{
  'toggle-search': []
  'reset-stored-data': []
  'go-home': []
}>()

const route = useRoute()
const activeTab = ref<HomeTabId>('home')

useMusicalGroupScrollStates()

const {
  featuredArticle,
  didYouKnow,
  bornOnThisDay,
  featuredTabLoading,
  recentlySaved,
  helpWanted,
  related,
  recentChanges,
} = useMusicalGroupHome()

interface FlagPresentation {
  label: string
  icon: Icon
  color: WikitaCardItemTypeColor
}

const FLAG_PRESENTATION: Record<Exclude<HomeRecentChangeFlag, 'none'>, FlagPresentation> = {
  'first-edit': { label: "User's first edit", icon: cdxIconHeartOutline, color: 'success' },
  'new-editor': { label: 'New editor', icon: cdxIconUserAvatar, color: 'success' },
  'good-faith': { label: 'Good faith', icon: cdxIconHeartOutline, color: 'success' },
  'tone-issue': { label: 'Tone issue', icon: cdxIconAlert, color: 'warning' },
  'high-revert-risk': { label: 'High revert risk', icon: cdxIconError, color: 'error' },
}

function flagPresentation(flag: HomeRecentChangeFlag): FlagPresentation | null {
  if (flag === 'none') return null
  return FLAG_PRESENTATION[flag]
}

function itemHref(id: string) {
  const query = { ...route.query, item: id }
  delete query.tab
  return { query }
}

watch(activeTab, () => {
  const page = getMusicalGroupScrollPage()
  if (!page) return

  const top = page.scrollTop > 1 ? measureMusicalGroupTabsStuckBaseline(page) : 0
  page.scrollTo({ top, behavior: 'instant' })
})
</script>

<template>
  <div class="musical-group-home">
    <div class="musical-group-chrome-stack">
      <WikitaChromeHeader
        v-model:variant="headerVariant"
        @toggle-search="emit('toggle-search')"
        @reset-stored-data="emit('reset-stored-data')"
        @go-home="emit('go-home')"
      />
    </div>

    <WikitaHomeTabs v-model:active-tab="activeTab" />

    <div class="musical-group-home__body">
      <template v-if="activeTab === 'home'">
        <WikitaHomeSection v-if="featuredArticle" title="Featured">
          <WikitaCardItem
            type="Article of the day"
            :type-icon="cdxIconStar"
            type-color="success"
            :title="featuredArticle.title"
            :body="featuredArticle.description"
            :show-snippet="false"
            :show-info="false"
            :thumbnail-url="featuredArticle.thumbnailUrl"
            :thumbnail-alt="featuredArticle.title"
            :href="featuredArticle.itemId ? itemHref(featuredArticle.itemId) : undefined"
            :external-href="featuredArticle.itemId ? undefined : featuredArticle.articleUrl"
          />
        </WikitaHomeSection>

        <WikitaHomeSection v-if="recentlySaved.length" title="Recently saved">
          <WikitaCardItem
            v-for="item in recentlySaved"
            :key="item.id"
            :show-type="false"
            :show-snippet="false"
            :show-info="false"
            :title="item.title"
            :body="item.description"
            :thumbnail-url="item.thumbnailUrl"
            :thumbnail-alt="item.title"
            :href="itemHref(item.id)"
          />
        </WikitaHomeSection>

        <WikitaHomeSection v-if="helpWanted.length" title="Help wanted">
          <WikitaCardItem
            v-for="suggestion in helpWanted"
            :key="suggestion.itemId"
            :type="suggestion.suggestionLabel"
            :type-icon="cdxIconReference"
            type-color="progressive"
            :title="suggestion.title"
            :body="suggestion.body"
            :show-snippet="false"
            :show-info="false"
            :thumbnail-url="suggestion.thumbnailUrl"
            :thumbnail-alt="suggestion.title"
            :href="itemHref(suggestion.itemId)"
          />
        </WikitaHomeSection>

        <WikitaHomeSection v-if="related.length" title="Related reading">
          <WikitaCardItem
            v-for="item in related"
            :key="item.title"
            :show-type="false"
            :show-snippet="false"
            :show-info="false"
            :title="item.title"
            :body="item.description"
            :thumbnail-url="item.thumbnailUrl"
            :thumbnail-alt="item.title"
            :href="item.itemId ? itemHref(item.itemId) : undefined"
            :external-href="item.itemId ? undefined : item.articleUrl"
          />
        </WikitaHomeSection>

        <WikitaHomeSection v-if="recentChanges.length" title="Recent changes">
          <WikitaCardItem
            v-for="change in recentChanges"
            :key="change.enwikiTitle"
            :show-type="flagPresentation(change.flag) !== null"
            :type="flagPresentation(change.flag)?.label"
            :type-icon="flagPresentation(change.flag)?.icon"
            :type-color="flagPresentation(change.flag)?.color ?? 'base'"
            :title="change.title"
            :body="change.editSummary"
            :show-snippet="false"
            :show-info="false"
            :thumbnail-url="change.thumbnailUrl"
            :thumbnail-alt="change.title"
            :external-href="change.diffUrl"
          />
        </WikitaHomeSection>
      </template>

      <template v-else-if="activeTab === 'featured'">
        <CdxProgressBar v-if="featuredTabLoading" inline aria-label="Loading featured" />

        <template v-else>
          <WikitaCardItem
            v-if="featuredArticle"
            type="Article of the day"
            :type-icon="cdxIconStar"
            type-color="success"
            :title="featuredArticle.title"
            :body="featuredArticle.description"
            :show-snippet="false"
            :show-info="false"
            :thumbnail-url="featuredArticle.thumbnailUrl"
            :thumbnail-alt="featuredArticle.title"
            :href="featuredArticle.itemId ? itemHref(featuredArticle.itemId) : undefined"
            :external-href="featuredArticle.itemId ? undefined : featuredArticle.articleUrl"
          />

          <WikitaHomeSection v-if="didYouKnow.length" title="Did you know">
            <WikitaCardItem
              v-for="(item, index) in didYouKnow"
              :key="`dyk-${index}`"
              :show-type="false"
              :show-title="false"
              :body="item.text"
              :show-snippet="false"
              :show-info="false"
              :thumbnail-url="item.thumbnailUrl"
              :thumbnail-alt="item.title ?? 'Did you know'"
              :href="item.itemId ? itemHref(item.itemId) : undefined"
              :external-href="item.itemId ? undefined : item.articleUrl"
            />
          </WikitaHomeSection>

          <WikitaHomeSection v-if="bornOnThisDay.length" title="Born on this day">
            <WikitaCardItem
              v-for="item in bornOnThisDay"
              :key="item.enwikiTitle"
              :show-type="false"
              :title="item.title"
              :body="`Born ${item.year}: ${item.text}`"
              :show-snippet="false"
              :show-info="false"
              :thumbnail-url="item.thumbnailUrl"
              :thumbnail-alt="item.title"
              :href="item.itemId ? itemHref(item.itemId) : undefined"
              :external-href="item.itemId ? undefined : item.articleUrl"
            />
          </WikitaHomeSection>
        </template>
      </template>

      <div v-else class="musical-group-home__empty" aria-hidden="true" />
    </div>
  </div>
</template>

<style scoped>
.musical-group-home {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background-color: var(--background-color-base);
}

.musical-group-home__body {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
  padding: var(--spacing-50);
}

.musical-group-home__body > :first-child {
  margin-top: var(--spacing-50);
}

.musical-group-home__empty {
  min-height: var(--musical-group-tab-panel-min-height, 50vh);
}
</style>
