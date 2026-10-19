<!-- Desktop suggestion panel derived from suggestion-mode (Bárbara Martínez Calvo). -->
<script setup lang="ts">
import { inject } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconLightbulb, cdxIconSuccess } from '@wikimedia/codex-icons'

import { CITATION_SUGGESTIONS_DEMO_KEY } from './useCitationSuggestionsDemo'

defineProps<{
  showSuggestions: boolean
  suggestionsTopOffset: number
}>()

const demo = inject(CITATION_SUGGESTIONS_DEMO_KEY)
if (!demo) throw new Error('SuggestionSidebar requires citation suggestions demo')
</script>

<template>
  <aside
    v-if="demo && showSuggestions"
    class="suggestions-sidebar"
    :style="{ marginTop: `${suggestionsTopOffset}px` }"
  >
    <div
      v-if="showSuggestions && demo.showSuggestionNotification.value && demo.hasPendingSuggestions.value"
      class="suggestion-card suggestion-card--expanded suggestion-notification-card"
      role="button"
      tabindex="0"
      @click="demo.handleNotificationClick()"
      @keydown="demo.handleNotificationKeydown($event)"
    >
      <div class="suggestion-header suggestion-header--expanded suggestion-notification-header">
        <div class="suggestion-icon">
          <CdxIcon :icon="cdxIconLightbulb" size="medium" />
        </div>
        <div class="suggestion-title">2 suggestions available</div>
        <CdxButton
          class="suggestion-notification-action"
          action="default"
          weight="quiet"
          @click.stop="demo.handleNotificationClick()"
        >
          Scroll to first
        </CdxButton>
      </div>
    </div>

    <div
      v-if="
        showSuggestions &&
        !demo.showSuggestionNotification.value &&
        !demo.showSuccessMessage1.value &&
        demo.citationNumber1.value === null &&
        !demo.isSuggestionDeclined1.value
      "
      class="suggestion-card suggestion-card-positioned"
      :class="{
        'suggestion-card--collapsed': !demo.isCardExpanded.value,
        'suggestion-card--expanded': demo.isCardExpanded.value,
        'suggestion-card--hover': demo.isHovered.value,
      }"
      :style="{ top: `${demo.sidebarTopOffset.value}px` }"
      @mouseenter="demo.isCardHovered.value = true"
      @mouseleave="demo.isCardHovered.value = false"
    >
      <button
        v-if="!demo.isCardExpanded.value"
        type="button"
        class="suggestion-header suggestion-header--collapsed"
        @click="demo.isCardExpanded.value = true"
      >
        <div class="suggestion-icon">
          <CdxIcon :icon="cdxIconLightbulb" size="medium" />
        </div>
        <div class="suggestion-title">Add a citation</div>
      </button>
      <button
        v-else
        type="button"
        class="suggestion-header suggestion-header--expanded"
        aria-expanded="true"
        @click="demo.isCardExpanded.value = false"
      >
        <div class="suggestion-icon">
          <CdxIcon :icon="cdxIconLightbulb" size="medium" />
        </div>
        <div class="suggestion-title">Add a citation</div>
      </button>
      <div v-if="demo.isCardExpanded.value" class="suggestion-content">
        <p class="suggestion-description">
          Help readers understand where this information is coming from by adding a citation.
        </p>
        <div class="suggestion-actions">
          <button
            type="button"
            class="suggestion-btn"
            :disabled="demo.showCitationPopup1.value"
            @click="demo.handleYesSuggestion1()"
          >
            Yes
          </button>
          <button
            type="button"
            class="suggestion-btn suggestion-btn-secondary"
            :disabled="demo.showCitationPopup1.value"
            @click="demo.handleNoSuggestion1()"
          >
            No
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="
        showSuggestions &&
        !demo.showSuggestionNotification.value &&
        demo.showSuccessMessage1.value &&
        demo.citationNumber1.value !== null
      "
      class="success-message"
      :style="{ top: `${demo.sidebarTopOffset.value}px` }"
    >
      <div class="success-icon">
        <CdxIcon :icon="cdxIconSuccess" size="medium" />
      </div>
      <div class="success-content">
        <p class="success-text">Thank you for helping to make this section easier for people to read.</p>
      </div>
    </div>

    <div
      v-if="
        showSuggestions &&
        !demo.showSuggestionNotification.value &&
        !demo.showSuccessMessage2.value &&
        demo.citationNumber2.value === null &&
        !demo.isSuggestionDeclined2.value
      "
      class="suggestion-card suggestion-card-positioned"
      :class="{
        'suggestion-card--collapsed': !demo.isCardExpanded2.value,
        'suggestion-card--expanded': demo.isCardExpanded2.value,
        'suggestion-card--hover': demo.isHovered2.value,
      }"
      :style="{ top: `${demo.sidebarTopOffset2.value}px` }"
      @mouseenter="demo.isCardHovered2.value = true"
      @mouseleave="demo.isCardHovered2.value = false"
    >
      <button
        v-if="!demo.isCardExpanded2.value"
        type="button"
        class="suggestion-header suggestion-header--collapsed"
        @click="demo.isCardExpanded2.value = true"
      >
        <div class="suggestion-icon">
          <CdxIcon :icon="cdxIconLightbulb" size="medium" />
        </div>
        <div class="suggestion-title">Add a citation</div>
      </button>
      <button
        v-else
        type="button"
        class="suggestion-header suggestion-header--expanded"
        aria-expanded="true"
        @click="demo.isCardExpanded2.value = false"
      >
        <div class="suggestion-icon">
          <CdxIcon :icon="cdxIconLightbulb" size="medium" />
        </div>
        <div class="suggestion-title">Add a citation</div>
      </button>
      <div v-if="demo.isCardExpanded2.value" class="suggestion-content">
        <p class="suggestion-description">
          Help readers understand where this information is coming from by adding a citation.
        </p>
        <div class="suggestion-actions">
          <button
            type="button"
            class="suggestion-btn"
            :disabled="demo.showCitationPopup2.value"
            @click="demo.handleYesSuggestion2()"
          >
            Yes
          </button>
          <button
            type="button"
            class="suggestion-btn suggestion-btn-secondary"
            :disabled="demo.showCitationPopup2.value"
            @click="demo.handleNoSuggestion2()"
          >
            No
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="
        showSuggestions &&
        !demo.showSuggestionNotification.value &&
        demo.allSuggestionsHandled.value
      "
      class="empty-state"
    >
      <div class="empty-state-icon">
        <CdxIcon :icon="cdxIconLightbulb" size="medium" />
      </div>
      <div class="empty-state-content">
        <p class="empty-state-text">There are no suggestions to improve this article yet.</p>
      </div>
    </div>
  </aside>
</template>
