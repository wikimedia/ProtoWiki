<!-- Minerva suggestion sheet derived from suggestion-mode (Bárbara Martínez Calvo). -->
<script setup lang="ts">
import { inject } from 'vue'
import { CdxButton, CdxIcon, CdxToggleButton } from '@wikimedia/codex'
import { cdxIconExpand, cdxIconLightbulb } from '@wikimedia/codex-icons'

import { CITATION_SUGGESTIONS_DEMO_KEY } from './useCitationSuggestionsDemo'

const showSuggestions = defineModel<boolean>('showSuggestions', { required: true })

const demo = inject(CITATION_SUGGESTIONS_DEMO_KEY)
if (!demo) throw new Error('SuggestionMinervaSheet requires citation suggestions demo')
</script>

<template>
  <template v-if="demo">
    <CdxToggleButton
      v-model="showSuggestions"
      quiet
      aria-label="Toggle suggestions"
      class="minerva-suggestions-toggle"
      :class="{ 'minerva-suggestions-toggle--active': showSuggestions }"
      :style="{
        bottom: demo.isMinervaSheetOpen.value
          ? `calc(16px + ${demo.minervaSheetHeight.value}px)`
          : '16px',
      }"
    >
      <span class="lightbulb-icon-wrapper">
        <span v-if="showSuggestions" class="bulb-rays">
          <span class="ray ray-1"></span>
          <span class="ray ray-2"></span>
          <span class="ray ray-3"></span>
          <span class="ray ray-4"></span>
          <span class="ray ray-5"></span>
        </span>
        <CdxIcon :icon="cdxIconLightbulb" size="medium" />
      </span>
    </CdxToggleButton>

    <div
      v-if="showSuggestions && demo.isMinervaSheetOpen.value"
      :ref="(el) => { demo.minervaSheetRef.value = el as HTMLElement | null }"
      class="minerva-bottom-sheet"
      role="dialog"
      aria-label="Suggestion"
    >
      <div
        class="minerva-sheet-header"
        :class="{
          'minerva-sheet-header--empty': demo.shouldShowEmptyState.value,
          'minerva-sheet-header--notification': demo.showSuggestionNotification.value,
        }"
      >
        <CdxIcon :icon="cdxIconLightbulb" size="medium" />
        <div class="minerva-sheet-title">{{ demo.minervaSheetTitle.value }}</div>
        <CdxButton
          v-if="demo.showSuggestionNotification.value"
          class="minerva-sheet-notification-btn"
          action="default"
          weight="quiet"
          @click.stop="demo.handleNotificationClick()"
        >
          Scroll to first
        </CdxButton>
        <button
          v-else-if="!demo.showSuggestionNotification.value"
          type="button"
          class="minerva-sheet-close"
          aria-label="Close"
          @click="demo.closeMinervaSuggestion()"
        >
          <CdxIcon :icon="cdxIconExpand" size="small" />
        </button>
      </div>
      <p v-if="demo.shouldShowEmptyState.value" class="minerva-empty-sheet-text">
        There are no suggestions to improve this article yet.
      </p>
      <p v-else-if="!demo.showSuggestionNotification.value" class="minerva-sheet-description">
        Help readers understand where this information is coming from by adding a citation.
      </p>
      <div
        v-if="!demo.shouldShowEmptyState.value && !demo.showSuggestionNotification.value"
        class="minerva-sheet-actions"
      >
        <template v-if="demo.activeMinervaSuggestion.value === 1">
          <CdxButton
            class="minerva-sheet-btn"
            action="default"
            weight="normal"
            :disabled="demo.showCitationPopup1.value"
            @click="demo.handleYesSuggestion1()"
          >
            Yes
          </CdxButton>
          <CdxButton
            class="minerva-sheet-btn minerva-sheet-btn-secondary"
            action="default"
            weight="normal"
            :disabled="demo.showCitationPopup1.value"
            @click="demo.handleNoSuggestion1()"
          >
            No
          </CdxButton>
        </template>
        <template v-else>
          <CdxButton
            class="minerva-sheet-btn"
            action="default"
            weight="normal"
            :disabled="demo.showCitationPopup2.value"
            @click="demo.handleYesSuggestion2()"
          >
            Yes
          </CdxButton>
          <CdxButton
            class="minerva-sheet-btn minerva-sheet-btn-secondary"
            action="default"
            weight="normal"
            :disabled="demo.showCitationPopup2.value"
            @click="demo.handleNoSuggestion2()"
          >
            No
          </CdxButton>
        </template>
      </div>
    </div>
  </template>
</template>
