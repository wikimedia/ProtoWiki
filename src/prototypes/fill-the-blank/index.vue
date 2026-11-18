<script setup lang="ts">
definePage({
  meta: {
    // title + description: ask the author, or omit
    category: 'prototype',
    platform: 'app',
  },
})

import { computed, onBeforeUnmount, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { CdxButton, CdxIcon, CdxLookup, CdxMessage, CdxProgressBar, CdxToggleButton } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import MobileWrapper from '@/components/MobileWrapper.vue'
import ContextPanel from './ContextPanel.vue'
import SourceAttribution from './SourceAttribution.vue'
import { useAttributionSignals } from '@/components/attribution/useAttributionSignals'
import { wikiHostFromLang } from '@/config'
import {
  articleUrl,
  fetchQuestions,
  QUIZ_LANG,
  QuizError,
  searchArticles,
  type ArticleSuggestion,
  type Question,
} from './fetchQuestions'

/**
 * Default look is a Duolingo-like reskin of the Codex components; `?style=codex`
 * turns it off and shows plain Codex (token remap + shape overrides in the
 * style block below). Nunito stands in for
 * Duolingo's proprietary rounded fonts and only loads when the style is on.
 */
const route = useRoute()
const duolingo = computed(() => route.query.style !== 'codex')
const NUNITO_LINK_ID = 'fill-the-blank-nunito'
watchEffect(() => {
  if (!duolingo.value || document.getElementById(NUNITO_LINK_ID)) return
  const link = document.createElement('link')
  link.id = NUNITO_LINK_ID
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800&display=swap'
  document.head.appendChild(link)
})

/**
 * The character "saying" each sentence: Baby Globe (camera), from Commons —
 * https://commons.wikimedia.org/wiki/File:Baby_Globe_Camera.png
 * The original is 5000×5000, so use Commons' 250px thumbnail.
 */
const CHARACTER_SRC =
  'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Baby_Globe_Camera.png/250px-Baby_Globe_Camera.png'
const CHARACTER_CREDIT = 'Baby Globe — Wikimedia Foundation and contractors, CC BY-SA 4.0, via Wikimedia Commons'

type Screen = 'topic' | 'loading' | 'error' | 'question' | 'done'

const screen = ref<Screen>('topic')
/** Article chosen in the lookup — the quiz seed. */
const topic = ref<string | null>(null)
const lookupInput = ref('')
const suggestions = ref<ArticleSuggestion[]>([])
const errorMessage = ref('')
const questions = ref<Question[]>([])
const index = ref(0)
const selected = ref<string | null>(null)
const checked = ref(false)
const score = ref(0)
/** "See in context" — show the whole source article instead of the speech bubble. */
const contextOpen = ref(false)

let controller: AbortController | null = null
let searchController: AbortController | null = null
let searchTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => {
  controller?.abort()
  searchController?.abort()
  clearTimeout(searchTimer)
})

const menuItems = computed(() =>
  suggestions.value.map((s) => ({
    value: s.title,
    label: s.label,
    // Show the French article it maps to when you searched in English.
    supportingText: s.label !== s.title ? `(${s.title})` : undefined,
    description: s.description,
    thumbnail: s.thumbnail ? { url: s.thumbnail } : null,
  })),
)

function onLookupInput(value: string) {
  clearTimeout(searchTimer)
  searchController?.abort()
  const prefix = value.trim()
  if (!prefix) {
    suggestions.value = []
    return
  }
  searchTimer = setTimeout(async () => {
    searchController = new AbortController()
    const { signal } = searchController
    try {
      const result = await searchArticles(prefix, signal)
      if (!signal.aborted) suggestions.value = result
    } catch {
      if (!signal.aborted) suggestions.value = []
    }
  }, 200)
}

const current = computed(() => questions.value[index.value])
const isCorrect = computed(() => selected.value === current.value?.answer)

// Attribution for the current question's source article, fetched as soon as the
// question shows so it's ready by the time the feedback panel appears.
const quizHost = wikiHostFromLang(QUIZ_LANG)
const { signals: attributionSignals } = useAttributionSignals(
  computed(() => current.value?.sourceTitle ?? ''),
  { host: quizHost, backfillContributorCount: false },
)
const progress = computed(() => {
  const total = questions.value.length || 1
  return ((index.value + (checked.value ? 1 : 0)) / total) * 100
})

/** Picking an article in the dropdown goes straight to the questions. */
function onArticleSelected(title: string | null) {
  topic.value = title
  if (title) void start()
}

async function start() {
  const query = topic.value
  if (!query) return
  controller?.abort()
  controller = new AbortController()
  const { signal } = controller
  screen.value = 'loading'
  try {
    const result = await fetchQuestions(query, signal)
    if (signal.aborted) return
    questions.value = result
    index.value = 0
    score.value = 0
    selected.value = null
    checked.value = false
    contextOpen.value = false
    screen.value = 'question'
  } catch (error) {
    if (signal.aborted) return
    errorMessage.value =
      error instanceof QuizError ? error.message : 'Something went wrong loading questions. Please try again.'
    screen.value = 'error'
  }
}

function newTopic() {
  controller?.abort()
  screen.value = 'topic'
}

function select(option: string, on: boolean) {
  if (checked.value) return
  selected.value = on ? option : null
}

function check() {
  if (!selected.value) return
  checked.value = true
  if (isCorrect.value) score.value++
}

function next() {
  if (index.value + 1 >= questions.value.length) {
    screen.value = 'done'
    return
  }
  index.value++
  selected.value = null
  checked.value = false
  contextOpen.value = false
}
</script>

<template>
  <MobileWrapper>
    <div class="fill-the-blank" :data-style="duolingo ? 'duolingo' : undefined">
      <!-- Pick a topic -->
      <form v-if="screen === 'topic'" class="fill-the-blank__screen" @submit.prevent="start">
        <div class="fill-the-blank__body">
          <h3>Pick a topic</h3>
          <CdxLookup
            :selected="topic"
            v-model:input-value="lookupInput"
            :menu-items="menuItems"
            :menu-config="{ showThumbnail: true }"
            :lang="QUIZ_LANG"
            aria-label="Search Wikipedia"
            @input="onLookupInput"
            @update:selected="onArticleSelected"
          >
            <template #no-results>No articles found</template>
          </CdxLookup>
        </div>
        <CdxButton action="progressive" weight="primary" size="large" type="submit" :disabled="!topic">
          Continue
        </CdxButton>
      </form>

      <!-- Loading -->
      <div v-else-if="screen === 'loading'" class="fill-the-blank__screen">
        <div class="fill-the-blank__body">
          <h3>Finding articles…</h3>
          <CdxProgressBar aria-label="Loading questions" />
        </div>
      </div>

      <!-- Error -->
      <div v-else-if="screen === 'error'" class="fill-the-blank__screen">
        <div class="fill-the-blank__body">
          <CdxMessage type="error">{{ errorMessage }}</CdxMessage>
        </div>
        <CdxButton action="progressive" weight="primary" size="large" @click="newTopic">Pick another article</CdxButton>
      </div>

      <!-- Question -->
      <div v-else-if="screen === 'question' && current" class="fill-the-blank__screen fill-the-blank__screen--question">
        <div class="fill-the-blank__body">
          <div class="fill-the-blank__top">
            <CdxButton weight="quiet" aria-label="Close" @click="newTopic">
              <CdxIcon :icon="cdxIconClose" />
            </CdxButton>
            <div
              class="fill-the-blank__progress"
              role="progressbar"
              :aria-valuenow="Math.round(progress)"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="fill-the-blank__progress-fill" :style="{ width: `${progress}%` }" />
            </div>
          </div>

          <h3>Fill in the blank</h3>

          <ContextPanel
            v-if="contextOpen"
            :question="current"
            :selected="selected"
            :lang="QUIZ_LANG"
            :duolingo="duolingo"
            @close="contextOpen = false"
          />
          <div v-else class="fill-the-blank__passage">
            <img
              class="fill-the-blank__character"
              :src="CHARACTER_SRC"
              alt=""
              :title="CHARACTER_CREDIT"
              width="250"
              height="250"
            />
            <div class="fill-the-blank__speech">
              <cite class="fill-the-blank__source" :lang="QUIZ_LANG">
                <a :href="articleUrl(current.sourceTitle)" target="_blank" rel="noopener">{{ current.sourceTitle }}</a>
              </cite>
              <p class="fill-the-blank__sentence" :lang="QUIZ_LANG">
                {{ current.before
                }}<span
                  class="fill-the-blank__blank"
                  :class="{ 'fill-the-blank__blank--filled': selected }"
                  >{{ selected ?? ' '.repeat(10) }}</span
                >{{ current.after }}
              </p>
            </div>
          </div>
          <div v-if="!contextOpen" class="fill-the-blank__see-context">
            <CdxButton weight="quiet" action="progressive" size="small" @click="contextOpen = true">
              See in context
            </CdxButton>
          </div>

          <div class="fill-the-blank__options" :lang="QUIZ_LANG">
            <CdxToggleButton
              v-for="option in current.options"
              :key="option"
              :model-value="selected === option"
              :disabled="checked"
              @update:model-value="select(option, $event)"
            >
              {{ option }}
            </CdxToggleButton>
          </div>
        </div>

        <div class="fill-the-blank__footer" :class="{ 'fill-the-blank__footer--wrong': checked && !isCorrect }">
          <CdxMessage v-if="checked" :type="isCorrect ? 'success' : 'error'">
            <template v-if="isCorrect">Correct!</template>
            <template v-else>
              Correct answer: <strong :lang="QUIZ_LANG">{{ current.answer }}</strong>
            </template>
            <SourceAttribution :title="current.sourceTitle" :host="quizHost" :signals="attributionSignals" />
          </CdxMessage>
          <CdxButton v-if="!checked" action="progressive" weight="primary" size="large" :disabled="!selected" @click="check">
            Check
          </CdxButton>
          <CdxButton v-else action="progressive" weight="primary" size="large" @click="next">Continue</CdxButton>
        </div>
      </div>

      <!-- Score -->
      <div v-else-if="screen === 'done'" class="fill-the-blank__screen">
        <div class="fill-the-blank__body">
          <h3>You got {{ score }} / {{ questions.length }}</h3>
          <p>Article: <span :lang="QUIZ_LANG">{{ topic }}</span></p>
        </div>
        <div class="fill-the-blank__footer">
          <CdxButton action="progressive" weight="primary" size="large" @click="start">Play again</CdxButton>
          <CdxButton size="large" @click="newTopic">New topic</CdxButton>
        </div>
      </div>
    </div>
  </MobileWrapper>
</template>

<style scoped>
.fill-the-blank {
  /* Exactly one screen tall: the footer (Check / feedback / attribution) never
     pushes the page past the bottom — the question body scrolls instead. */
  height: 100vh;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: var(--spacing-150) var(--spacing-100);
  box-sizing: border-box;
  background-color: var(--background-color-base);
  color: var(--color-base);
}

.fill-the-blank__screen {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: var(--spacing-150);
}

.fill-the-blank__body,
.fill-the-blank__footer {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-100);
}

.fill-the-blank__footer {
  flex: none;
}

/* Question body takes whatever height the footer leaves, scrolling if it must.
   (Not on the topic screen: the lookup's dropdown would get clipped.) */
.fill-the-blank__screen--question .fill-the-blank__body {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  /* Room for the chunky option edges and focus rings at the scroll edges. */
  padding-bottom: var(--spacing-25);
  /* Still scrollable, but no visible scrollbar (the article panel keeps its own). */
  scrollbar-width: none;
}

.fill-the-blank__screen--question .fill-the-blank__body::-webkit-scrollbar {
  display: none;
}

.fill-the-blank__body h3 {
  margin: var(--spacing-100) 0 0;
}

.fill-the-blank__top {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.fill-the-blank__progress {
  flex: 1;
  height: var(--spacing-75);
  border-radius: var(--border-radius-pill);
  background-color: var(--background-color-disabled-subtle);
  overflow: hidden;
}

.fill-the-blank__progress-fill {
  height: 100%;
  border-radius: inherit;
  background-color: var(--background-color-progressive);
  transition: width var(--transition-duration-medium) var(--transition-timing-function-system);
}

.fill-the-blank__passage {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-75);
}

.fill-the-blank__see-context {
  display: flex;
  justify-content: flex-end;
  margin-top: calc(-1 * var(--spacing-75));
}

.fill-the-blank__character {
  flex: none;
  width: 96px;
  height: auto;
  margin-top: var(--spacing-50);
}

.fill-the-blank__speech {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.fill-the-blank__source {
  font-style: normal;
}

.fill-the-blank__sentence {
  margin: 0;
  padding: var(--spacing-100);
  border: var(--border-width-base) var(--border-style-base) var(--border-color-base);
  border-radius: var(--border-radius-base);
}

.fill-the-blank__blank {
  display: inline-block;
  min-width: 5em;
  border-bottom: var(--border-width-thick) var(--border-style-base) var(--border-color-base);
}

.fill-the-blank__blank--filled {
  color: var(--color-progressive);
  border-bottom-color: var(--border-color-progressive);
}

.fill-the-blank__options {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
}

.fill-the-blank__options :deep(.cdx-toggle-button),
.fill-the-blank__footer :deep(.cdx-button) {
  max-width: none;
  width: 100%;
}
</style>

<!--
  Default (anything but ?style=codex) — a Duolingo-like skin over the same Codex components.
  Codex tokens are remapped on the root so anything token-driven follows; the
  :deep() rules cover what Codex hardcodes (radii, border widths, casing).
-->
<style scoped>
.fill-the-blank[data-style='duolingo'] {
  --duo-text: #4b4b4b;
  --duo-heading: #3c3c3c;
  --duo-subtle: #777;
  --duo-bg: #fff;
  --duo-field: #f7f7f7;
  --duo-border: #e5e5e5;
  --duo-green: #58cc02;
  --duo-green-hover: #61e002;
  --duo-green-edge: #58a700;
  --duo-green-highlight: rgb(255 255 255 / 20%);
  --duo-blue: #1899d6;
  --duo-blue-border: #84d8ff;
  --duo-blue-bg: #ddf4ff;
  --duo-disabled-bg: #e5e5e5;
  --duo-disabled-text: #afafaf;
  --duo-success-bg: #d7ffb8;
  --duo-success-text: #58a700;
  --duo-error-bg: #ffdfe0;
  --duo-error-text: #ea2b2b;
  --duo-highlight: #fbeeab;

  --font-family-base: 'Nunito', system-ui, sans-serif;
  --font-family-serif: 'Nunito', system-ui, sans-serif;
  --color-base: var(--duo-text);
  --color-subtle: var(--duo-subtle);
  --color-progressive: var(--duo-blue);
  --background-color-base: var(--duo-bg);
  --background-color-progressive: var(--duo-green);
  --background-color-progressive--hover: var(--duo-green-hover);
  --background-color-progressive--active: var(--duo-green-edge);
  --border-color-base: var(--duo-border);
  --border-color-subtle: var(--duo-border);
  --border-color-progressive: var(--duo-blue-border);
  --background-color-disabled: var(--duo-disabled-bg);
  --color-disabled: var(--duo-disabled-text);
  --color-success: var(--duo-success-text);
  --color-error: var(--duo-error-text);

  font-family: var(--font-family-base);
}


/* Headings */
.fill-the-blank[data-style='duolingo'] h3 {
  font-size: 1.5rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--duo-heading);
}

/* Buttons: chunky rounded cards with a thicker bottom edge */
.fill-the-blank[data-style='duolingo'] :deep(.cdx-button:not(.cdx-button--weight-quiet)),
.fill-the-blank[data-style='duolingo'] :deep(.cdx-toggle-button) {
  min-height: 50px;
  border: 2px solid var(--duo-border);
  border-bottom-width: 4px;
  border-radius: 16px;
  background-color: var(--duo-bg);
  color: var(--duo-text);
  font-weight: 700;
  transition-property: background-color, color, border-color, transform;
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-button:not(.cdx-button--weight-quiet):enabled:active),
.fill-the-blank[data-style='duolingo'] :deep(.cdx-toggle-button:enabled:active) {
  border-bottom-width: 2px;
  transform: translateY(2px);
  box-shadow: none;
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-button) {
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Primary (CONTINUE / CHECK) */
.fill-the-blank[data-style='duolingo'] :deep(.cdx-button--weight-primary:enabled) {
  background-color: var(--duo-green);
  border-color: var(--duo-green-edge);
  color: #fff;
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-button--weight-primary:enabled:hover) {
  background-color: var(--duo-green-hover);
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-button:disabled) {
  background-color: var(--duo-disabled-bg);
  border-color: var(--duo-disabled-bg);
  color: var(--duo-disabled-text);
}

/* Answer options */
.fill-the-blank[data-style='duolingo'] :deep(.cdx-toggle-button) {
  font-size: 1.0625rem;
  font-weight: 400;
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-toggle-button:enabled:hover) {
  background-color: var(--duo-field);
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-toggle-button--toggled-on),
.fill-the-blank[data-style='duolingo'] :deep(.cdx-toggle-button--toggled-on:enabled),
.fill-the-blank[data-style='duolingo'] :deep(.cdx-toggle-button--toggled-on:enabled:hover) {
  background-color: var(--duo-blue-bg);
  border-color: var(--duo-blue-border);
  color: var(--duo-blue);
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-toggle-button:disabled:not(.cdx-toggle-button--toggled-on)) {
  background-color: var(--duo-bg);
  border-color: var(--duo-border);
  color: var(--duo-disabled-text);
}

/* Progress bar */
.fill-the-blank[data-style='duolingo'] .fill-the-blank__progress {
  height: 16px;
  background-color: var(--duo-border);
}

.fill-the-blank[data-style='duolingo'] .fill-the-blank__progress-fill {
  position: relative;
  background-color: var(--duo-green);
}

.fill-the-blank[data-style='duolingo'] .fill-the-blank__progress-fill::after {
  content: '';
  position: absolute;
  top: 4px;
  left: 8px;
  right: 8px;
  height: 4px;
  border-radius: 2px;
  background-color: var(--duo-green-highlight);
}

/* Sentence as a speech bubble */
.fill-the-blank[data-style='duolingo'] .fill-the-blank__sentence {
  position: relative;
  margin-left: 12px;
  border: 2px solid var(--duo-border);
  border-radius: 16px;
  padding: 12px 16px;
  font-size: 1.125rem;
  line-height: 1.75;
}

.fill-the-blank[data-style='duolingo'] .fill-the-blank__sentence::before {
  content: '';
  position: absolute;
  top: 20px;
  left: -9px;
  width: 14px;
  height: 14px;
  border-left: 2px solid var(--duo-border);
  border-bottom: 2px solid var(--duo-border);
  background-color: var(--duo-bg);
  transform: rotate(45deg);
}

.fill-the-blank[data-style='duolingo'] .fill-the-blank__source {
  margin-left: 12px;
  font-weight: 700;
}

.fill-the-blank[data-style='duolingo'] .fill-the-blank__source a {
  color: var(--duo-subtle);
}

.fill-the-blank[data-style='duolingo'] .fill-the-blank__blank {
  border-bottom-width: 2px;
  border-bottom-color: var(--duo-subtle);
}

.fill-the-blank[data-style='duolingo'] .fill-the-blank__blank--filled {
  color: var(--duo-blue);
  border-bottom-color: var(--duo-blue);
}

/* Article lookup */
.fill-the-blank[data-style='duolingo'] :deep(.cdx-text-input__input) {
  min-height: 50px;
  max-height: none;
  border: 2px solid var(--duo-border);
  border-radius: 12px;
  padding: 8px 14px;
  background-color: var(--duo-field);
  color: var(--duo-text);
  font-size: 1.0625rem;
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-text-input__input:focus) {
  border-color: var(--duo-blue-border);
  box-shadow: none;
}

/*
 * Codex's floating menu squares off the corners that touch the input via inline
 * styles (it expects to sit flush under the field). Here it floats as its own
 * rounded card with a small gap instead, so all four corners are forced round.
 */
.fill-the-blank[data-style='duolingo'] :deep(.cdx-menu) {
  margin-top: 8px;
  border: 2px solid var(--duo-border);
  border-radius: 16px !important;
  background-color: var(--duo-bg);
  box-shadow: 0 4px 0 var(--duo-border);
  overflow: hidden;
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-menu-item) {
  color: var(--duo-text);
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-menu-item--highlighted) {
  background-color: var(--duo-blue-bg);
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-thumbnail__placeholder),
.fill-the-blank[data-style='duolingo'] :deep(.cdx-thumbnail__image) {
  border-radius: 8px;
}

/* Check feedback panel */
.fill-the-blank[data-style='duolingo'] :deep(.cdx-message) {
  border: 0;
  border-radius: 16px;
  padding: 16px;
  font-size: 1.125rem;
  font-weight: 800;
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-message--success) {
  background-color: var(--duo-success-bg);
  color: var(--duo-success-text);
}

.fill-the-blank[data-style='duolingo'] :deep(.cdx-message--error) {
  background-color: var(--duo-error-bg);
  color: var(--duo-error-text);
}

/* After a wrong answer the Continue button turns red */
.fill-the-blank[data-style='duolingo'] .fill-the-blank__footer--wrong :deep(.cdx-button--weight-primary:enabled) {
  background-color: #ff4b4b;
  border-color: #ea2b2b;
}
</style>

<!-- Unscoped so it can key off <html data-theme>; class names are prototype-prefixed. -->
<style>
[data-theme='dark'] .fill-the-blank.fill-the-blank[data-style='duolingo'] {
  --duo-text: #f1f7fb;
  --duo-heading: #f1f7fb;
  --duo-subtle: #8a9ba4;
  --duo-bg: #131f24;
  --duo-field: #202f36;
  --duo-border: #37464f;
  --duo-green-edge: #58a700;
  --duo-blue: #49c0f8;
  --duo-blue-border: #3f85a7;
  --duo-blue-bg: #202f36;
  --duo-disabled-bg: #37464f;
  --duo-disabled-text: #52656d;
  --duo-success-bg: #202f36;
  --duo-success-text: #79b933;
  --duo-error-bg: #202f36;
  --duo-error-text: #ee5555;
  --duo-highlight: #4a4320;
}
</style>
