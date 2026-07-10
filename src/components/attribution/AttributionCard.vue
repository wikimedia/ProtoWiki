<script setup lang="ts">
import { computed } from 'vue'

import { CdxButton, CdxIcon, CdxProgressBar } from '@wikimedia/codex'
import { cdxIconClock, cdxIconLinkExternal, cdxIconReferenceExisting, cdxIconUserAvatar } from '@wikimedia/codex-icons'

import {
  brandMarkLogo,
  canonicalArticleDisplayUrl,
  formatRelativeUpdate,
  isTrending,
  searchContributorLabel,
  searchPageViewsLabel,
  searchReferenceLabel,
  sourceLabel,
} from './formatAttribution'
import { resolveEcosystemCta } from './resolveEcosystemCta'
import type {
  AttributionCardVariant,
  AttributionEcosystemCta,
  AttributionLicenseDisplay,
  AttributionSignals,
  AttributionSourceDisplay,
  AttributionTitleDisplay,
  AttributionTrendingMode,
} from './types'

interface Props {
  signals?: AttributionSignals | null
  variant?: AttributionCardVariant
  loading?: boolean
  error?: string | null
  sourceDisplay?: AttributionSourceDisplay
  titleDisplay?: AttributionTitleDisplay
  licenseDisplay?: AttributionLicenseDisplay
  showCredit?: boolean
  showReferenceCount?: boolean
  showContributorCount?: boolean
  showPageViews?: boolean
  showTrending?: boolean
  showLastUpdate?: boolean
  showSourceLink?: boolean
  ecosystemCta?: AttributionEcosystemCta
  trendingMode?: AttributionTrendingMode
  /** Search scenario: lead extract shown below the title. */
  snippet?: string
  /** Search scenario: thumbnail from page summary REST API. */
  thumbnailUrl?: string | null
  showThumbnail?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  signals: null,
  variant: 'inline',
  loading: false,
  error: null,
  sourceDisplay: 'name-and-mark',
  titleDisplay: 'linked-title',
  licenseDisplay: 'text-only',
  showCredit: false,
  showReferenceCount: true,
  showContributorCount: true,
  showPageViews: true,
  showTrending: true,
  showLastUpdate: false,
  showSourceLink: false,
  ecosystemCta: 'none',
  trendingMode: 'api',
  snippet: '',
  thumbnailUrl: null,
  showThumbnail: true,
})

const logo = computed(() => (props.signals ? brandMarkLogo(props.signals) : null))
const sourceName = computed(() => (props.signals ? sourceLabel(props.signals) : 'Wikipedia'))
const trust = computed(() => props.signals?.trust_and_relevance)

const showLogo = computed(
  () =>
    props.sourceDisplay === 'name-and-mark' || props.sourceDisplay === 'mark-only',
)
const showSourceName = computed(
  () =>
    props.sourceDisplay === 'name-and-mark' || props.sourceDisplay === 'name-only',
)

const apiTrending = computed(() => (props.signals ? isTrending(props.signals) : false))
const trendingActive = computed(() => {
  if (!props.showTrending) return false
  if (props.trendingMode === 'most-read') return true
  if (props.trendingMode === 'not-trending') return false
  return apiTrending.value
})

const referenceLine = computed(() => {
  if (!props.showReferenceCount) return null
  const count = trust.value?.reference_count
  if (typeof count !== 'number') return null
  return `${count} reference${count === 1 ? '' : 's'}`
})

const searchReferenceLine = computed(() => {
  if (!props.showReferenceCount) return null
  const count = trust.value?.reference_count
  if (typeof count !== 'number') return null
  return searchReferenceLabel(count)
})

const contributorLine = computed(() => {
  if (!props.showContributorCount) return null
  const count = trust.value?.contributor_counts
  if (typeof count !== 'number') return null
  return searchContributorLabel(count)
})

const pageViewsLine = computed(() => {
  if (!props.showPageViews) return null
  const count = trust.value?.page_views
  if (typeof count !== 'number') return null
  return searchPageViewsLabel(count)
})

const lastUpdatedLine = computed(() => {
  if (!props.showLastUpdate) return null
  const iso = trust.value?.last_updated
  if (!iso) return null
  return formatRelativeUpdate(iso)
})

const selectedCta = computed(() => resolveEcosystemCta(props.signals, props.ecosystemCta))

const trustItems = computed(() => {
  const items: string[] = []
  if (referenceLine.value) items.push(referenceLine.value)
  if (contributorLine.value) items.push(contributorLine.value)
  if (pageViewsLine.value) items.push(pageViewsLine.value)
  if (lastUpdatedLine.value) items.push(lastUpdatedLine.value)
  return items
})

const showCreditLine = computed(
  () => props.showCredit && Boolean(props.signals?.essential.credit),
)

const showSearchThumbnail = computed(
  () => props.showThumbnail && Boolean(props.thumbnailUrl),
)

const showSearchSubtitle = computed(
  () =>
    trendingActive.value ||
    Boolean(contributorLine.value) ||
    Boolean(pageViewsLine.value),
)

const showSearchLicenseFooter = computed(
  () => props.licenseDisplay !== 'hidden' && props.signals,
)

const showSearchFooter = computed(
  () =>
    showSearchLicenseFooter.value ||
    showCreditLine.value ||
    Boolean(searchReferenceLine.value) ||
    Boolean(lastUpdatedLine.value) ||
    Boolean(selectedCta.value),
)

const useLetterBrandMark = computed(
  () => props.signals?.essential.source_wiki?.project_family === 'wikipedia',
)

const showSearchBrandMark = computed(
  () => showLogo.value && (useLetterBrandMark.value || Boolean(logo.value)),
)

const showSearchSourceLink = computed(
  () => props.showSourceLink && Boolean(props.signals?.essential.link),
)

const sourceLinkLabel = computed(() =>
  props.signals ? canonicalArticleDisplayUrl(props.signals) : '',
)

const showSearchSourceRow = computed(
  () => showSearchBrandMark.value || showSourceName.value || showSearchSourceLink.value,
)
</script>

<template>
  <div
    class="attribution-card"
    :class="[`attribution-card--${props.variant}`, { 'attribution-card--loading': props.loading }]"
  >
    <CdxProgressBar
      v-if="props.loading"
      inline
      class="attribution-card__loading-bar"
      aria-label="Loading attribution"
    />

    <p v-else-if="props.error" class="attribution-card__error" role="alert">
      {{ props.error }}
    </p>

    <template v-else-if="props.signals">
      <!-- Search result card (Figma SearchResult) -->
      <div v-if="props.variant === 'inline'" class="attribution-card__search">
        <div class="attribution-card__search-header">
          <div v-if="showSearchSourceRow" class="attribution-card__source-row">
            <div v-if="showSearchBrandMark" class="attribution-card__brand-mark">
              <span v-if="useLetterBrandMark" class="attribution-card__brand-letter" aria-hidden="true">W</span>
              <img
                v-else-if="logo"
                :src="logo.url"
                :alt="sourceName"
                width="24"
                height="24"
              />
            </div>
            <div v-if="showSourceName || showSearchSourceLink" class="attribution-card__source-meta">
              <small v-if="showSourceName" class="attribution-card__source-name">{{ sourceName }}</small>
              <a
                v-if="showSearchSourceLink"
                class="attribution-card__source-link"
                :href="props.signals.essential.link"
                target="_blank"
                rel="noopener"
              >
                {{ sourceLinkLabel }}
              </a>
            </div>
          </div>

          <h4 v-if="props.titleDisplay === 'linked-title'" class="attribution-card__search-title">
            <a
              class="attribution-card__title-link"
              :href="props.signals.essential.link"
              target="_blank"
              rel="noopener"
            >
              {{ props.signals.essential.title }}
            </a>
          </h4>
          <h4 v-else-if="props.titleDisplay === 'title-only'" class="attribution-card__search-title">
            {{ props.signals.essential.title }}
          </h4>
          <h4 v-else-if="props.titleDisplay === 'link-only'" class="attribution-card__search-title">
            <a
              class="attribution-card__title-link"
              :href="props.signals.essential.link"
              target="_blank"
              rel="noopener"
            >
              {{ sourceName }}
            </a>
          </h4>
        </div>

        <div v-if="showSearchSubtitle" class="attribution-card__subtitle">
          <span v-if="trendingActive" class="attribution-card__trend-chip">Most read</span>
          <small v-if="contributorLine" class="attribution-card__subtitle-stat">{{ contributorLine }}</small>
          <small v-if="pageViewsLine" class="attribution-card__subtitle-stat">{{ pageViewsLine }}</small>
        </div>

        <div v-if="props.snippet || showSearchThumbnail" class="attribution-card__snippet-row">
          <p v-if="props.snippet" class="attribution-card__snippet">{{ props.snippet }}</p>
          <img
            v-if="showSearchThumbnail"
            class="attribution-card__thumbnail"
            :src="props.thumbnailUrl!"
            :alt="''"
          />
        </div>

        <div v-if="showSearchFooter" class="attribution-card__footer">
          <p v-if="showSearchLicenseFooter" class="attribution-card__footer-license">
            <small>
              {{ sourceName }} content under
              <a
                v-if="props.licenseDisplay === 'linked-text'"
                class="attribution-card__footer-link"
                :href="props.signals.essential.license.url"
                target="_blank"
                rel="noopener"
              >
                {{ props.signals.essential.license.title }}
              </a>
              <template v-else>{{ props.signals.essential.license.title }}</template>
              ·
              <a
                class="attribution-card__footer-link"
                :href="props.signals.essential.link"
                target="_blank"
                rel="noopener"
              >
                List of authors at source
              </a>
            </small>
          </p>
          <small v-if="showCreditLine" class="attribution-card__footer-stat">
            Credit: {{ props.signals.essential.credit }}
          </small>
          <small v-if="searchReferenceLine" class="attribution-card__footer-stat">
            {{ searchReferenceLine }}
          </small>
          <small v-if="lastUpdatedLine" class="attribution-card__footer-stat">{{ lastUpdatedLine }}</small>
          <a
            v-if="selectedCta"
            class="attribution-card__footer-cta"
            :href="selectedCta.url"
            target="_blank"
            rel="noopener"
          >
            {{ selectedCta.link_text }}
          </a>
        </div>
      </div>

      <div v-else-if="props.variant === 'compact'" class="attribution-card__compact">
        <div class="attribution-card__compact-header">
          <img
            v-if="showLogo && logo"
            class="attribution-card__logo"
            :src="logo.url"
            :alt="sourceName"
            width="24"
            height="24"
          />
          <div class="attribution-card__compact-title">
            <span v-if="showSourceName" class="attribution-card__source">{{ sourceName }}</span>
            <a
              v-if="props.titleDisplay === 'linked-title'"
              class="attribution-card__link"
              :href="props.signals.essential.link"
              target="_blank"
              rel="noopener"
            >
              {{ props.signals.essential.title }}
              <CdxIcon :icon="cdxIconLinkExternal" size="small" />
            </a>
            <span v-else-if="props.titleDisplay === 'title-only'" class="attribution-card__title-plain">
              {{ props.signals.essential.title }}
            </span>
            <a
              v-else-if="props.titleDisplay === 'link-only'"
              class="attribution-card__link"
              :href="props.signals.essential.link"
              target="_blank"
              rel="noopener"
            >
              {{ sourceName }}
              <CdxIcon :icon="cdxIconLinkExternal" size="small" />
            </a>
          </div>
        </div>

        <ul v-if="trustItems.length || trendingActive" class="attribution-card__trust-list">
          <li v-if="referenceLine">
            <CdxIcon :icon="cdxIconReferenceExisting" size="small" />
            {{ referenceLine }}
          </li>
          <li v-if="contributorLine">
            <CdxIcon :icon="cdxIconUserAvatar" size="small" />
            {{ contributorLine }}
          </li>
          <li v-if="pageViewsLine">{{ pageViewsLine }}</li>
          <li v-if="lastUpdatedLine">
            <CdxIcon :icon="cdxIconClock" size="small" />
            {{ lastUpdatedLine }}
          </li>
          <li v-if="trendingActive" class="attribution-card__badge">Most read</li>
        </ul>

        <p v-if="showCreditLine" class="attribution-card__credit">
          Credit: {{ props.signals.essential.credit }}
        </p>

        <p v-if="props.licenseDisplay !== 'hidden'" class="attribution-card__license">
          <a
            v-if="props.licenseDisplay === 'linked-text'"
            :href="props.signals.essential.license.url"
            target="_blank"
            rel="noopener"
          >
            {{ props.signals.essential.license.title }}
          </a>
          <template v-else>{{ props.signals.essential.license.title }}</template>
        </p>

        <div v-if="selectedCta" class="attribution-card__cta-row">
          <CdxButton weight="quiet" tag="a" :href="selectedCta.url" target="_blank" rel="noopener">
            {{ selectedCta.link_text }}
          </CdxButton>
        </div>
      </div>

      <div v-else class="attribution-card__full">
        <div class="attribution-card__full-header">
          <img
            v-if="showLogo && logo"
            class="attribution-card__logo attribution-card__logo--full"
            :src="logo.url"
            :alt="sourceName"
            width="32"
            height="32"
          />
          <div>
            <p v-if="showSourceName" class="attribution-card__source">{{ sourceName }}</p>
            <a
              v-if="props.titleDisplay === 'linked-title'"
              class="attribution-card__link attribution-card__link--full"
              :href="props.signals.essential.link"
              target="_blank"
              rel="noopener"
            >
              {{ props.signals.essential.title }}
            </a>
            <p v-else-if="props.titleDisplay === 'title-only'" class="attribution-card__title-plain">
              {{ props.signals.essential.title }}
            </p>
            <a
              v-else-if="props.titleDisplay === 'link-only'"
              class="attribution-card__link attribution-card__link--full"
              :href="props.signals.essential.link"
              target="_blank"
              rel="noopener"
            >
              {{ sourceName }}
            </a>
          </div>
        </div>

        <ul v-if="trustItems.length || trendingActive" class="attribution-card__trust-chips">
          <li v-if="referenceLine">{{ referenceLine }}</li>
          <li v-if="contributorLine">{{ contributorLine }}</li>
          <li v-if="pageViewsLine">{{ pageViewsLine }}</li>
          <li v-if="trendingActive">Most read</li>
          <li v-if="lastUpdatedLine">{{ lastUpdatedLine }}</li>
        </ul>

        <p v-if="showCreditLine" class="attribution-card__credit">
          {{ props.signals.essential.credit }}
        </p>

        <p v-if="props.licenseDisplay !== 'hidden'" class="attribution-card__license">
          Content from
          <a :href="props.signals.essential.link" target="_blank" rel="noopener">{{ sourceName }}</a
          >, via
          <a
            v-if="props.licenseDisplay === 'linked-text'"
            :href="props.signals.essential.license.url"
            target="_blank"
            rel="noopener"
          >
            {{ props.signals.essential.license.title }}
          </a>
          <template v-else>{{ props.signals.essential.license.title }}</template>.
        </p>

        <div v-if="selectedCta" class="attribution-card__cta-row attribution-card__cta-row--full">
          <CdxButton weight="quiet" tag="a" :href="selectedCta.url" target="_blank" rel="noopener">
            {{ selectedCta.link_text }}
          </CdxButton>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.attribution-card {
  font-family: var(--font-family-sans);
  font-size: var(--font-size-medium);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.attribution-card__loading-bar {
  width: 100%;
}

.attribution-card__error {
  margin: 0;
  color: var(--color-error);
}

/* Search result (inline) — Figma SearchResult */
.attribution-card--inline {
  border: var(--border-subtle);
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
}

.attribution-card--inline.attribution-card--loading {
  border: none;
  background: transparent;
}

.attribution-card__search {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-100);
}

.attribution-card__search-header {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.attribution-card__source-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-50);
}

.attribution-card__source-meta {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-width: 0;
}

.attribution-card__source-name,
.attribution-card__source-link {
  font-size: var(--font-size-x-small);
  line-height: 1.2;
}

.attribution-card__source-name {
  margin: 0;
  color: var(--color-base);
}

.attribution-card__source-link {
  margin: 0;
  color: var(--color-progressive);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attribution-card__source-link:hover {
  text-decoration: underline;
}

.attribution-card__search-title {
  margin: 0;
  margin-top: var(--spacing-50);
}

.attribution-card__brand-mark {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 32px;
  height: 32px;
  padding: var(--spacing-25);
  border: var(--border-width-base) solid var(--border-color-subtle);
  border-radius: var(--spacing-25);
}

.attribution-card__brand-mark img {
  display: block;
  width: 24px;
  height: 24px;
}

.attribution-card__brand-letter {
  font-family: var(--font-family-serif);
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-normal);
  line-height: 1;
  color: var(--color-base);
}


.attribution-card__source-link:hover {
  margin: 0;
}

.attribution-card__title-link {
  color: var(--color-progressive);
  text-decoration: none;
}

.attribution-card__title-link:hover {
  text-decoration: underline;
}

.attribution-card__subtitle {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--spacing-50);
}

.attribution-card__trend-chip {
  display: inline-flex;
  align-items: center;
  padding: 0 var(--spacing-35);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
}

.attribution-card__subtitle-stat {
  color: var(--color-subtle);
}

.attribution-card__snippet-row {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-100);
}

.attribution-card__snippet {
  flex: 1;
  min-width: 0;
  margin: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}

.attribution-card__thumbnail {
  flex-shrink: 0;
  box-sizing: border-box;
  width: 65px;
  height: 65px;
  border-radius: var(--spacing-25);
  object-fit: cover;
}

@media (max-width: 639px) {
  .attribution-card__thumbnail {
    width: 52px;
    height: 52px;
  }
}

.attribution-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  row-gap: var(--spacing-50);
  column-gap: var(--spacing-75);
}

.attribution-card__footer-license {
  margin: 0;
  width: 100%;
}

.attribution-card__footer-link {
  color: var(--color-progressive);
  text-decoration: none;
}

.attribution-card__footer-link:hover {
  text-decoration: underline;
}

.attribution-card__footer-stat {
  color: var(--color-subtle);
}

.attribution-card__footer-cta {
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  line-height: var(--line-height-small);
  color: var(--color-progressive);
  text-decoration: none;
}

.attribution-card__footer-cta:hover {
  text-decoration: underline;
}

/* Compact variant */
.attribution-card__logo {
  flex-shrink: 0;
}

.attribution-card__link {
  color: var(--color-progressive);
  text-decoration: none;
}

.attribution-card__link:hover {
  text-decoration: underline;
}

.attribution-card__link--full {
  font-size: var(--font-size-large);
  font-weight: var(--font-weight-bold);
}

.attribution-card__title-plain {
  font-weight: var(--font-weight-medium);
}

.attribution-card__badge {
  display: inline-block;
  padding: 0 var(--spacing-25);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral);
  color: var(--color-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
}

.attribution-card__compact {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-75);
  border: var(--border-base);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral-subtle);
}

.attribution-card__compact-header {
  display: flex;
  gap: var(--spacing-50);
  align-items: flex-start;
}

.attribution-card__compact-title {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
}

.attribution-card__source {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-subtle);
}

.attribution-card__trust-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-25);
  font-size: var(--font-size-small);
  color: var(--color-subtle);
}

.attribution-card__trust-list li {
  display: flex;
  align-items: center;
  gap: var(--spacing-25);
}

.attribution-card__full {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-50);
  padding: var(--spacing-100);
  border: var(--border-base);
  border-radius: var(--border-radius-base);
  background: var(--background-color-neutral-subtle);
}

.attribution-card__full-header {
  display: flex;
  gap: var(--spacing-75);
  align-items: center;
}

.attribution-card__trust-chips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-25);
}

.attribution-card__trust-chips li {
  padding: var(--spacing-25) var(--spacing-50);
  border-radius: var(--border-radius-base);
  background: var(--background-color-base);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-normal);
  color: var(--color-subtle);
}

.attribution-card__credit,
.attribution-card__license {
  margin: 0;
  font-size: var(--font-size-small);
  color: var(--color-subtle);
}

.attribution-card__license a {
  color: var(--color-progressive);
}

.attribution-card__cta-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-50);
}

.attribution-card__cta-row--full {
  padding-top: var(--spacing-25);
  border-top: var(--border-subtle);
}
</style>
