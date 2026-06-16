<script setup lang="ts">
import { ref } from 'vue'
import { CdxButton, CdxField, CdxTextInput } from '@wikimedia/codex'

import ChromeWrapper from '@/components/chrome/ChromeWrapper.vue'

import type { FlowState } from '../data/useFlowState'

const props = defineProps<{ flow: FlowState }>()

const username = ref(props.flow.username.value)
const password = ref('')
const confirmPassword = ref('')
const email = ref(props.flow.email.value)

function createAccount(): void {
  props.flow.goTo('welcome', {
    username: username.value || 'NewEditor',
    email: email.value,
  })
}
</script>

<template>
  <ChromeWrapper skin="mobile" :last-edited-notice="false">
    <form class="account" @submit.prevent="createAccount">
      <h1 class="account__title">Create account</h1>

      <CdxField class="account__field">
        <template #label>Username</template>
        <template #description>
          <span class="account__hint-strong">Choose carefully</span>
          — it's how the community will know you.
        </template>
        <CdxTextInput v-model="username" placeholder="Enter your username" />
      </CdxField>

      <CdxField class="account__field">
        <template #label>Password</template>
        <CdxTextInput v-model="password" input-type="password" placeholder="Enter a password" />
      </CdxField>

      <CdxField class="account__field">
        <template #label>Confirm password</template>
        <CdxTextInput
          v-model="confirmPassword"
          input-type="password"
          placeholder="Enter password again"
        />
      </CdxField>

      <CdxField class="account__field">
        <template #label>Email address</template>
        <CdxTextInput v-model="email" input-type="email" placeholder="Enter your email address" />
      </CdxField>

      <CdxButton class="account__submit" action="progressive" weight="primary" type="submit">
        Create your account
      </CdxButton>

      <p class="account__legal">
        This site is protected by hCaptcha and its
        <a href="#" @click.prevent>Privacy Policy</a> and
        <a href="#" @click.prevent>Terms of Service</a> apply.
      </p>
    </form>
  </ChromeWrapper>
</template>

<style scoped>
.account {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-150, 24px);
  padding: var(--spacing-100, 16px);
  padding-bottom: var(--spacing-200, 32px);
}

.account__title {
  margin: 0;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-xx-large, 1.5rem);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xxx-large, 1.375);
  color: var(--color-base);
}

.account__field {
  margin: 0;
}

.account__field :deep(.cdx-text-input__input) {
  min-height: 2rem;
}

.account__hint-strong {
  font-size: var(--font-size-small, 0.875rem);
  font-weight: var(--font-weight-bold);
  color: var(--color-progressive, #36c);
}

.account__field :deep(.cdx-field__description) {
  font-size: var(--font-size-medium, 1rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.account__submit {
  width: 100%;
  min-height: 2.75rem;
}

.account__legal {
  margin: 0;
  font-size: var(--font-size-small, 0.875rem);
  line-height: var(--line-height-small, 1.375);
  color: var(--color-subtle, #54595d);
}

.account__legal a {
  font-size: var(--font-size-x-small, 0.75rem);
  color: var(--color-subtle, #54595d);
  text-decoration: underline;
}
</style>
