<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { CdxProgressBar } from '@wikimedia/codex'

import ArticleHeader from '@/components/article/ArticleHeader.vue'
import type { Skin } from '@/theme'

import AudreLordeEditSurface from './AudreLordeEditSurface.vue'
import SuggestionMinervaSheet from './SuggestionMinervaSheet.vue'
import SuggestionSidebar from './SuggestionSidebar.vue'
import VisualEditorToolbar from './VisualEditorToolbar.vue'
import {
  CITATION_SUGGESTIONS_DEMO_KEY,
  useCitationSuggestionsDemo,
} from './useCitationSuggestionsDemo'

const props = defineProps<{
  skin: Skin
}>()

const emit = defineEmits<{
  exitRead: []
}>()

const showSuggestions = defineModel<boolean>('showSuggestions', { required: true })

const isEditMode = ref(true)
const editRootRef = ref<HTMLElement | null>(null)

const isMobileSkin = computed(() => props.skin === 'mobile')

const skinClass = computed(() =>
  isMobileSkin.value
    ? ['minerva-skin', 'edit-mode', showSuggestions.value ? 'minerva-suggestions-on' : '']
    : ['vector-skin', 'edit-mode'],
)

const demo = useCitationSuggestionsDemo({
  isEditMode,
  showSuggestions,
  isMobileSkin,
  editRootRef,
})

provide(CITATION_SUGGESTIONS_DEMO_KEY, demo)

watch(
  () => isEditMode.value,
  (active) => {
    if (active) demo.beginEditSession()
  },
  { immediate: true },
)

function onExitEdit() {
  demo.endEditSession()
  emit('exitRead')
}
</script>

<template>
  <div
    ref="editRootRef"
    class="visual-editor-layout"
    :class="skinClass"
  >
    <div class="page-container">
      <div
        class="main-content-area"
        :class="{ 'has-suggestions': showSuggestions && !isMobileSkin }"
      >
        <article class="article">
          <div class="article-chrome">
            <ArticleHeader
              v-if="!isMobileSkin"
              title="Audre Lorde"
              :languages-count="95"
              active-action="edit"
              @read-click="onExitEdit"
            />
          </div>

          <VisualEditorToolbar
            :skin="skin"
            :has-unsaved-changes="demo.hasUnsavedChanges.value"
            v-model:show-suggestions="showSuggestions"
            @exit-edit="onExitEdit"
            @undo="demo.undoEdits()"
          />

          <div v-if="demo.isLoading.value" class="loading-progress">
            <CdxProgressBar aria-label="Loading edit mode" />
          </div>

          <AudreLordeEditSurface :skin="skin" :show-suggestions="showSuggestions" />
        </article>

        <SuggestionSidebar
          v-if="!isMobileSkin"
          :show-suggestions="showSuggestions"
          :suggestions-top-offset="demo.suggestionsTopOffset.value"
        />
      </div>
    </div>

    <SuggestionMinervaSheet v-if="isMobileSkin" v-model:show-suggestions="showSuggestions" />
  </div>
</template>

<style src="./visual-editor.css"></style>

<style scoped>
.visual-editor-layout :deep(.article) {
  max-width: none;
  margin-inline: 0;
  padding-inline: 0;
  width: 100%;
}
</style>
