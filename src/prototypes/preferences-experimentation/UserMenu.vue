<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { CdxButton, CdxIcon, CdxPopover } from '@wikimedia/codex'
import {
  cdxIconImage,
  cdxIconLabFlask,
  cdxIconLanguage,
  cdxIconLogOut,
  cdxIconSandbox,
  cdxIconSettings,
  cdxIconUserAvatar,
  cdxIconUserContributions,
  cdxIconUserTalk,
} from '@wikimedia/codex-icons'

import { EXPERIMENTATION_PREFERENCES, EXPERIMENTATION_USERNAME } from './routes'

const WIKI = 'https://en.wikipedia.org/wiki'

const open = ref(false)
const anchor = ref<HTMLElement | null>(null)

const items = [
  {
    id: 'talk',
    label: 'Talk',
    icon: cdxIconUserTalk,
    href: `${WIKI}/User_talk:${EXPERIMENTATION_USERNAME}`,
  },
  {
    id: 'sandbox',
    label: 'Sandbox',
    icon: cdxIconSandbox,
    href: `${WIKI}/User:${EXPERIMENTATION_USERNAME}/sandbox`,
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: cdxIconSettings,
    to: EXPERIMENTATION_PREFERENCES,
  },
  {
    id: 'beta',
    label: 'Beta',
    icon: cdxIconLabFlask,
    to: { path: EXPERIMENTATION_PREFERENCES, hash: '#mw-prefsection-betafeatures' },
  },
  {
    id: 'contributions',
    label: 'Contributions',
    icon: cdxIconUserContributions,
    href: `${WIKI}/Special:Contributions/${EXPERIMENTATION_USERNAME}`,
  },
  {
    id: 'translations',
    label: 'Translations',
    icon: cdxIconLanguage,
    href: `${WIKI}/Special:ContentTranslation`,
  },
  {
    id: 'uploads',
    label: 'Uploaded media',
    icon: cdxIconImage,
    href: `${WIKI}/Special:ListFiles/${EXPERIMENTATION_USERNAME}`,
  },
  {
    id: 'logout',
    label: 'Log out',
    icon: cdxIconLogOut,
    href: `${WIKI}/Special:UserLogout`,
  },
] as const

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}
</script>

<template>
  <div class="user-menu">
    <span ref="anchor" class="user-menu__trigger">
      <CdxButton
        weight="quiet"
        aria-label="User menu"
        :aria-expanded="open"
        aria-haspopup="true"
        @click="toggle"
      >
        <CdxIcon :icon="cdxIconUserAvatar" />
      </CdxButton>
    </span>
    <CdxPopover
      v-model:open="open"
      :anchor="anchor"
      placement="bottom-end"
    >
      <nav class="user-menu__panel" aria-label="User menu" @click="close">
        <ul class="user-menu__list">
          <li v-for="item in items" :key="item.id">
            <RouterLink
              v-if="'to' in item"
              class="user-menu__item"
              :to="item.to"
            >
              <CdxIcon
                size="small"
                :icon="item.icon"
                :class="{ 'user-menu__icon--sandbox': item.id === 'sandbox' }"
              />
              <span>{{ item.label }}</span>
            </RouterLink>
            <a
              v-else
              class="user-menu__item"
              :href="item.href"
              rel="noopener noreferrer"
            >
              <CdxIcon
                size="small"
                :icon="item.icon"
                :class="{ 'user-menu__icon--sandbox': item.id === 'sandbox' }"
              />
              <span>{{ item.label }}</span>
            </a>
          </li>
        </ul>
      </nav>
    </CdxPopover>
  </div>
</template>

<style scoped>
.user-menu {
  display: inline-flex;
}

.user-menu__trigger {
  display: inline-flex;
}

.user-menu__list {
  margin: 0;
  padding: var(--spacing-25) 0;
  list-style: none;
  min-width: 13em;
}

.user-menu__item {
  display: flex;
  align-items: center;
  gap: var(--spacing-75);
  padding: var(--spacing-50) var(--spacing-100);
  color: var(--color-progressive);
  text-decoration: none;
}

.user-menu__item:hover {
  background-color: var(--background-color-interactive-subtle);
  text-decoration: none;
}

.user-menu__icon--sandbox {
  color: var(--color-destructive);
}
</style>
