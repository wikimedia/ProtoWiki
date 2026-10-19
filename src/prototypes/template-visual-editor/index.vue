<script setup lang="ts">
import { ref, watch } from 'vue'
import { cdxIconEdit } from '@wikimedia/codex-icons'

import ArticleCustom from '@/components/article/ArticleCustom.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import { useSkin } from '@/composables/useSkin'

import AudreLordeReadContent from './AudreLordeReadContent.vue'
import ReaderPageLayout from './ReaderPageLayout.vue'
import VisualEditorLayout from './VisualEditorLayout.vue'

definePage({
  meta: {
    category: 'template',
    platform: 'web',
    order: 4,
    icon: cdxIconEdit,
  },
})

const skin = useSkin()
const isEditMode = ref(false)
const showSuggestions = ref(true)

function enterEditMode() {
  isEditMode.value = true
  showSuggestions.value = true
}

function exitEditMode() {
  isEditMode.value = false
}

watch(isEditMode, (edit) => {
  if (edit) showSuggestions.value = true
})
</script>

<template>
  <ChromeWrapper :show-footer="!isEditMode">
    <ReaderPageLayout v-if="!isEditMode" :skin="skin">
      <ArticleCustom
        title="Audre Lorde"
        :languages-count="95"
        active-action="read"
        @edit-click="enterEditMode"
      >
        <AudreLordeReadContent />
      </ArticleCustom>
    </ReaderPageLayout>

    <VisualEditorLayout
      v-else
      v-model:show-suggestions="showSuggestions"
      :skin="skin"
      @exit-read="exitEditMode"
    />
  </ChromeWrapper>
</template>
