<script setup lang="ts">
/**
 * The Mentor module's body: an offer to get a mentor, or — once
 * assigned — a dismissible notice, the mentor's card and a way to ask them.
 */
import { computed } from 'vue'
import { CdxButton, CdxCard, CdxMessage } from '@wikimedia/codex'

import { useTheme } from '@/composables/useTheme'

import { MENTOR_CONTENT } from './mentorContent'
import { useHomeMentor } from './useHomeMentor'

const { isAssigned, noticeDismissed, assign, dismissNotice } = useHomeMentor()
const theme = useTheme()

const { unassigned, assigned } = MENTOR_CONTENT

/*
 * CODEX+ CdxCard: no avatar, only an image thumbnail. The mentor's initial on
 * an inverted circle, as an SVG; an image can't read CSS tokens, so these are
 * `--background-color-inverted` / `--color-inverted` per theme.
 */
const avatar = computed(() => {
  const [background, color] = theme.value === 'dark' ? ['#f8f9fa', '#101418'] : ['#101418', '#fff']
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">` +
    `<circle cx="24" cy="24" r="24" fill="${background}"/>` +
    `<text x="24" y="24" dy="0.35em" text-anchor="middle" fill="${color}" ` +
    `font-family="sans-serif" font-size="20" font-weight="700">` +
    `${assigned.mentor.name.charAt(0)}</text></svg>`
  return { url: `data:image/svg+xml,${encodeURIComponent(svg)}` }
})
</script>

<template>
  <div class="home-mentor">
    <template v-if="!isAssigned">
      <p class="home-mentor__description">{{ unassigned.description }}</p>
      <CdxButton class="home-mentor__action" @click="assign">{{ unassigned.action }}</CdxButton>
    </template>

    <template v-else>
      <CdxMessage v-if="!noticeDismissed" allow-user-dismiss @user-dismissed="dismissNotice">
        {{ assigned.notice }}
      </CdxMessage>

      <CdxCard class="home-mentor__card" :thumbnail="avatar">
        <template #title>{{ assigned.mentor.name }}</template>
        <template #description>{{ assigned.mentor.bio }}</template>
        <template #supporting-text>{{ assigned.mentor.editingSince }}</template>
      </CdxCard>

      <!-- No talk page to post to yet: asking is out of the prototype's scope. -->
      <CdxButton class="home-mentor__action">{{ assigned.action }}</CdxButton>
    </template>
  </div>
</template>

<style scoped>
.home-mentor {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-75);
}

.home-mentor__description {
  margin: 0;
  color: var(--color-subtle);
}

/* CODEX+ CdxThumbnail: square only; an avatar is round, with no frame. */
.home-mentor__card :deep(.cdx-thumbnail__image) {
  border: 0;
  border-radius: var(--border-radius-circle);
}

/*
 * CODEX+ CdxCard: description is subtle sans. The mentor's own words are a quote,
 * styled as each wiki skin styles `blockquote`: Vector 2022's `.mw-body blockquote`
 * (body sans, a 4px muted rule) and Minerva's (serif at 1.1em, a 3px subtle rule).
 * The rule widths and Minerva's size are the skins' own; Codex has no tokens for them.
 */
.home-mentor__card :deep(.cdx-card__text__description) {
  margin-top: var(--spacing-50);
  border-inline-start: 4px solid var(--border-color-muted);
  padding-block: var(--spacing-50);
  padding-inline: var(--spacing-200) var(--spacing-100);
  color: var(--color-base);
}

[data-skin='mobile'] .home-mentor__card :deep(.cdx-card__text__description) {
  border-inline-start: 3px solid var(--border-color-subtle);
  padding-inline: var(--spacing-200) var(--spacing-100);
  font-family: var(--font-family-serif);
  font-size: 1.1em;
}

/* Minerva: a full-width bar under the card. Vector's wide column hugs the label. */
.home-mentor__action {
  align-self: flex-start;
}

[data-skin='mobile'] .home-mentor__action {
  align-self: stretch;
  max-width: none;
}
</style>
