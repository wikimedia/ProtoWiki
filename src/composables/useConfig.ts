import { computed, readonly, ref, watch, type ComputedRef, type DeepReadonly, type Ref } from 'vue'

import {
  configUserDisplayName,
  configUserPageTitle,
  DEFAULT_CONFIG,
  defaultMockEditorEditCountForUser,
  DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER,
  isDefaultMockEditorEditCountByUser,
  isDefaultUserPageLists,
  langForUser,
  prependPageInList,
  resetUserPageLists,
  saveConfig,
  normalizeWikiPageTitleInput,
  togglePageInList,
  type ConfigAppPlatform,
  type Config,
  type ConfigTheme,
  type ConfigWebSkin,
  type ConfigMockEditorEditCount,
  type ConfigUser,
  type PageListKey,
  type UserPageLists,
} from '@/config'
import {
  onAppPlatformSettingChanged,
  onThemeSettingChanged,
  onWebSkinSettingChanged,
  protowikiConfig,
} from '@/appearance'

const config = protowikiConfig

watch(
  () => config.value,
  (value) => {
    saveConfig(value)
  },
  { deep: true },
)

watch(
  () => config.value.theme,
  (preference) => {
    onThemeSettingChanged(preference)
  },
)

watch(
  () => config.value.webSkin,
  (webSkin) => {
    onWebSkinSettingChanged(webSkin)
  },
)

watch(
  () => config.value.appPlatform,
  (platform) => {
    onAppPlatformSettingChanged(platform)
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
  isCurrentUserPageListsModified: ComputedRef<boolean>
  setCurrentUserPageList: (field: PageListKey, pages: string[]) => void
  toggleCurrentUserPageInList: (
    field: PageListKey,
    pageTitle: string,
    options?: { prepend?: boolean },
  ) => void
  prependCurrentUserPageInList: (field: PageListKey, pageTitle: string) => void
  resetCurrentUserPageLists: () => void
  mockEditorEditCount: Ref<ConfigMockEditorEditCount>
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

  const isCurrentUserPageListsModified = computed(() => {
    if (!isDefaultUserPageLists(user.value, currentUserPageLists.value)) return true
    if (user.value === 'real') {
      return config.value.realUsername !== DEFAULT_CONFIG.realUsername
    }
    if (!isDefaultMockEditorEditCountByUser(user.value, config.value.mockEditorEditCountByUser)) {
      return true
    }
    return false
  })

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

  function toggleCurrentUserPageInList(
    field: PageListKey,
    pageTitle: string,
    options: { prepend?: boolean } = {},
  ) {
    if (user.value === 'logged-out') return
    const key = normalizeWikiPageTitleInput(pageTitle)
    if (!key.length) return
    const current = config.value.userPageLists[user.value][field]
    setCurrentUserPageList(field, togglePageInList(current, key, options))
  }

  function prependCurrentUserPageInList(field: PageListKey, pageTitle: string) {
    if (user.value === 'logged-out') return
    const key = normalizeWikiPageTitleInput(pageTitle)
    if (!key.length) return
    const current = config.value.userPageLists[user.value][field]
    setCurrentUserPageList(field, prependPageInList(current, key))
  }

  function resetCurrentUserPageLists() {
    const activeUser = user.value
    const editsDefault = defaultMockEditorEditCountForUser(activeUser)
    config.value = {
      ...config.value,
      realUsername: activeUser === 'real' ? DEFAULT_CONFIG.realUsername : config.value.realUsername,
      userPageLists: {
        ...config.value.userPageLists,
        [activeUser]: resetUserPageLists(activeUser),
      },
      ...(editsDefault
        ? {
            mockEditorEditCountByUser: {
              ...config.value.mockEditorEditCountByUser,
              [activeUser]: DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER[activeUser],
            },
          }
        : {}),
    }
  }

  const mockEditorEditCount = computed({
    get: () => {
      const activeUser = user.value
      if (activeUser === 'new' || activeUser === 'experienced') {
        return config.value.mockEditorEditCountByUser[activeUser]
      }
      return DEFAULT_MOCK_EDITOR_EDIT_COUNT_BY_USER.new
    },
    set: (value: ConfigMockEditorEditCount) => {
      const activeUser = user.value
      if (activeUser !== 'new' && activeUser !== 'experienced') return
      config.value = {
        ...config.value,
        mockEditorEditCountByUser: {
          ...config.value.mockEditorEditCountByUser,
          [activeUser]: value,
        },
      }
    },
  })

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
    isCurrentUserPageListsModified,
    setCurrentUserPageList,
    toggleCurrentUserPageInList,
    prependCurrentUserPageInList,
    resetCurrentUserPageLists,
    mockEditorEditCount,
  }
}
