<script setup lang="ts">
import { cdxIconEdit, cdxIconMenu } from '@wikimedia/codex-icons'

definePage({
  meta: {
    title: 'Visual Editor',
    description: 'Template for prototyping the Visual Editor.',
    category: 'template',
    platform: 'web',
    order: 4.5,
    icon: cdxIconEdit,
  },
})

import { computed, ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'

import ArticleLive from '@/components/article/ArticleLive.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SettingsPopover from '@/components/settings/SettingsPopover.vue'
import { useWikiPageTitleQuery } from '@/composables/useWikiPageTitleQuery'
import { globalSkin } from '@/theme'
import { ARTICLE_TEMPLATE_PATH, SAVED_PAGES_TEMPLATE_PATH } from '@/composables/webTemplatePaths'

import SuggestionSettingsPanel from '@/components/settings/SuggestionSettingsPanel.vue'

const { titleFromQuery, setWikiPageTitle } = useWikiPageTitleQuery()

const skin = computed(() => globalSkin.value)
const isMobile = computed(() => skin.value === 'mobile')

const editing = ref(false)
const suggestionCount = ref<number | null>(null)

const article = computed(() => titleFromQuery.value)

function onTitleResolved(title: string) {
  if (title?.trim()) setWikiPageTitle(title)
}
</script>

<template>
  <ChromeWrapper
    :show-footer="!(isMobile && editing)"
    :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH"
  >
    <template v-if="isMobile && editing" #header><span /></template>

    <template #menu>
      <SettingsPopover>
        <template #default="{ toggle }">
          <CdxButton
            v-if="!isMobile"
            class="chrome-header__menu-btn"
            weight="quiet"
            aria-label="Main menu"
            aria-haspopup="dialog"
            @click="toggle"
          >
            <CdxIcon :icon="cdxIconMenu" />
          </CdxButton>
          <CdxButton
            v-else
            weight="quiet"
            size="large"
            aria-label="Main menu"
            aria-haspopup="dialog"
            @click="toggle"
          >
            <CdxIcon :icon="cdxIconMenu" />
          </CdxButton>
        </template>
        <template #panel>
          <SuggestionSettingsPanel :detected-count="suggestionCount" />
        </template>
      </SettingsPopover>
    </template>

    <ArticleLive
      v-model:editing="editing"
      v-model:suggestion-count="suggestionCount"
      editable
      start-in-edit-mode
      :read-route="ARTICLE_TEMPLATE_PATH"
      :wiki-link-route="ARTICLE_TEMPLATE_PATH"
      :saved-pages-route="SAVED_PAGES_TEMPLATE_PATH"
      :article="article"
      @title-resolved="onTitleResolved"
    />
  </ChromeWrapper>
</template>
