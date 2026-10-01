<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import {
  cdxIconArrowNext,
  cdxIconHistory,
  cdxIconLogoMediaWiki,
  cdxIconLogoWikimedia,
} from '@wikimedia/codex-icons'

import { messageParts, t } from '@/i18n'
import { globalSkin, globalTheme } from '@/theme'
import type { Skin, Theme } from '@/theme'
import { wikipediaLogoStyle, wikipediaWordmarkSrc } from './wikipediaWordmark'

/** Mobile wordmark in the UI language — matches MinervaChromeHeader default wordmark. */
const mobileWordmarkSrc = wikipediaWordmarkSrc()

interface Props {
  /** Local skin override for this subtree. Sets `data-skin` on the root. */
  skin?: Skin
  /** Local theme override for this subtree. Sets `data-theme` on the root. */
  theme?: Theme
  /**
   * Mock article “last edited” notice in the footer: Vector-style lines on **desktop**,
   * Minerva strip on **mobile**. Set **false** on special-page–style shells.
   */
  lastEditedNotice?: boolean
  /** Shown as “Last edited … by **[username]**” in the mobile strip. **`ChromeWrapper`** forwards this. */
  username?: string
}

const props = withDefaults(defineProps<Props>(), {
  skin: undefined,
  theme: undefined,
  lastEditedNotice: true,
  username: undefined,
})

const effectiveSkin = computed<Skin>(() => props.skin ?? globalSkin.value)
const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const isDesktop = computed(() => effectiveSkin.value === 'desktop')
const showLastEditedMobile = computed(() => props.lastEditedNotice && !isDesktop.value)
const lastEditedByLabel = computed(
  () => (props.username ?? '').trim() || t('chrome.footerUsernamePlaceholder'),
)

const links = [
  {
    href: 'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy',
    label: t('chrome.footerPrivacyPolicy'),
  },
  { href: 'https://en.wikipedia.org/wiki/Wikipedia:About', label: t('chrome.footerAbout') },
  {
    href: 'https://en.wikipedia.org/wiki/Wikipedia:General_disclaimer',
    label: t('chrome.footerDisclaimers'),
  },
  {
    href: 'https://en.wikipedia.org/wiki/Wikipedia:Contact_us',
    label: t('chrome.footerContact'),
  },
  {
    href: 'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Legal:Wikimedia_Foundation_Legal_and_Safety_Contact_Information',
    label: t('chrome.footerLegalContacts'),
  },
  {
    href: 'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Universal_Code_of_Conduct',
    label: t('chrome.footerCodeOfConduct'),
  },
  { href: 'https://developer.wikimedia.org/', label: t('chrome.footerDevelopers') },
  {
    href: 'https://stats.wikimedia.org/#/en.wikipedia.org',
    label: t('chrome.footerStatistics'),
  },
  {
    href: 'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Cookie_statement',
    label: t('chrome.footerCookieStatement'),
  },
]

/** Minerva-style footer link order + copy (middot row). */
const mobileFooterLinks = [
  links[0],
  links[3],
  links[4],
  links[5],
  links[6],
  links[7],
  links[8],
  {
    href: 'https://foundation.m.wikimedia.org/wiki/Special:MyLanguage/Policy:Terms_of_Use',
    label: t('chrome.footerTermsOfUse'),
  },
  { href: '#', label: t('chrome.footerDesktopView') },
]
</script>

<template>
  <footer
    class="chrome-footer"
    :class="{ 'chrome-footer--no-last-edited-notice': !isDesktop && !showLastEditedMobile }"
    :data-skin="effectiveSkin"
    :data-theme="effectiveTheme"
  >
    <slot>
      <!-- Desktop / tablet (Vector): centred column + prototype note -->
      <template v-if="isDesktop">
        <div class="chrome-footer__inner">
          <template v-if="props.lastEditedNotice">
            <p class="chrome-footer__last-edited-desktop">
              {{ t('chrome.footerLastEditedDesktop') }}
            </p>
            <p class="chrome-footer__license-desktop">
              <template
                v-for="(part, index) in messageParts('chrome.footerLicense')"
                :key="index"
              >
                <a
                  v-if="part === 1"
                  href="https://creativecommons.org/licenses/by-sa/4.0/"
                  rel="noopener noreferrer"
                  :title="t('chrome.footerLicenseTitle')"
                  >{{ t('chrome.footerLicenseName') }}</a
                >
                <a
                  v-else-if="part === 2"
                  href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Terms_of_Use"
                  rel="noopener noreferrer"
                  >{{ t('chrome.footerLicenseTermsOfUse') }}</a
                >
                <a
                  v-else-if="part === 3"
                  href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy"
                  rel="noopener noreferrer"
                  >{{ t('chrome.footerLicensePrivacyPolicy') }}</a
                >
                <template v-else>{{ part }}</template>
              </template>
            </p>
          </template>

          <p class="chrome-footer__credit">{{ t('chrome.footerPrototypeCredit') }}</p>

          <ul class="chrome-footer__links">
            <li v-for="link in links" :key="link.href">
              <a :href="link.href" rel="noopener">{{ link.label }}</a>
            </li>
            <li>
              <a href="#">{{ t('chrome.footerMobileView') }}</a>
            </li>
          </ul>
        </div>
      </template>

      <!-- Mobile (Minerva-style): last-edited strip + grey well + brand row + short license -->
      <template v-else>
        <a
          v-if="showLastEditedMobile"
          class="chrome-footer__last-edited"
          href="https://en.wikipedia.org/w/index.php?title=Special:RecentChangesLinked"
        >
          <CdxIcon class="chrome-footer__last-edited-icon" :icon="cdxIconHistory" size="small" />
          <span class="chrome-footer__last-edited-text">
            <template
              v-for="(part, index) in messageParts('chrome.footerLastEditedMobile')"
              :key="index"
            >
              <strong v-if="part === 1">{{ lastEditedByLabel }}</strong>
              <template v-else>{{ part }}</template>
            </template>
          </span>
          <CdxIcon
            class="chrome-footer__last-edited-chevron"
            :icon="cdxIconArrowNext"
            size="small"
          />
        </a>

        <div class="chrome-footer__mobile-body">
          <div class="chrome-footer__brand-row">
            <div class="chrome-footer__brand-lockup">
              <img
                class="chrome-footer__mobile-wordmark"
                :src="mobileWordmarkSrc"
                width="120"
                height="18"
                :style="wikipediaLogoStyle('wordmark', 18)"
                :alt="t('chrome.wordmarkAlt')"
              />
            </div>
            <div class="chrome-footer__badge-cluster">
              <a
                class="chrome-footer__badge-btn"
                href="https://wikimediafoundation.org/"
                aria-label="Wikimedia Foundation"
              >
                <CdxIcon :icon="cdxIconLogoWikimedia" />
              </a>
              <a
                class="chrome-footer__badge-btn"
                href="https://www.mediawiki.org/"
                aria-label="MediaWiki"
              >
                <CdxIcon :icon="cdxIconLogoMediaWiki" />
              </a>
            </div>
          </div>

          <div class="chrome-footer__inset-rule" aria-hidden="true" />

          <p class="chrome-footer__license-short">{{ t('chrome.footerPrototypeCredit') }}</p>

          <ul class="chrome-footer__links chrome-footer__links--mobile">
            <li v-for="link in mobileFooterLinks" :key="`${link.href}-${link.label}`">
              <a :href="link.href" rel="noopener">{{ link.label }}</a>
            </li>
          </ul>
        </div>
      </template>
    </slot>
  </footer>
</template>

<style scoped>
/*
 * Desktop: Vector reader strip — white surface, inset top rule on `.chrome-footer__inner`.
 * Mobile: Minerva-style stacked strip + grey well (history mock + badges + short license).
 */
.chrome-footer {
  margin-top: var(--spacing-200, 32px);
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
  font-size: var(--font-size-x-small);
  line-height: var(--line-height-x-small);
}

.chrome-footer[data-skin='desktop'] {
  margin-left: var(--spacing-100);
  margin-right: var(--spacing-100);
}

.chrome-footer[data-skin='desktop'] .chrome-footer__inner {
  border-top: 1px solid var(--border-color-subtle, #c8ccd1);
}

.chrome-footer__inner {
  max-width: 99.75rem;
  margin: 0 auto;
  padding: var(--spacing-150, 24px) 0;
}

.chrome-footer__credit {
  margin: 0 0 var(--spacing-100, 16px);
  line-height: var(--line-height-x-small);
}

.chrome-footer__credit a {
  color: var(--color-progressive, #36c);
}

.chrome-footer__credit a:hover {
  text-decoration: underline;
}

.chrome-footer__links {
  margin: 0;
  padding: 0;
  list-style: none;
  /* Footer chrome uses compact type — match tokens here, not global semantic `li` margins */
  line-height: var(--line-height-x-small);
}

.chrome-footer__links li {
  display: inline-block;
  margin-block: 0;
  margin-inline-end: var(--spacing-50, 8px);
}

.chrome-footer__links a {
  color: var(--color-progressive, #36c);
  line-height: inherit;
}

.chrome-footer__links li::after {
  content: '\2022';
  padding-inline-start: var(--spacing-50, 8px);
  color: var(--color-subtle, #54595d);
}

.chrome-footer__links li:last-child::after {
  content: none;
}

/* ---------- Mobile (Minerva-style) ---------- */

.chrome-footer[data-skin='mobile'] {
  margin-top: 0;
  border-top: none;
}

.chrome-footer--no-last-edited-notice .chrome-footer__mobile-body {
  border-top: 1px solid var(--border-color-muted, #dadde3);
}

.chrome-footer__last-edited-desktop {
  margin: 0 0 var(--spacing-50, 8px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base, #202122);
}

.chrome-footer__license-desktop {
  margin: 0 0 var(--spacing-100, 16px);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  color: var(--color-base, #202122);
}

.chrome-footer__license-desktop a {
  color: var(--color-progressive, #36c);
}

.chrome-footer__last-edited {
  display: flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-50, 8px) var(--spacing-100, 16px);
  border-block: 1px solid var(--border-color-muted, #dadde3);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
  color: var(--color-subtle, #54595d);
  font-size: var(--font-size-small);
  line-height: var(--line-height-small);
  text-decoration: none;
}

.chrome-footer__last-edited:hover {
  background-color: var(--background-color-neutral, #eaecf0);
}

.chrome-footer__last-edited-icon {
  flex-shrink: 0;
  color: var(--color-subtle, #54595d);
}

.chrome-footer__last-edited-text {
  flex: 1 1 auto;
  min-width: 0;
}

.chrome-footer__last-edited-text strong {
  font-weight: var(--font-weight-bold);
  color: var(--color-base, #202122);
}

.chrome-footer__last-edited-chevron {
  flex-shrink: 0;
  color: var(--color-subtle, #54595d);
}

.chrome-footer__mobile-body {
  padding: var(--spacing-100, 16px);
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.chrome-footer__brand-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-75, 12px);
}

.chrome-footer__brand-lockup {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50, 8px);
  min-width: 0;
}

.chrome-footer__mobile-wordmark {
  display: block;
  height: 18px;
  width: auto;
  max-width: 100%;
  opacity: 0.85;
}

.chrome-footer__badge-cluster {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--spacing-50, 8px);
}

.chrome-footer__badge-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: var(--size-icon-large, 44px);
  height: var(--size-icon-large, 44px);
  border: 1px solid var(--border-color-muted, #dadde3);
  border-radius: var(--border-radius-base, 2px);
  background-color: var(--background-color-base, #fff);
  color: var(--color-base, #202122);
  text-decoration: none;
}

.chrome-footer__badge-btn:hover {
  background-color: var(--background-color-neutral-subtle, #f8f9fa);
}

.chrome-footer__badge-btn :deep(.cdx-icon) {
  width: var(--size-icon-medium, 32px);
  height: var(--size-icon-medium, 32px);
}

.chrome-footer__inset-rule {
  height: 1px;
  margin: var(--spacing-100, 16px) 0;
  background-color: var(--border-color-muted, #dadde3);
}

.chrome-footer__license-short {
  margin: 0 0 var(--spacing-75, 12px);
  color: var(--color-base, #202122);
  line-height: var(--line-height-x-small);
}

.chrome-footer__links--mobile li {
  margin-inline-end: 0;
}

.chrome-footer__links--mobile li::after {
  content: '\00b7';
  padding-inline: var(--spacing-25, 4px);
  color: var(--color-subtle, #54595d);
}

.chrome-footer__links--mobile li:last-child::after {
  content: none;
}
</style>
