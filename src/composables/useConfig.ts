import { computed, readonly, ref, watch, type ComputedRef, type DeepReadonly, type Ref } from 'vue'

import {
  configUserDisplayName,
  configUserPageTitle,
  langForUser,
  loadConfig,
  resetUserPageListField,
  saveConfig,
  type ConfigAppPlatform,
  type Config,
  type ConfigTheme,
  type ConfigWebSkin,
  type ConfigUser,
  type PageListKey,
  type UserPageLists,
} from '@/config'
import { applyAppPlatform } from '@/app-platform'
import { applyThemePreference, applyWebSkinPreference } from '@/theme'

const config = ref<Config>(loadConfig())

watch(
  config,
  (value) => {
    saveConfig(value)
  },
  { deep: true },
)

watch(
  () => config.value.theme,
  (preference) => {
    applyThemePreference(preference)
  },
)

watch(
  () => config.value.webSkin,
  (webSkin) => {
    applyWebSkinPreference(webSkin)
  },
)

watch(
  () => config.value.appPlatform,
  (platform) => {
    applyAppPlatform(platform)
  },
)

export function useConfig(): {
  config: DeepReadonly<Ref<Config>>
  theme: Ref<ConfigTheme>
  appPlatform: Ref<ConfigAppPlatform>
  webSkin: Ref<ConfigWebSkin>
  user: Ref<ConfigUser>
  realUsername: Ref<string>
  lang: Ref<string>
  realLang: ComputedRef<string>
  displayName: ComputedRef<string>
  pageTitle: ComputedRef<string>
  currentUserPageLists: ComputedRef<UserPageLists>
  setCurrentUserPageList: (field: PageListKey, pages: string[]) => void
  resetCurrentUserPageListField: (field: PageListKey) => void
} {
  const theme = computed({
    get: () => config.value.theme,
    set: (value: ConfigTheme) => {
      config.value = { ...config.value, theme: value }
    },
  })

  const appPlatform = computed({
    get: () => config.value.appPlatform,
    set: (value: ConfigAppPlatform) => {
      config.value = { ...config.value, appPlatform: value }
    },
  })

  const webSkin = computed({
    get: () => config.value.webSkin,
    set: (value: ConfigWebSkin) => {
      config.value = { ...config.value, webSkin: value }
    },
  })

  const user = computed({
    get: () => config.value.user,
    set: (value: ConfigUser) => {
      config.value = { ...config.value, user: value }
    },
  })

  const realUsername = computed({
    get: () => config.value.realUsername,
    set: (value: string) => {
      config.value = { ...config.value, realUsername: value }
    },
  })

  const lang = computed({
    get: () => config.value.userPageLists[user.value].lang,
    set: (value: string) => {
      const activeUser = user.value
      config.value = {
        ...config.value,
        userPageLists: {
          ...config.value.userPageLists,
          [activeUser]: {
            ...config.value.userPageLists[activeUser],
            lang: value,
          },
        },
      }
    },
  })

  const realLang = computed(() => langForUser('real', config.value.userPageLists))

  const displayName = computed(() =>
    configUserDisplayName(config.value.user, config.value.realUsername),
  )

  const pageTitle = computed(() =>
    configUserPageTitle(config.value.user, config.value.realUsername),
  )

  const currentUserPageLists = computed(() => config.value.userPageLists[user.value])

  function setCurrentUserPageList(field: PageListKey, pages: string[]) {
    const activeUser = user.value
    config.value = {
      ...config.value,
      userPageLists: {
        ...config.value.userPageLists,
        [activeUser]: {
          ...config.value.userPageLists[activeUser],
          [field]: [...pages],
        },
      },
    }
  }

  function resetCurrentUserPageListField(field: PageListKey) {
    const activeUser = user.value
    config.value = {
      ...config.value,
      userPageLists: {
        ...config.value.userPageLists,
        [activeUser]: resetUserPageListField(
          config.value.userPageLists[activeUser],
          activeUser,
          field,
        ),
      },
    }
  }

  return {
    config: readonly(config),
    theme,
    appPlatform,
    webSkin,
    user,
    realUsername,
    lang,
    realLang,
    displayName,
    pageTitle,
    currentUserPageLists,
    setCurrentUserPageList,
    resetCurrentUserPageListField,
  }
}
