<!-- Edit surface derived from suggestion-mode (Bárbara Martínez Calvo). -->
<script setup lang="ts">
import { inject } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconClose, cdxIconLightbulb } from '@wikimedia/codex-icons'

import type { Skin } from '@/theme'

import lordeImage from './assets/lorde-1980.png'
import { CITATION_SUGGESTIONS_DEMO_KEY } from './useCitationSuggestionsDemo'

defineProps<{
  skin: Skin
  showSuggestions: boolean
}>()

const demo = inject(CITATION_SUGGESTIONS_DEMO_KEY)
if (!demo) {
  throw new Error('AudreLordeEditSurface requires citation suggestions demo')
}
</script>

<template>
  <div v-if="demo" class="edit-mode-content">
    <div v-if="demo.isLoading.value" class="loading-overlay"></div>

    <div class="article-content-edit">
      <div class="edit-header">
        <p class="tagline-edit">From Wikipedia, the free encyclopedia</p>
      </div>

      <div class="article-main-edit">
        <div
          :ref="(el) => { demo.articleFirstSectionRef.value = el as HTMLElement | null }"
          class="article-first-section"
        >
          <div class="article-text-block">
            <div
              contenteditable="true"
              class="article-text-editable"
              @input="demo.markArticleEdited()"
            >
              <p>
                <strong>Audre Lorde</strong> (<a href="#">/ˈɔːdri ˈlɔːrd/</a>; born
                <strong>Audrey Geraldine Lorde</strong>; February 18, 1934 – November 17, 1992) was
                an American writer, <a href="#">feminist</a>, <a href="#">womanist</a>,
                <a href="#">librarian</a>, and <a href="#">civil rights</a> activist.
              </p>
            </div>
          </div>

          <aside class="infobox">
            <div class="infobox-title">Audre Lorde</div>
            <div class="infobox-image-section">
              <div class="infobox-image">
                <img :src="lordeImage" alt="Audre Lorde in 1980" />
              </div>
              <div class="infobox-caption">Lorde in 1980</div>
            </div>
          </aside>
        </div>

        <div class="section-heading-edit">
          <h2 class="heading-text-edit">Career</h2>
          <div class="heading-divider"></div>
        </div>

        <div contenteditable="true" class="article-text-editable" @input="demo.markArticleEdited()">
          <p>
            In 1954, she spent a pivotal year as a student at the
            <a href="#">National Autonomous University of Mexico</a>.
          </p>
          <p>&nbsp;</p>

          <p
            v-if="
              showSuggestions &&
              !demo.showSuccessMessage1.value &&
              demo.citationNumber1.value === null &&
              !demo.isSuggestionDeclined1.value
            "
            :ref="
              (el) => {
                demo.highlightedTextRef.value = el as HTMLElement | null
              }
            "
            class="suggestion-target"
            :class="{
              'highlighted-text-wrapper': showSuggestions,
              'highlighted-text-wrapper--hover':
                demo.isHovered.value && showSuggestions && !demo.isCardExpanded.value,
              'highlighted-text-wrapper--selected': demo.isCardExpanded.value && showSuggestions,
              'minerva-suggestion-target': skin === 'mobile',
            }"
            @mouseenter="demo.isTextHovered.value = true"
            @mouseleave="demo.isTextHovered.value = false"
            @click="
              skin === 'mobile'
                ? demo.openMinervaSuggestion(1)
                : (demo.isCardExpanded.value = true)
            "
          >
            <span class="highlighted-text-rail"></span>
            <span class="highlighted-text-content">
              In 1968 Lorde was writer-in-residence at <a href="#">Tougaloo College</a> in
              Mississippi.
              <sup
                v-if="demo.showCitationPopup1.value || demo.citationNumber1.value"
                class="citation-marker"
                >[{{ demo.citationNumber1.value || '...' }}]</sup
              >
            </span>
            <span v-if="skin === 'mobile'" class="minerva-highlight-rail"></span>
            <button
              v-if="skin === 'mobile'"
              type="button"
              class="minerva-suggestion-trigger"
              aria-label="Show suggestion"
              @click.stop="demo.openMinervaSuggestion(1)"
            >
              <CdxIcon :icon="cdxIconLightbulb" size="medium" />
            </button>
          </p>

          <div v-if="demo.showCitationPopup1.value" class="citation-popup">
            <div class="citation-popup-pointer"></div>
            <div class="citation-popup-header">
              <button
                type="button"
                class="citation-popup-close"
                aria-label="Close"
                @click="demo.showCitationPopup1.value = false"
              >
                <CdxIcon :icon="cdxIconClose" size="medium" />
              </button>
              <h3 class="citation-popup-title">Add citation</h3>
            </div>
            <div class="citation-popup-content">
              <div class="citation-input-group">
                <input
                  v-model="demo.citationUrl1.value"
                  type="text"
                  class="citation-input"
                  placeholder="http://www.example.com"
                />
                <button
                  type="button"
                  class="citation-create-btn"
                  :disabled="!demo.isValidUrl1.value"
                  @click="demo.createCitation1()"
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          <p v-else>
            In 1968 Lorde was writer-in-residence at <a href="#">Tougaloo College</a> in Mississippi.
          </p>
          <p>&nbsp;</p>

          <p
            v-if="
              showSuggestions &&
              !demo.showSuccessMessage2.value &&
              demo.citationNumber2.value === null &&
              !demo.isSuggestionDeclined2.value
            "
            :ref="
              (el) => {
                demo.highlightedTextRef2.value = el as HTMLElement | null
              }
            "
            class="suggestion-target"
            :class="{
              'highlighted-text-wrapper': showSuggestions,
              'highlighted-text-wrapper--hover':
                demo.isHovered2.value && showSuggestions && !demo.isCardExpanded2.value,
              'highlighted-text-wrapper--selected': demo.isCardExpanded2.value && showSuggestions,
              'minerva-suggestion-target': skin === 'mobile',
            }"
            @mouseenter="demo.isTextHovered2.value = true"
            @mouseleave="demo.isTextHovered2.value = false"
            @click="
              skin === 'mobile'
                ? demo.openMinervaSuggestion(2)
                : (demo.isCardExpanded2.value = true)
            "
          >
            <span class="highlighted-text-rail"></span>
            <span class="highlighted-text-content">
              In 1981, Lorde was among the founders of the Women's Coalition of St. Croix.
              <sup
                v-if="demo.showCitationPopup2.value || demo.citationNumber2.value"
                class="citation-marker"
                >[{{ demo.citationNumber2.value || '...' }}]</sup
              >
            </span>
            <button
              v-if="skin === 'mobile'"
              type="button"
              class="minerva-suggestion-trigger"
              aria-label="Show suggestion"
              @click.stop="demo.openMinervaSuggestion(2)"
            >
              <CdxIcon :icon="cdxIconLightbulb" size="medium" />
            </button>
          </p>

          <div v-if="demo.showCitationPopup2.value" class="citation-popup">
            <div class="citation-popup-pointer"></div>
            <div class="citation-popup-header">
              <button
                type="button"
                class="citation-popup-close"
                aria-label="Close"
                @click="demo.showCitationPopup2.value = false"
              >
                <CdxIcon :icon="cdxIconClose" size="medium" />
              </button>
              <h3 class="citation-popup-title">Add citation</h3>
            </div>
            <div class="citation-popup-content">
              <div class="citation-input-group">
                <input
                  v-model="demo.citationUrl2.value"
                  type="text"
                  class="citation-input"
                  placeholder="http://www.example.com"
                />
                <button
                  type="button"
                  class="citation-create-btn"
                  :disabled="!demo.isValidUrl2.value"
                  @click="demo.createCitation2()"
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          <p v-else>In 1981, Lorde was among the founders of the Women's Coalition of St. Croix.</p>
        </div>
      </div>
    </div>
  </div>
</template>
