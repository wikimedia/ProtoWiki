<template>
  <div class="policy-body">
    <ul class="policy-list">
      <li>
        <template v-for="part in messageParts('createAccount.policyPrivacy')" :key="String(part)">
          <b v-if="part === 1">{{ t('createAccount.policyPrivacyRisks') }}</b>
          <template v-else>{{ part }}</template>
        </template>
      </li>
      <li>{{ t('createAccount.policyNoOffensive') }}</li>
      <li>{{ t('createAccount.policyIndividual') }}</li>
    </ul>
    <a
      :href="usernamePolicyUrl"
      target="_blank"
      rel="noopener"
      class="policy-full-link"
    >{{ t('createAccount.policyFullLink') }}</a>
  </div>
</template>

<script setup lang="ts">
/**
 * The policy copy itself — shared by the two shells `UsernamePolicy` picks
 * between (Minerva bottom sheet, Vector popover) so the wording can't drift
 * between skins.
 */
import { messageParts, t } from '@/i18n'

import { capabilityPageUrl, wikiCapabilities } from '../../../musical-group/data/wikiCapabilities'

/** The content wiki's own policy page (`?lang=`). */
const usernamePolicyUrl = capabilityPageUrl(wikiCapabilities().usernamePolicyPage)
</script>

<style scoped>
/*
 * Sets the popover's width, since `CdxPopover` sizes to its content (up to the
 * Codex 512px cap, which floating-ui writes inline — a stylesheet rule on the
 * popover itself can't reach it). Keeps the popover from outrunning the 448px
 * form it explains. On the phone sheet the column is narrower, so it's inert.
 */
.policy-body {
  max-width: 400px;
}

.policy-list {
  margin: 0;
  padding-left: var(--spacing-200);
  line-height: var(--line-height-medium);
  color: var(--color-base);
}

.policy-list li {
  margin-bottom: var(--spacing-25);
}

.policy-list li:last-child {
  margin-bottom: 0;
}

.policy-full-link {
  display: block;
  margin-top: var(--spacing-100);
  color: var(--color-progressive);
}
</style>
