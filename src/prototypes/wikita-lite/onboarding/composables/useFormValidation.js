import { reactive } from 'vue'
import { t } from '@/i18n'
import { useFormSettings } from './useFormSettings'

const MIN_PASSWORD_LENGTH = 8

const baselineValidators = {
  username: (value) => {
    if (!value.trim()) {
      return { status: 'error', message: t('createAccount.errorUsernameEmpty') }
    }
    return null
  },
  password: (value, form, behaviors = {}) => {
    if (!value) {
      return { status: 'error', message: t('createAccount.errorPasswordEmpty') }
    }
    if (behaviors.enforceLength !== false && value.length < MIN_PASSWORD_LENGTH) {
      return {
        status: 'error',
        message: t('createAccount.errorPasswordLength', MIN_PASSWORD_LENGTH),
      }
    }
    return null
  },
  confirmPassword: (value, form, behaviors = {}) => {
    if (!value) {
      return { status: 'error', message: t('createAccount.errorConfirmEmpty') }
    }
    if (behaviors.matchValidation !== false && value !== form.password) {
      return { status: 'error', message: t('createAccount.errorPasswordMismatch') }
    }
    return null
  },
  email: (value, form, behaviors = {}, { emailPasswordInstead } = {}) => {
    if (emailPasswordInstead?.value && !value) {
      return { status: 'error', message: t('createAccount.errorEmailEmpty') }
    }
    if (behaviors.emailValidation !== false && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return { status: 'error', message: t('createAccount.errorEmailInvalid') }
    }
    return null
  },
}

function makeFieldState() {
  return { status: 'default', messages: {} }
}

export function useFormValidation(form, { emailPasswordInstead } = {}) {
  const { settings } = useFormSettings()

  let _takenForValue = ''
  let _takenSuggestion = ''

  const validation = reactive({
    username: makeFieldState(),
    password: makeFieldState(),
    confirmPassword: makeFieldState(),
    email: makeFieldState(),
  })

  function validate(fieldName, { onBlur = false, forSubmit = false, bypassTaken = false } = {}) {
    const value = form[fieldName]
    const fieldSettings = settings.value.fields[fieldName]

    // Skip validation if field is not visible
    if (!fieldSettings || !fieldSettings.visible) {
      validation[fieldName] = makeFieldState()
      return true
    }

    // On blur, skip validation if the field is empty
    if (onBlur && !value) {
      validation[fieldName] = makeFieldState()
      return true
    }

    // Check behavior-based validators first
    if (fieldName === 'username' && fieldSettings.behaviors.taken && !bypassTaken) {
      if (value.trim()) {
        const status = forSubmit ? 'error' : 'warning'
        if (value.trim() !== _takenForValue) {
          _takenForValue = value.trim()
          const digits = String(Math.floor(1000 + Math.random() * 9000))
          _takenSuggestion = `${value.trim()}${digits}`
        }
        validation[fieldName] = {
          status,
          messages: { [status]: t('createAccount.usernameTaken'), takenSuggestion: _takenSuggestion },
        }
        return !forSubmit
      }
    }

    if (fieldName === 'password' && fieldSettings.behaviors.weak) {
      if (value) {
        validation[fieldName] = {
          status: 'warning',
          messages: {
            warning: t('createAccount.warningPasswordWeak'),
          },
        }
        return true // Warning doesn't block submission
      }
    }

    // Fall back to baseline validator
    const baselineValidator = baselineValidators[fieldName]
    if (baselineValidator) {
      const result = baselineValidator(value, form, fieldSettings.behaviors, { emailPasswordInstead })
      if (result) {
        validation[fieldName] = {
          status: result.status,
          messages: { [result.status]: result.message },
        }
        return result.status !== 'error'
      }
    }

    // No issues
    validation[fieldName] = makeFieldState()
    return true
  }

  function validateAll({ bypassTaken = false } = {}) {
    const fields = ['username', 'password', 'confirmPassword', 'email']
    let allValid = true
    for (const field of fields) {
      // Skip password fields when email-a-password is active
      if (emailPasswordInstead?.value && (field === 'password' || field === 'confirmPassword')) {
        validation[field] = makeFieldState()
        continue
      }
      // Only validate visible fields
      if (settings.value.fields[field]?.visible) {
        const opts = { forSubmit: true }
        if (field === 'username') opts.bypassTaken = bypassTaken
        if (!validate(field, opts)) allValid = false
      }
    }
    return allValid
  }

  function resetValidation() {
    for (const key of Object.keys(validation)) {
      validation[key] = makeFieldState()
    }
  }

  return { validation, validate, validateAll, resetValidation }
}
