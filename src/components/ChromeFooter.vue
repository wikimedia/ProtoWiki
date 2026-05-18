<script setup lang="ts">
import { computed } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import {
  cdxIconArrowNext,
  cdxIconHistory,
  cdxIconLogoMediaWiki,
  cdxIconLogoWikimedia,
} from '@wikimedia/codex-icons'

import { globalSkin, globalTheme } from '@/lib/theming'
import type { Skin, Theme } from '@/lib/theming'

/** EN mobile wordmark — matches ChromeHeader mobile logo slot default. */
const WIKIPEDIA_WORDMARK_EN =
  'https://en.wikipedia.org/static/images/mobile/copyright/wikipedia-wordmark-en-25.svg'

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
  username: 'Username',
})

const effectiveSkin = computed<Skin>(() => props.skin ?? globalSkin.value)
const effectiveTheme = computed<Theme>(() => props.theme ?? globalTheme.value)
const isDesktop = computed(() => effectiveSkin.value === 'desktop')
const showLastEditedMobile = computed(() => props.lastEditedNotice && !isDesktop.value)
const lastEditedByLabel = computed(() => props.username.trim() || 'Username')

const links = [
  {
    href: 'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy',
    label: 'Privacy policy',
  },
  { href: 'https://en.wikipedia.org/wiki/Wikipedia:About', label: 'About Wikipedia' },
  {
    href: 'https://en.wikipedia.org/wiki/Wikipedia:General_disclaimer',
    label: 'Disclaimers',
  },
  {
    href: 'https://en.wikipedia.org/wiki/Wikipedia:Contact_us',
    label: 'Contact Wikipedia',
  },
  {
    href: 'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Legal:Wikimedia_Foundation_Legal_and_Safety_Contact_Information',
    label: 'Legal & safety contacts',
  },
  {
    href: 'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Universal_Code_of_Conduct',
    label: 'Code of Conduct',
  },
  { href: 'https://developer.wikimedia.org/', label: 'Developers' },
  {
    href: 'https://stats.wikimedia.org/#/en.wikipedia.org',
    label: 'Statistics',
  },
  {
    href: 'https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Cookie_statement',
    label: 'Cookie statement',
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
    label: 'Terms of Use',
  },
  { href: '#', label: 'Desktop view' },
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
              This page was last edited on 8 May 2026, at 04:34.
            </p>
            <p class="chrome-footer__license-desktop">
              Text is available under the
              <a
                href="https://creativecommons.org/licenses/by-sa/4.0/"
                rel="noopener noreferrer"
                title="Creative Commons Attribution-ShareAlike 4.0"
              >
                Creative Commons Attribution-ShareAlike 4.0 License
              </a>; additional terms may apply. By using this site, you agree to the
              <a
                href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Terms_of_Use"
                rel="noopener noreferrer"
                >Terms of Use</a>
              and the
              <a
                href="https://foundation.wikimedia.org/wiki/Special:MyLanguage/Policy:Privacy_policy"
                rel="noopener noreferrer"
                >Privacy Policy</a>. Wikimedia Foundation, Inc. is a non-profit organization.
            </p>
          </template>

          <p class="chrome-footer__credit">This is a prototype made with ProtoWiki.</p>

          <ul class="chrome-footer__links">
            <li v-for="link in links" :key="link.href">
              <a :href="link.href" rel="noopener">{{ link.label }}</a>
            </li>
            <li><a href="#">Mobile view</a></li>
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
            Last edited 1 month ago by <strong>{{ lastEditedByLabel }}</strong>
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
                :src="WIKIPEDIA_WORDMARK_EN"
                width="120"
                height="18"
                alt="Wikipedia"
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

          <p class="chrome-footer__license-short">This is a prototype made with ProtoWiki.</p>

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
  margin-right: var(--spacing-50, 8px);
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
  padding: var(--spacing-100, 16px) var(--spacing-100, 16px) 0;
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
  margin-right: 0;
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
