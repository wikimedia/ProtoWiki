<template>
  <p class="hcaptcha-disclaimer">
    <template v-for="part in messageParts('createAccount.hcaptcha')" :key="String(part)">
      <a v-if="part === 1" href="https://www.hcaptcha.com/privacy" target="_blank" rel="noopener">{{
        t('createAccount.hcaptchaPrivacy')
      }}</a>
      <a v-else-if="part === 2" href="https://www.hcaptcha.com/terms" target="_blank" rel="noopener">{{
        t('createAccount.hcaptchaTerms')
      }}</a>
      <template v-else>{{ part }}</template>
    </template>
  </p>
</template>

<script setup lang="ts">
import { messageParts, t } from '@/i18n'
</script>

<style scoped>
.hcaptcha-disclaimer {
  font-size: var(--font-size-small);
  color: var(--color-subtle);
  line-height: var(--line-height-x-small);
  margin: 0;
}

.hcaptcha-disclaimer a {
  color: var(--color-subtle);
  text-decoration: var(--text-decoration-underline);
}
</style>
