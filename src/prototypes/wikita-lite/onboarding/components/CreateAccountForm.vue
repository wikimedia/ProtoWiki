<template>
  <form @submit.prevent="onFormSubmit" novalidate autocomplete="off" :class="inputHeightClass">
    <Transition :name="transitionName" mode="out-in">
      <div :key="isMultiStep ? currentField : 'all'" class="step-content">
        <div v-if="isFieldActive('username')" class="username-field-wrapper">
          <CdxField :status="usernameFieldStatus" :messages="{}">
            <template #label>{{ t('createAccount.usernameLabel') }}</template>
            <template #description>
              <template v-if="settings.fields.username.behaviors.learnMoreLink">
                {{ t('createAccount.usernamePublicLearnMore') }}
                <a
                  :href="usernamePolicyUrl"
                  rel="noopener"
                  class="learn-more-link"
                  >{{ t('createAccount.learnMore') }}</a
                >
              </template>
              <template v-else-if="settings.fields.username.behaviors.chooseCarefullyCopy">
                <span class="username-description-row">
                  {{ t('createAccount.avoidRealName') }}
                  <CdxButton
                    ref="policyTriggerRef"
                    weight="quiet"
                    size="small"
                    type="button"
                    :aria-label="t('createAccount.usernamePolicy')"
                    @click="showPolicy = true">
                      <cdx-icon size="small" :icon="cdxIconHelpNotice" />
                  </CdxButton>
                </span>
              </template>
              <template v-else-if="settings.fields.username.behaviors.thingsToKnowCopy">
                <template v-for="part in messageParts('createAccount.thingsToKnow')" :key="String(part)">
                  <a
                    v-if="part === 1"
                    :ref="setPolicyTrigger"
                    href="#"
                    class="public-link"
                    @click.prevent="showPolicy = true"
                    >{{ t('createAccount.thingsToKnowLink') }}</a
                  >
                  <template v-else>{{ part }}</template>
                </template>
              </template>
              <template v-else>
                <template v-for="part in messageParts('createAccount.usernameIsPublic')" :key="String(part)">
                  <a
                    v-if="part === 1"
                    :ref="setPolicyTrigger"
                    href="#"
                    class="public-link"
                    @click.prevent="showPolicy = true"
                    >{{ t('createAccount.usernameIsPublicLink') }}</a
                  >
                  <template v-else>{{ part }}</template>
                </template>
              </template>
            </template>
            <div @click="onUsernameEndIconClick" @keydown="onUsernameEndIconKeydown">
              <CdxTextInput
                ref="usernameInputRef"
                v-bind="noInputAssistanceAttrs"
                v-model="form.username"
                input-type="text"
                dir="auto"
                :placeholder="t('createAccount.usernamePlaceholder')"
                :autofocus="settings.fields.username.behaviors.autoFocus || undefined"
                :end-icon="usernameEndIcon"
                @input="onUsernameInput"
                @blur="onUsernameBlur"
              />
            </div>
            <template
              v-if="settings.fields.username.behaviors.showUsernameHelperText || settings.fields.username.behaviors.showUsernameHelperTextChip || settings.fields.username.behaviors.showUsernameHelperTextChips"
              #help-text
            >
              <template v-if="settings.fields.username.behaviors.validationSwapsHelpText">
                <div class="username-help-swap-container">
                  <Transition name="slide-down">
                    <div :key="swapKey" class="username-help-swap-inner">
                      <template v-if="swapKey === 'checking'">
                        <CdxProgressIndicator :show-label="true">
                          {{ t('createAccount.checkingAvailability') }}
                        </CdxProgressIndicator>
                      </template>
                      <template v-else-if="swapKey === 'result'">
                        <CdxMessage v-if="usernameMessage" :type="usernameMessage.type" :inline="true">
                          {{ usernameMessage.text }}
                          <template v-if="usernameMessage.takenSuggestion">
                            <template v-if="settings.fields.username.behaviors.showUsernameHelperTextChip || settings.fields.username.behaviors.showUsernameHelperTextChips">
                              <template v-for="part in messageParts('createAccount.tryUsername')" :key="String(part)">
                                <CdxInfoChip v-if="part === 1" status="subtle" class="username-suggestion-chip" @mousedown.prevent @click="applySuggestedUsername(usernameMessage.takenSuggestion)"><bdi>{{ usernameMessage.takenSuggestion }}</bdi></CdxInfoChip>
                                <template v-else>{{ part }}</template>
                              </template>
                            </template>
                            <template v-else>
                              <template v-for="part in messageParts('createAccount.tryUsername')" :key="String(part)">
                                <a v-if="part === 1" href="#" class="username-taken-suggestion" @mousedown.prevent @click.prevent="applySuggestedUsername(usernameMessage.takenSuggestion)"><bdi>{{ usernameMessage.takenSuggestion }}</bdi></a>
                                <template v-else>{{ part }}</template>
                              </template>
                            </template>
                          </template>
                        </CdxMessage>
                      </template>
                      <template v-else>
                        <template v-if="settings.fields.username.behaviors.showUsernameHelperTextChips">
                          <div class="username-chips-container">
                            <CdxInfoChip
                              v-if="settings.fields.username.behaviors.showReloadUsername"
                              status="subtle"
                              :icon="cdxIconReload"
                              class="username-reload-chip"
                              :aria-label="t('createAccount.generateUsernames')"
                              @click="reloadUsernames()"
                            />
                            <CdxInfoChip
                              v-for="name in suggestedUsernames"
                              :key="name"
                              status="subtle"
                              class="username-suggestion-chip"
                              @mousedown.prevent
                              @click="applySuggestedUsername(name)"
                            ><bdi>{{ name }}</bdi></CdxInfoChip>
                          </div>
                        </template>
                        <template v-else-if="settings.fields.username.behaviors.showUsernameHelperTextChip">
                          <template v-for="part in messageParts('createAccount.usernameSuggestion')" :key="String(part)">
                            <CdxInfoChip v-if="part === 1" status="subtle" class="username-suggestion-chip" @mousedown.prevent @click="applySuggestedUsername(suggestedUsername)"><bdi>{{ suggestedUsername }}</bdi></CdxInfoChip>
                            <template v-else>{{ part }}</template>
                          </template>
                          <CdxInfoChip
                            v-if="settings.fields.username.behaviors.showReloadUsername"
                            status="subtle"
                            :icon="cdxIconReload"
                            class="username-reload-chip"
                            :aria-label="t('createAccount.generateUsername')"
                            @click="reloadUsername()"
                          />
                        </template>
                        <template v-else>
                          <template v-for="part in messageParts('createAccount.usernameSuggestion')" :key="String(part)">
                            <a v-if="part === 1" href="#" class="username-suggestion" @mousedown.prevent @click.prevent="applySuggestedUsername(suggestedUsername)"><bdi>{{ suggestedUsername }}</bdi></a>
                            <template v-else>{{ part }}</template>
                          </template>
                          <CdxInfoChip
                            v-if="settings.fields.username.behaviors.showReloadUsername"
                            status="subtle"
                            :icon="cdxIconReload"
                            class="username-reload-chip"
                            :aria-label="t('createAccount.generateUsername')"
                            @click="reloadUsername()"
                          />
                        </template>
                      </template>
                    </div>
                  </Transition>
                </div>
              </template>
              <template v-else>
                <template v-if="settings.fields.username.behaviors.showUsernameHelperTextChips">
                  <div class="username-chips-container">
                    <CdxInfoChip
                      v-if="settings.fields.username.behaviors.showReloadUsername"
                      status="subtle"
                      :icon="cdxIconReload"
                      class="username-reload-chip"
                      :aria-label="t('createAccount.generateUsernames')"
                      @click="reloadUsernames()"
                    />
                    <CdxInfoChip
                      v-for="name in suggestedUsernames"
                      :key="name"
                      status="subtle"
                      class="username-suggestion-chip"
                      @mousedown.prevent
                      @click="applySuggestedUsername(name)"
                    ><bdi>{{ name }}</bdi></CdxInfoChip>
                  </div>
                </template>
                <template v-else-if="settings.fields.username.behaviors.showUsernameHelperTextChip">
                  <template v-for="part in messageParts('createAccount.usernameSuggestion')" :key="String(part)">
                    <CdxInfoChip v-if="part === 1" status="subtle" class="username-suggestion-chip" @mousedown.prevent @click="applySuggestedUsername(suggestedUsername)"><bdi>{{ suggestedUsername }}</bdi></CdxInfoChip>
                    <template v-else>{{ part }}</template>
                  </template>
                  <CdxInfoChip
                    v-if="settings.fields.username.behaviors.showReloadUsername"
                    status="subtle"
                    :icon="cdxIconReload"
                    class="username-reload-chip"
                    :aria-label="t('createAccount.generateUsername')"
                    @click="reloadUsername()"
                  />
                </template>
                <template v-else>
                  <template v-for="part in messageParts('createAccount.usernameSuggestion')" :key="String(part)">
                    <a v-if="part === 1" href="#" class="username-suggestion" @mousedown.prevent @click.prevent="applySuggestedUsername(suggestedUsername)"><bdi>{{ suggestedUsername }}</bdi></a>
                    <template v-else>{{ part }}</template>
                  </template>
                  <CdxInfoChip
                    v-if="settings.fields.username.behaviors.showReloadUsername"
                    status="subtle"
                    :icon="cdxIconReload"
                    class="username-reload-chip"
                    :aria-label="t('createAccount.generateUsername')"
                    @click="reloadUsername()"
                  />
                </template>
              </template>
            </template>
          </CdxField>
          <div
            v-if="!settings.fields.username.behaviors.validationSwapsHelpText"
            class="username-validation-area"
            :class="{ active: usernameCheckState === 'checking' || !!usernameMessage }"
          >
            <Transition name="slide-down">
              <div v-show="usernameCheckState === 'checking'" class="username-check-progress">
                <CdxProgressIndicator :show-label="true">
                  {{ t('createAccount.checkingAvailability') }}
                </CdxProgressIndicator>
              </div>
            </Transition>
            <Transition name="slide-down">
              <div v-show="!!usernameMessage" class="username-check-progress">
                <CdxMessage v-if="usernameMessage" :type="usernameMessage.type" :inline="true">
                  {{ usernameMessage.text }}
                  <template v-if="usernameMessage.takenSuggestion">
                    <template v-if="settings.fields.username.behaviors.showUsernameHelperTextChip || settings.fields.username.behaviors.showUsernameHelperTextChips">
                      <template v-for="part in messageParts('createAccount.tryUsername')" :key="String(part)">
                        <CdxInfoChip v-if="part === 1" status="subtle" class="username-suggestion-chip" @mousedown.prevent @click="applySuggestedUsername(usernameMessage.takenSuggestion)"><bdi>{{ usernameMessage.takenSuggestion }}</bdi></CdxInfoChip>
                        <template v-else>{{ part }}</template>
                      </template>
                    </template>
                    <template v-else>
                      <template v-for="part in messageParts('createAccount.tryUsername')" :key="String(part)">
                        <a v-if="part === 1" href="#" class="username-taken-suggestion" @mousedown.prevent @click.prevent="applySuggestedUsername(usernameMessage.takenSuggestion)"><bdi>{{ usernameMessage.takenSuggestion }}</bdi></a>
                        <template v-else>{{ part }}</template>
                      </template>
                    </template>
                  </template>
                </CdxMessage>
              </div>
            </Transition>
          </div>
        </div>

        <div v-if="isFieldActive('password')" class="field-with-validation">
        <CdxField
          :status="emailPasswordInstead ? 'default' : validation.password.status"
          :messages="{}"
        >
          <template #label>{{ t('createAccount.passwordLabel') }}</template>
          <template v-if="!emailPasswordInstead && !settings.fields.password.behaviors.hideHelperText" #help-text>
            {{ t('createAccount.passwordHelp') }}
          </template>
          <CdxCheckbox
            v-if="settings.fields.password.behaviors.emailPassword"
            v-model="emailPasswordInstead"
          >
            {{ t('createAccount.emailPasswordInstead') }}
          </CdxCheckbox>
          <div
            v-if="!emailPasswordInstead"
            :class="{ 'password-visible': passwordVisible }"
            @click="onPasswordToggleClick($event, 'password')"
            @keydown="onPasswordToggleKeydown($event, 'password')"
          >
            <CdxTextInput
              ref="passwordInputRef"
              v-bind="noInputAssistanceAttrs"
              v-model="form.password"
              :input-type="passwordInputType"
              :end-icon="passwordEndIcon"
              :placeholder="t('createAccount.passwordPlaceholder')"
              @blur="validate('password', { onBlur: true })"
            />
          </div>
        </CdxField>
        <div
          class="field-validation-area"
          :class="{ active: !!passwordMessage }"
        >
          <Transition name="slide-down">
            <div v-show="!!passwordMessage" class="username-check-progress">
              <CdxMessage v-if="passwordMessage" :type="passwordMessage.type" :inline="true">
                {{ passwordMessage.text }}
              </CdxMessage>
            </div>
          </Transition>
        </div>
        </div>

        <div v-if="isFieldActive('confirmPassword') && !emailPasswordInstead" class="field-with-validation">
        <CdxField
          :status="validation.confirmPassword.status"
          :messages="{}"
        >
          <template #label>{{ t('createAccount.confirmPasswordLabel') }}</template>
          <div
            :class="{ 'password-visible': confirmPasswordVisible }"
            @click="onPasswordToggleClick($event, 'confirmPassword')"
            @keydown="onPasswordToggleKeydown($event, 'confirmPassword')"
          >
            <CdxTextInput
              ref="confirmPasswordInputRef"
              v-bind="noInputAssistanceAttrs"
              v-model="form.confirmPassword"
              :input-type="confirmPasswordInputType"
              :end-icon="confirmPasswordEndIcon"
              :placeholder="t('createAccount.confirmPasswordPlaceholder')"
              @blur="validate('confirmPassword', { onBlur: true })"
            />
          </div>
        </CdxField>
        <div
          class="field-validation-area"
          :class="{ active: !!confirmPasswordMessage }"
        >
          <Transition name="slide-down">
            <div v-show="!!confirmPasswordMessage" class="username-check-progress">
              <CdxMessage v-if="confirmPasswordMessage" :type="confirmPasswordMessage.type" :inline="true">
                {{ confirmPasswordMessage.text }}
              </CdxMessage>
            </div>
          </Transition>
        </div>
        </div>

        <CdxField
          v-if="isFieldActive('email')"
          :optional="!emailPasswordInstead && !settings.fields.email.behaviors.hideOptionalFlag"
          :status="validation.email.status"
          :messages="validation.email.messages"
        >
          <template #label>{{ t('createAccount.emailLabel') }}</template>
          <template v-if="!emailPasswordInstead && !settings.fields.email.behaviors.hideDescription" #description>
            {{ t('createAccount.emailDescription') }}
          </template>
          <CdxTextInput
            ref="emailInputRef"
            v-bind="noInputAssistanceAttrs"
            v-model="form.email"
            input-type="email"
            dir="auto"
            :placeholder="t('createAccount.emailPlaceholder')"
            @blur="validate('email', { onBlur: true })"
          />
        </CdxField>
      </div>
    </Transition>

    <HCaptchaDisclaimer
      v-if="(!isMultiStep || isLastStep) && settings.hcaptcha.position === 'above'"
    />

    <div
      class="form-actions"
      :class="{
        'hcaptcha-above': (!isMultiStep || isLastStep) && settings.hcaptcha.position === 'above',
      }"
    >
      <template v-if="isMultiStep">
        <div class="step-navigation">
          <CdxButton
            v-if="!isFirstStep"
            weight="quiet"
            size="large"
            type="button"
            @click="handleBack"
          >
            <CdxIcon :icon="cdxIconPrevious" />
          </CdxButton>
          <span v-else />

          <CdxButton
            v-if="!isLastStep"
            action="progressive"
            weight="primary"
            size="large"
            type="button"
            @click="handleContinue"
          >
            {{ t('createAccount.continue') }}
          </CdxButton>
          <CdxButton v-else action="progressive" weight="primary" size="large" type="submit">
            {{ t('createAccount.submit') }}
          </CdxButton>
        </div>
      </template>
      <template v-else>
        <CdxButton action="progressive" weight="primary" size="large">
          {{ t('createAccount.submit') }}
        </CdxButton>
      </template>
    </div>

    <HCaptchaDisclaimer
      v-if="(!isMultiStep || isLastStep) && settings.hcaptcha.position === 'below'"
    />
  </form>

  <UsernamePolicy
    :visible="showPolicy"
    :anchor="policyTriggerRef"
    @close="showPolicy = false"
  />
</template>

<script setup>
import { reactive, ref, computed, watchEffect, watch, nextTick } from 'vue'
import {
  CdxField,
  CdxTextInput,
  CdxButton,
  CdxIcon,
  CdxMessage,
  CdxProgressIndicator,
  CdxCheckbox,
  CdxInfoChip,
} from '@wikimedia/codex'
import { cdxIconEye, cdxIconPrevious, cdxIconReload, cdxIconHelpNotice } from '@wikimedia/codex-icons'
import HCaptchaDisclaimer from './HCaptchaDisclaimer.vue'
import UsernamePolicy from './UsernamePolicy.vue'
import { useFormValidation } from '../composables/useFormValidation'
import { useFormSettings } from '../composables/useFormSettings'
import { generateUsername } from '../utils/generateUsername.js'
import { useMultiStep } from '../composables/useMultiStep'
import { capabilityPageUrl, wikiCapabilities } from '../../../musical-group/data/wikiCapabilities'
import { messageParts, t } from '@/i18n'

/** The content wiki's own policy page (`?lang=`). */
const usernamePolicyUrl = capabilityPageUrl(wikiCapabilities().usernamePolicyPage)

const emit = defineEmits(['submit'])

const noInputAssistanceAttrs = {
  autocomplete: 'off',
  autocorrect: 'off',
  autocapitalize: 'off',
  spellcheck: false,
}

const showPolicy = ref(false)
/*
 * The affordance the policy popover hangs off on desktop. Each copy variant
 * renders its own trigger (help button, or an inline link), but only one of
 * them at a time — so they can share the ref.
 */
const policyTriggerRef = ref(null)
/* The link variants render their trigger inside a `messageParts` loop, where a
   plain string ref would collect an array — set the single element instead. */
function setPolicyTrigger(el) {
  if (el) policyTriggerRef.value = el
}
const { settings } = useFormSettings()

const isTakenOnceMode = computed(() =>
  settings.value.fields.username.behaviors.taken &&
  settings.value.fields.username.behaviors.prefillUsername &&
  settings.value.fields.username.behaviors.showReloadUsername
)

const suggestedUsernames = ref((() => {
  const names = new Set()
  while (names.size < 3) names.add(generateUsername())
  return [...names]
})())
const suggestedUsername = computed(() => suggestedUsernames.value[0])

function reloadUsername() {
  suggestedUsernames.value = [generateUsername(), suggestedUsernames.value[1], suggestedUsernames.value[2]]
}

function reloadUsernames() {
  const names = new Set()
  while (names.size < 3) names.add(generateUsername())
  suggestedUsernames.value = [...names]
}

const showValidationInHelpText = ref(false)
const usernameSuggested = ref(settings.value.fields.username.behaviors.prefillUsername)
const usernameTakenShownOnce = ref(false)

const shouldBypassTaken = computed(() =>
  usernameSuggested.value || (isTakenOnceMode.value && usernameTakenShownOnce.value)
)

const swapKey = computed(() => {
  if (!showValidationInHelpText.value) return 'chips'
  if (usernameCheckState.value === 'checking') return 'checking'
  return 'result'
})

function applySuggestedUsername(name) {
  form.username = name
  applyAutoCapitalize({ force: true })
  clearTimeout(usernameDebounceTimer)
  clearTimeout(usernameShowSpinnerTimer)
  usernameSuggested.value = true
  if (settings.value.fields.username.behaviors.validationSwapsHelpText) {
    showValidationInHelpText.value = true
  }

  // Clear warning and start checking in the same tick — both transitions play concurrently:
  // warning slides out while checking indicator slides in
  validate('username', { bypassTaken: true })
  if (validation.username.status === 'default') {
    usernameCheckState.value = 'checking'
    setTimeout(() => { usernameCheckState.value = 'available' }, 400)
  } else {
    usernameCheckState.value = 'idle'
  }

  nextTick(() => {
    if (settings.value.fields.username.behaviors.advanceFocusOnSuggestion) {
      passwordInputRef.value?.$el?.querySelector('input')?.focus()
    } else {
      usernameInputRef.value?.$el?.querySelector('input')?.focus()
    }
  })
}

const form = reactive({
  username: settings.value.fields.username.behaviors.prefillUsername ? generateUsername() : '',
  password: '',
  confirmPassword: '',
  email: '',
})

const inputHeightClass = computed(() => {
  const size = settings.value.inputHeight.size
  return size !== '32' ? `input-height-${size}` : ''
})

const emailPasswordInstead = ref(false)
const { validation, validate, validateAll } = useFormValidation(form, { emailPasswordInstead })

// Multi-step form
const {
  isMultiStep,
  currentField,
  isFirstStep,
  isLastStep,
  direction,
  goNext,
  goBack,
  reset: resetSteps,
} = useMultiStep(settings, { emailPasswordInstead })

const transitionName = computed(() =>
  direction.value === 'forward' ? 'slide-left' : 'slide-right',
)

function isFieldActive(fieldName) {
  if (!settings.value.fields[fieldName]?.visible) return false
  if (!isMultiStep.value) return true
  return currentField.value === fieldName
}

function applyAutoCapitalize({ force = false } = {}) {
  if (!settings.value.fields.username.behaviors.autoCapitalize) return
  if (!force && form.username.length < 2) return
  let value = form.username
  // Strip leading underscores (remove, don't replace with space)
  value = value.replace(/^_+/, '')
  // Replace underscore followed by a character with NBSP + that character
  value = value.replace(/_(.)/g, ' $1')
  // On blur, strip trailing underscores
  if (force) value = value.replace(/_+$/, '')
  // Capitalize first letter
  value = value.charAt(0).toUpperCase() + value.slice(1)
  if (value !== form.username) form.username = value
}

// Show/hide password toggle state
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)
const passwordInputRef = ref(null)
const confirmPasswordInputRef = ref(null)
const usernameInputRef = ref(null)
const emailInputRef = ref(null)

const passwordInputType = computed(() => (passwordVisible.value ? 'text' : 'password'))
const confirmPasswordInputType = computed(() =>
  confirmPasswordVisible.value ? 'text' : 'password',
)

const passwordEndIcon = computed(() => {
  if (!settings.value.fields.password.behaviors.showToggle) return undefined
  return cdxIconEye
})
const confirmPasswordEndIcon = computed(() => {
  if (!settings.value.fields.confirmPassword.behaviors.showToggle) return undefined
  return cdxIconEye
})

const usernameEndIcon = computed(() => {
  if (
    settings.value.fields.username.behaviors.prefillUsername &&
    settings.value.fields.username.behaviors.showReloadUsername
  ) {
    return cdxIconReload
  }
  return undefined
})

function onPasswordToggleClick(event, field) {
  if (event.target.closest('.cdx-text-input__end-icon')) {
    if (field === 'password') {
      passwordVisible.value = !passwordVisible.value
    } else {
      confirmPasswordVisible.value = !confirmPasswordVisible.value
    }
  }
}

function onPasswordToggleKeydown(event, field) {
  if (
    (event.key === 'Enter' || event.key === ' ') &&
    event.target.closest('.cdx-text-input__end-icon')
  ) {
    event.preventDefault()
    onPasswordToggleClick(event, field)
  }
}

function onUsernameEndIconClick(event) {
  if (event.target.closest('.cdx-text-input__end-icon')) {
    applySuggestedUsername(generateUsername())
  }
}

function onUsernameEndIconKeydown(event) {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('.cdx-text-input__end-icon')) {
    event.preventDefault()
    onUsernameEndIconClick(event)
  }
}

// Set accessibility attributes on the end-icon elements
watchEffect(() => {
  const setA11y = (elRef, isVisible) => {
    if (!elRef.value?.$el) return
    const endIcon = elRef.value.$el.querySelector('.cdx-text-input__end-icon')
    if (endIcon) {
      endIcon.setAttribute('role', 'button')
      endIcon.setAttribute('tabindex', '0')
      endIcon.setAttribute('aria-label', isVisible ? t('createAccount.hidePassword') : t('createAccount.showPassword'))
    }
  }

  nextTick(() => {
    if (settings.value.fields.password.behaviors.showToggle) {
      setA11y(passwordInputRef, passwordVisible.value)
    }
    if (settings.value.fields.confirmPassword.behaviors.showToggle) {
      setA11y(confirmPasswordInputRef, confirmPasswordVisible.value)
    }
    if (
      settings.value.fields.username.behaviors.prefillUsername &&
      settings.value.fields.username.behaviors.showReloadUsername &&
      usernameInputRef.value?.$el
    ) {
      const endIcon = usernameInputRef.value.$el.querySelector('.cdx-text-input__end-icon')
      if (endIcon) {
        endIcon.setAttribute('role', 'button')
        endIcon.setAttribute('tabindex', '0')
        endIcon.setAttribute('aria-label', t('createAccount.generateUsername'))
      }
    }
  })
})

// Username availability check state machine
const usernameCheckState = ref('idle') // 'idle' | 'checking' | 'available'
let usernameDebounceTimer = null
let usernameShowSpinnerTimer = null

const usernameFieldStatus = computed(() => {
  if (usernameCheckState.value === 'available') return 'success'
  if (usernameCheckState.value === 'checking') return 'default'
  return validation.username.status
})

const usernameFieldMessages = computed(() => {
  if (usernameCheckState.value === 'available') return { success: t('createAccount.usernameAvailable') }
  if (usernameCheckState.value === 'checking') return {}
  return validation.username.messages
})

const usernameMessage = computed(() => {
  if (usernameCheckState.value === 'available') return { type: 'success', text: t('createAccount.usernameAvailable') }
  if (validation.username.messages.error) return {
    type: 'error',
    text: validation.username.messages.error,
    takenSuggestion: validation.username.messages.takenSuggestion,
  }
  if (validation.username.messages.warning) return {
    type: 'warning',
    text: validation.username.messages.warning,
    takenSuggestion: validation.username.messages.takenSuggestion,
  }
  return null
})

const passwordMessage = computed(() => {
  if (emailPasswordInstead.value) return null
  const m = validation.password.messages
  if (m.error) return { type: 'error', text: m.error }
  if (m.warning) return { type: 'warning', text: m.warning }
  return null
})

const confirmPasswordMessage = computed(() => {
  const m = validation.confirmPassword.messages
  if (m.error) return { type: 'error', text: m.error }
  if (m.warning) return { type: 'warning', text: m.warning }
  return null
})

function onUsernameInput(event) {
  // Codex/Vue `v-model` doesn't update during IME composition, so on predictive
  // mobile keyboards `form.username` would stay stale until the word is committed
  // (space/punctuation) — the availability check never starts. Read the raw input
  // value so validation runs as the user types.
  if (event?.target) form.username = event.target.value
  applyAutoCapitalize()
  usernameSuggested.value = false

  const validateWhileTyping = settings.value.fields.username.behaviors.validateWhileTyping
  if (!validateWhileTyping) return

  clearTimeout(usernameDebounceTimer)
  clearTimeout(usernameShowSpinnerTimer)

  if (!form.username.trim()) {
    usernameCheckState.value = 'idle'
    validation.username = { status: 'default', messages: {} }
    return
  }

  if (settings.value.fields.username.behaviors.validationSwapsHelpText) {
    showValidationInHelpText.value = true
  }

  validation.username = { status: 'default', messages: {} }

  usernameShowSpinnerTimer = setTimeout(() => {
    usernameCheckState.value = 'checking'
  }, 250)

  usernameDebounceTimer = setTimeout(() => {
    runUsernameValidation({ bypassTaken: shouldBypassTaken.value })
  }, 2000)
}

function onUsernameBlur() {
  clearTimeout(usernameDebounceTimer)
  clearTimeout(usernameShowSpinnerTimer)
  const validateWhileTyping = settings.value.fields.username.behaviors.validateWhileTyping

  if (validateWhileTyping && form.username.trim()) {
    runUsernameValidation({ bypassTaken: shouldBypassTaken.value })
  } else {
    usernameCheckState.value = 'idle'
    validate('username', { onBlur: true })
  }

  applyAutoCapitalize({ force: true })
}

function runUsernameValidation({ bypassTaken = false } = {}) {
  validate('username', { bypassTaken })
  if (validation.username.status === 'warning' && isTakenOnceMode.value) {
    usernameTakenShownOnce.value = true
  }
  if (validation.username.status === 'default') {
    usernameCheckState.value = 'available'
  } else {
    usernameCheckState.value = 'idle'
  }
}

// Reset validation-in-help-text when username field is cleared
watch(() => form.username, (val) => {
  if (!val) showValidationInHelpText.value = false
})

// Clear password fields when "email me a password" is toggled on
watch(emailPasswordInstead, (checked) => {
  if (checked) {
    form.password = ''
    form.confirmPassword = ''
    validation.password = { status: 'default', messages: {} }
    validation.confirmPassword = { status: 'default', messages: {} }
  }
})

// Reset checkbox when admin disables the behavior
watch(
  () => settings.value.fields.password.behaviors.emailPassword,
  (enabled) => {
    if (!enabled) emailPasswordInstead.value = false
  },
)

// Multi-step: focus the current field after navigation
function focusCurrentField() {
  nextTick(() => {
    const field = currentField.value
    const refMap = {
      username: usernameInputRef,
      password: passwordInputRef,
      confirmPassword: confirmPasswordInputRef,
      email: emailInputRef,
    }
    const inputRef = refMap[field]
    inputRef?.value?.$el?.querySelector('input')?.focus()
  })
}

// Multi-step: clear username debounce timers when leaving the username step
function clearUsernameTimers() {
  clearTimeout(usernameDebounceTimer)
  clearTimeout(usernameShowSpinnerTimer)
  usernameCheckState.value = 'idle'
}

function handleContinue() {
  const field = currentField.value
  if (field === 'username') clearUsernameTimers()

  // Skip validation for password step when "email me a password" is checked
  if (field === 'password' && emailPasswordInstead.value) {
    goNext()
    focusCurrentField()
    return
  }

  const bypassTaken = field === 'username' ? shouldBypassTaken.value : false
  if (validate(field, { forSubmit: true, bypassTaken })) {
    goNext()
    focusCurrentField()
  }
}

function handleBack() {
  goBack()
  focusCurrentField()
}

function handleSubmit() {
  usernameCheckState.value = 'idle'

  if (isMultiStep.value) {
    const field = currentField.value
    const bypassTaken = field === 'username' && usernameSuggested.value
    if (!validate(field, { forSubmit: true, bypassTaken })) return
  }

  if (validateAll({ bypassTaken: usernameSuggested.value })) {
    emit('submit', { username: form.username, email: form.email })
    resetSteps()
  }
}

// In multi-step mode, intercept form submit to handle Continue
function onFormSubmit() {
  if (isMultiStep.value && !isLastStep.value) {
    handleContinue()
  } else {
    handleSubmit()
  }
}
</script>

<style scoped>
.cdx-field {
  margin-bottom: var(--spacing-150);
}

.username-field-wrapper {
  position: relative;
  margin-bottom: var(--spacing-150);
  display: flex;
  flex-direction: column;
}

.username-field-wrapper :deep(.cdx-field__help-text){
  line-height: var(--line-height-medium, 1.375rem);
}

.username-field-wrapper .cdx-field {
  margin-bottom: 0;
}

.field-with-validation {
  margin-bottom: var(--spacing-150);
  display: flex;
  flex-direction: column;
}

.field-with-validation .cdx-field {
  margin-bottom: 0;
}

.form-actions {
  margin-bottom: var(--spacing-100);
}

.form-actions.hcaptcha-above {
  margin-bottom: 0;
  margin-top: var(--spacing-100);
}

.form-actions .cdx-button {
  width: var(--size-full);
}

.step-navigation {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.step-navigation .cdx-button {
  width: auto;
}

.public-link {
  font-weight: var(--font-weight-bold);
}

.username-description-row {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-25);
}

.username-check-progress {
  margin-top: var(--spacing-25);
  min-height: var(--line-height-medium);
}

.username-check-progress :deep(.cdx-label__label__text) {
  line-height: var(--line-height-medium);
}

/* Grid stacking: enter and leave elements share the same cell so no position:absolute needed */
/* max-height animates the layout shift so fields below slide smoothly instead of jumping */
.username-validation-area {
  display: grid;
  overflow: hidden;
  max-height: 0;
  transition: max-height 200ms ease-out;
}

.username-validation-area.active {
  max-height: calc(var(--spacing-25) + var(--line-height-medium) * 3);
  /* Reserve the taller "checking" spinner row height (margin-top + spinner row)
     so swapping it for the shorter result message doesn't collapse the area
     and shift the fields below by a few pixels. */
  min-height: calc(var(--spacing-50) + var(--line-height-medium));
}

.username-validation-area > * {
  grid-area: 1 / 1;
}

.field-validation-area {
  display: grid;
  overflow: hidden;
  max-height: 0;
  transition: max-height 200ms ease-out;
}

.field-validation-area.active {
  max-height: calc(var(--spacing-25) + var(--line-height-medium) * 3);
}

.field-validation-area > * {
  grid-area: 1 / 1;
}

/* Slide-down animation */
.slide-down-enter-active {
  transition: opacity 400ms ease-out,
              transform 200ms ease-out;
}
.slide-down-leave-active {
  transition: opacity 100ms ease-out, transform 300ms ease-out;
}
.slide-down-enter-from {
  opacity: 0;
  transform: translateY(-100%);
}
.slide-down-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(100%);
}


.username-taken-suggestion {
  color: var(--color-success);
  text-decoration: var(--text-decoration-underline);
}

/* Make the end icon clickable when used as show/hide password toggle */
.cdx-field :deep(.cdx-text-input__end-icon) {
  cursor: pointer;
}

/* When password is visible, use color-base instead of default color-subtle */
.password-visible :deep(.cdx-text-input__end-icon) {
  color: var(--color-base) !important;
}

:deep(.cdx-field__help-text:empty) {
  display: none;
}

/*
 * The username/email inputs take `dir="auto"` so the typed value sets its own
 * direction. Empty, some engines fall back to LTR rather than the page's
 * direction, which would push an RTL placeholder to the wrong edge — keep the
 * page's direction until there is text to detect.
 */
.step-content:dir(rtl) :deep(.cdx-text-input__input[dir='auto']:placeholder-shown) {
  direction: rtl;
}

.username-suggestion {
  color: var(--color-success);
  /* font-weight: var(--font-weight-bold); */
  text-decoration: var(--text-decoration-underline);
  margin-inline-end: 4px;
}

.username-suggestion-chip {
  cursor: pointer;
  margin-inline-end: 4px;
}

.username-chips-container {
  display: flex;
  /* gap: var(--spacing-50); */
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  width: 100vw;
  margin-inline-start: calc(-1 * var(--spacing-100));
  padding-inline: var(--spacing-100);
}

.username-chips-container::-webkit-scrollbar {
  display: none;
}

.username-help-swap-container {
  display: grid;
  overflow: hidden;
  height: 1.625rem;
}

.username-help-swap-container > * {
  grid-area: 1 / 1;
}

.username-chips-container > .username-reload-chip {
  margin-inline-end: 4px;
}

.input-height-36 :deep(.cdx-text-input__input) {
  min-height: 36px;
}

.input-height-40 :deep(.cdx-text-input__input) {
  min-height: 40px;
}

.username-reload-chip {
  min-height: 24px;
  vertical-align: bottom;
}

.username-reload-chip :deep(.cdx-info-chip__text) {
  display: none;
}

</style>
