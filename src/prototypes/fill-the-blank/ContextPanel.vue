<script setup lang="ts">
/**
 * "See in context": the whole source article in a scrollable panel, with the
 * question's sentence highlighted and its blank still blank (or showing the
 * option the user has picked, same as the speech bubble).
 */
import { nextTick, onMounted, ref } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconCollapse } from '@wikimedia/codex-icons'

import type { Question } from './fetchQuestions'

const props = defineProps<{
  question: Question
  selected: string | null
  lang: string
  duolingo: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const scroller = ref<HTMLElement | null>(null)
let highlight: HTMLElement | null = null
function setHighlight(el: unknown) {
  if (el instanceof HTMLElement) highlight = el
}

function isQuestionSentence(blockIndex: number, sentenceIndex: number): boolean {
  return blockIndex === props.question.blockIndex && sentenceIndex === props.question.sentenceIndex
}

// Open scrolled so the highlighted sentence sits in the middle of the panel.
onMounted(async () => {
  await nextTick()
  const box = scroller.value
  const target = highlight
  if (!box || !target) return
  box.scrollTop = target.offsetTop - box.clientHeight / 2 + target.offsetHeight / 2
})
</script>

<template>
  <section class="context-panel" :data-style="props.duolingo ? 'duolingo' : undefined" :lang="props.lang">
    <div ref="scroller" class="context-panel__scroller">
      <h3 class="context-panel__title">{{ props.question.sourceTitle }}</h3>
      <template v-for="(block, blockIndex) in props.question.article" :key="blockIndex">
        <h4 v-if="block.type === 'heading'" class="context-panel__heading">{{ block.sentences[0] }}</h4>
        <p v-else class="context-panel__paragraph">
          <template v-for="(sentence, sentenceIndex) in block.sentences" :key="sentenceIndex">
            <mark
              v-if="isQuestionSentence(blockIndex, sentenceIndex)"
              :ref="setHighlight"
              class="context-panel__highlight"
            >
              {{ props.question.before
              }}<span class="context-panel__blank" :class="{ 'context-panel__blank--filled': props.selected }">{{
                props.selected ?? ' '.repeat(10)
              }}</span
              >{{ props.question.after }}</mark
            >
            <template v-else>{{ sentence }}</template>
            {{ ' ' }}
          </template>
        </p>
      </template>
    </div>
    <div class="context-panel__footer">
      <CdxButton weight="quiet" aria-label="Close article" @click="emit('close')">
        <CdxIcon :icon="cdxIconCollapse" />
      </CdxButton>
    </div>
  </section>
</template>

<style scoped>
.context-panel {
  display: flex;
  flex-direction: column;
  /* Fill the space the question screen has left, but never so small the
     article is unreadable (the question body scrolls below that). */
  flex: 1 1 0;
  min-height: 200px;
  border: var(--border-width-base) var(--border-style-base) var(--border-color-base);
  border-radius: var(--border-radius-base);
  background-color: var(--background-color-base);
  overflow: hidden;
}

.context-panel__scroller {
  position: relative;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  /* Vertical only: long words, URLs or formulas wrap instead of widening the panel. */
  overscroll-behavior-x: none;
  overflow-wrap: anywhere;
  padding: var(--spacing-100);
}

.context-panel__title {
  margin: 0 0 var(--spacing-75);
}

.context-panel__heading {
  margin: var(--spacing-150) 0 var(--spacing-50);
}

.context-panel__paragraph {
  margin: 0 0 var(--spacing-75);
}

.context-panel__highlight {
  background-color: var(--background-color-warning-subtle);
  color: inherit;
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

.context-panel__blank {
  display: inline-block;
  min-width: 5em;
  border-bottom: var(--border-width-thick) var(--border-style-base) var(--border-color-emphasized);
}

.context-panel__blank--filled {
  min-width: 0;
  color: var(--color-progressive);
  border-bottom-color: var(--border-color-progressive);
}

.context-panel__footer {
  display: flex;
  justify-content: center;
  border-top: var(--border-width-base) var(--border-style-base) var(--border-color-subtle);
}

/* Duolingo look: rounded card, chunky edge, roomy rounded type, yellow pill highlight. */
.context-panel[data-style='duolingo'] {
  border: 2px solid var(--duo-border);
  border-bottom-width: 4px;
  border-radius: 16px;
}

.context-panel[data-style='duolingo'] .context-panel__scroller {
  padding: 16px 20px;
  font-size: 1.0625rem;
  line-height: 1.75;
  color: var(--duo-text);
}

.context-panel[data-style='duolingo'] .context-panel__title {
  font-size: 1.375rem;
  font-weight: 800;
  line-height: 1.3;
  color: var(--duo-heading);
}

.context-panel[data-style='duolingo'] .context-panel__heading {
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1.4;
  color: var(--duo-heading);
}

.context-panel[data-style='duolingo'] .context-panel__highlight {
  padding: 2px 6px;
  border-radius: 999px;
  background-color: var(--duo-highlight);
}

.context-panel[data-style='duolingo'] .context-panel__blank {
  border-bottom-color: var(--duo-heading);
}

.context-panel[data-style='duolingo'] .context-panel__blank--filled {
  color: var(--duo-blue);
  border-bottom-color: var(--duo-blue);
}

.context-panel[data-style='duolingo'] .context-panel__footer {
  border-top: 2px solid var(--duo-border);
}

.context-panel[data-style='duolingo'] .context-panel__footer :deep(.cdx-icon) {
  color: var(--duo-subtle);
}
</style>
