<script setup lang="ts">
import { computed } from 'vue'
import { CdxButton, CdxIcon } from '@wikimedia/codex'
import { cdxIconClose } from '@wikimedia/codex-icons'

import { messageParts, t } from '@/i18n'

import type { FlowState } from '../data/useWikitaLiteOnboardingFlow'
import { useReturnHomeBanner } from '../data/useReturnHomeBanner'

const props = defineProps<{ flow: FlowState }>()

const { dismissed, dismiss } = useReturnHomeBanner()

// Shows once a home exists (a username was captured during onboarding), and
// persists on the main page / articles until the reader dismisses it — via the
// X or by returning Home through the account menu.
const visible = computed(() => Boolean(props.flow.username.value) && !dismissed.value)
</script>

<template>
  <div v-if="visible" class="return-home-banner">
    <CdxButton
      class="return-home-banner__close"
      weight="quiet"
      :icon-only="true"
      :aria-label="t('onboarding.dismiss')"
      @click="dismiss"
    >
      <CdxIcon :icon="cdxIconClose" />
    </CdxButton>

    <p class="return-home-banner__text">
      <template v-for="part in messageParts('onboarding.returnHome')" :key="String(part)">
        <strong v-if="part === 1">{{ props.flow.username.value }}</strong>
        <template v-else>{{ part }}</template>
      </template>
    </p>

    <svg
      class="return-home-banner__arrow"
      width="64"
      height="54"
      viewBox="0 0 64 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M59.8273 13.657L51.3423 5.17199C51.1565 4.98623 51.0092 4.76571 50.9086 4.52301C50.8081 4.28031 50.7564 4.02018 50.7564 3.75749C50.7564 3.49479 50.8081 3.23466 50.9086 2.99196C51.0092 2.74926 51.1565 2.52874 51.3423 2.34299C51.528 2.15723 51.7486 2.00988 51.9913 1.90935C52.234 1.80882 52.4941 1.75708 52.7568 1.75708C53.0195 1.75708 53.2796 1.80882 53.5223 1.90935C53.765 2.00988 53.9855 2.15723 54.1713 2.34299L62.6563 10.828C63.0314 11.2031 63.2422 11.7119 63.2422 12.2425C63.2422 12.773 63.0314 13.2818 62.6563 13.657C62.2811 14.0321 61.7723 14.2429 61.2418 14.2429C60.7112 14.2429 60.2024 14.0321 59.8273 13.657V13.657Z"
        fill="var(--color-progressive, #36c)"
      />
      <path
        d="M44.1713 13.657L52.6563 5.17199C52.842 4.98623 52.9894 4.76571 53.0899 4.52301C53.1904 4.28031 53.2422 4.02018 53.2422 3.75749C53.2422 3.22694 53.0314 2.71813 52.6563 2.34299C52.2811 1.96784 51.7723 1.75708 51.2418 1.75708C50.7112 1.75708 50.2024 1.96784 49.8273 2.34299L41.3423 10.828C40.9671 11.2031 40.7564 11.7119 40.7564 12.2425C40.7564 12.773 40.9671 13.2818 41.3423 13.657C41.7174 14.0321 42.2262 14.2429 42.7568 14.2429C43.2873 14.2429 43.7961 14.0321 44.1713 13.657V13.657Z"
        fill="var(--color-progressive, #36c)"
      />
      <path
        d="M51.9995 3C53.2665 20.74 47.1935 28.96 38.9295 33.505C24.3655 41.512 2.99949 36 2.99949 36"
        stroke="var(--color-progressive, #36c)"
        stroke-width="4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  </div>
</template>

<style scoped>
.return-home-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-50, 8px);
  box-sizing: border-box;
  width: 100%;
  padding: var(--spacing-75, 12px) var(--spacing-100, 16px) var(--spacing-75, 12px)
    var(--spacing-50, 8px);
  border-bottom: var(--border-width-base, 1px) solid var(--border-color-subtle, #c8ccd1);
  background-color: var(--background-color-base, #fff);
}

.return-home-banner__close.cdx-button.cdx-button--icon-only {
  flex-shrink: 0;
  min-width: var(--min-size-interactive-pointer, 32px);
  min-height: var(--min-size-interactive-pointer, 32px);
  width: var(--min-size-interactive-pointer, 32px);
  height: var(--min-size-interactive-pointer, 32px);
  padding: 0;
}

.return-home-banner__text {
  flex: 1;
  min-width: 0;
  margin: 0;
  padding-top: var(--spacing-25, 4px);
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-medium, 1.625);
  color: var(--color-subtle, #54595d);
}

.return-home-banner__arrow {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: var(--spacing-25, 4px);
}
</style>
