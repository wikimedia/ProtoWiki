<script setup lang="ts">
import { computed, nextTick } from 'vue'

import ChromeHeader from '@/components/chrome/ChromeHeader.vue'
import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'
import SpecialPageWrapper from '@/components/SpecialPageWrapper.vue'
import { useKeyboardInset } from '@/composables/useKeyboardInset'
import { t } from '@/i18n'
import { globalSkin } from '@/theme'

import WikitaLitePrototypeMenuPopover from '../../components/WikitaLitePrototypeMenuPopover.vue'
import { useWikitaLiteChromeHeaderRight } from '../../composables/useWikitaLiteChromeHeaderRight'
import { useWikitaLiteSaveFeedback } from '../../composables/useWikitaLiteSaveFeedback'
import { useWikitaLiteUrlState } from '../../composables/useWikitaLiteUrlState'
import CreateAccountForm from '../components/CreateAccountForm.vue'
import type { FlowState } from '../data/useWikitaLiteOnboardingFlow'
import { useReturnHomeBanner } from '../data/useReturnHomeBanner'

const props = defineProps<{ flow: FlowState }>()

const { reset: resetReturnHomeBanner } = useReturnHomeBanner()
const { addReadingListTitle } = useWikitaLiteSaveFeedback()
const { state } = useWikitaLiteUrlState()

useKeyboardInset()
const { headerRight } = useWikitaLiteChromeHeaderRight({ hideUserMenu: true })

/*
 * Minerva renders the screen as its own page (own `h1`, full-bleed form);
 * Vector renders it the way the real wiki renders `Special:CreateAccount` —
 * a special page with a title rule, the form in a narrow column beneath it.
 */
const isDesktop = computed(() => globalSkin.value === 'desktop')

async function onSubmit({ username, email }: { username: string; email: string }): Promise<void> {
  resetReturnHomeBanner()
  window.scrollTo(0, 0)
  await props.flow.goTo('welcome', {
    username: username || 'NewEditor',
    email,
    title: props.flow.title.value,
  })
  await nextTick()
  const pendingTitle = state.value.saved[0]
  if (pendingTitle) {
    addReadingListTitle(pendingTitle)
  }
}
</script>

<template>
  <ChromeWrapper
    :last-edited-notice="false"
    :show-footer="false"
    :brand-link="false"
  >
    <template #header>
      <ChromeHeader :right="headerRight" :brand-link="false">
        <template #menu>
          <WikitaLitePrototypeMenuPopover />
        </template>
      </ChromeHeader>
    </template>
    <SpecialPageWrapper v-if="isDesktop" class="account__page" :title="t('createAccount.title')">
      <div class="account__column">
        <CreateAccountForm @submit="onSubmit" />
      </div>
    </SpecialPageWrapper>

    <div v-else class="account">
      <h1 class="account__title">{{ t('createAccount.title') }}</h1>
      <CreateAccountForm @submit="onSubmit" />
    </div>
  </ChromeWrapper>
</template>

<style scoped>
.account {
  padding: var(--spacing-100, 16px);
  padding-bottom: var(--spacing-200, 32px);
}

.account__title {
  margin: 0 0 var(--spacing-150, 24px) 0;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xxx-large, 1.375);
  color: var(--color-base);
}

/*
 * `SpecialPageWrapper` clamps at ~1596px (FakeMediaWiki's `SpecialView`), which
 * leaves the title rule running the full width of a wide window with a narrow
 * form under it. Sit in the same 984px content column `ArticleWrapper` uses —
 * the wrapper's padding is `spacing-150` and its box is border-box, so the
 * padding goes inside the clamp.
 */
.account__page {
  max-width: calc(984px + 2 * var(--spacing-150, 24px));
}

/* Form column — a form field is unreadable at content-column width. */
.account__column {
  max-width: 448px;
  padding-top: var(--spacing-150, 24px);
  padding-bottom: var(--spacing-200, 32px);
}

/*
 * The username suggestions scroll full-bleed on a phone (`100vw` + negative
 * margin). Inside a 448px column that would spill across the page, so it
 * scrolls within the column instead.
 */
.account__column :deep(.username-chips-container) {
  width: 100%;
  margin-left: 0;
  padding-inline: 0;
}

.account :deep(.cdx-checkbox__icon::before),
.account :deep(.cdx-radio__icon::before),
.account__column :deep(.cdx-checkbox__icon::before),
.account__column :deep(.cdx-radio__icon::before) {
  box-sizing: content-box;
}

.account :deep(.cdx-message__content),
.account__column :deep(.cdx-message__content) {
  font-weight: var(--font-weight-normal);
}
</style>
