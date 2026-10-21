<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import { CdxIcon } from '@wikimedia/codex'
import {
  cdxIconDie,
  cdxIconLogIn,
  cdxIconMapPin,
  cdxIconNewspaper,
  cdxIconSettings,
  cdxIconUserAvatar,
  type Icon,
} from '@wikimedia/codex-icons'

import { preservedQueryFromLocationQuery } from '@/appearance/url-query'
import { selectRandomArticle } from '@/components/article/shared/selectRandomArticle'
import { useConfig } from '@/composables/useConfig'
import { useWordmarkMainPageLink } from '@/composables/useWordmarkMainPageLink'

const ARTICLE_TEMPLATE_PATH = '/template-article'

import { accountActions } from './accountActions'
import MinervaMainMenuDrawer from './MinervaMainMenuDrawer.vue'

interface MenuRow {
  id: string
  label: string
  icon?: Icon
  to?: RouteLocationRaw
  action?: () => void | Promise<void>
}

interface Props {
  /** When false, in-prototype rows stay inert mocks. */
  prototypingSettings?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  prototypingSettings: true,
})

const route = useRoute()
const router = useRouter()
const { lang, user } = useConfig()
const wordmarkMainPageLink = useWordmarkMainPageLink()
const drawer = ref<InstanceType<typeof MinervaMainMenuDrawer> | null>(null)

const isLoggedOut = computed(() => user.value === 'logged-out')

const FOOTER_LINKS = [
  { id: 'about', label: 'About Wikipedia' },
  { id: 'disclaimers', label: 'Disclaimers' },
]

async function openRandomArticle(): Promise<void> {
  const { title } = await selectRandomArticle({ langs: [lang.value], fresh: true })
  await router.push({
    path: ARTICLE_TEMPLATE_PATH,
    query: { ...preservedQueryFromLocationQuery(route.query), title },
  })
}

const groups = computed((): MenuRow[][] => {
  const navigation: MenuRow[] = [
    {
      id: 'main-page',
      label: 'Main Page',
      icon: cdxIconNewspaper,
      to: props.prototypingSettings ? wordmarkMainPageLink.value : undefined,
    },
    {
      id: 'random',
      label: 'Random',
      icon: cdxIconDie,
      action: props.prototypingSettings ? openRandomArticle : undefined,
    },
    {
      id: 'nearby',
      label: 'Nearby',
      icon: cdxIconMapPin,
    },
  ]
  const result = [navigation]

  if (isLoggedOut.value) {
    const createAccount = accountActions.value?.createAccount
    result.push([
      {
        id: 'create-account',
        label: 'Create account',
        icon: cdxIconUserAvatar,
        ...(createAccount ? { action: createAccount.open } : {}),
      },
      { id: 'log-in', label: 'Log in', icon: cdxIconLogIn },
    ])
  }

  result.push([
    {
      id: 'settings',
      label: 'Settings',
      icon: cdxIconSettings,
    },
  ])
  return result
})

function rowHref(row: MenuRow): string | undefined {
  if (row.to) return router.resolve(row.to).href
  return undefined
}

function close(): void {
  drawer.value?.close()
}

function onRowClick(event: MouseEvent, row: MenuRow): void {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  close()
  if (row.action) void row.action()
  else if (row.to && props.prototypingSettings) void router.push(row.to)
}
</script>

<template>
  <MinervaMainMenuDrawer ref="drawer">
    <ul v-for="(group, index) in groups" :key="index" class="minerva-chrome-main-menu__list">
      <li v-for="row in group" :key="row.id" class="minerva-chrome-main-menu__item">
        <a
          class="minerva-chrome-main-menu__anchor"
          :href="rowHref(row) ?? '#'"
          :role="row.action ? 'button' : undefined"
          @click="onRowClick($event, row)"
        >
          <CdxIcon v-if="row.icon" class="minerva-chrome-main-menu__icon" :icon="row.icon" />
          <span class="minerva-chrome-main-menu__label">{{ row.label }}</span>
        </a>
      </li>
    </ul>

    <div v-if="isLoggedOut" class="minerva-chrome-main-menu__donate">
      <a
        class="minerva-chrome-main-menu__donate-link"
        href="#"
        role="button"
        @click.prevent="close"
      >
        <span class="minerva-chrome-main-menu__donate-text">
          <span class="minerva-chrome-main-menu__donate-title">Donate Now</span>
          <span class="minerva-chrome-main-menu__donate-subtitle">
            If Wikipedia is useful to you, please give today.
          </span>
        </span>
        <picture>
          <source
            srcset="https://en.wikipedia.org/static/images/donate/donate.png"
            media="(prefers-reduced-motion)"
          />
          <img
            class="minerva-chrome-main-menu__donate-gif"
            src="https://en.wikipedia.org/static/images/donate/donate.gif"
            alt=""
            loading="lazy"
          />
        </picture>
      </a>
    </div>

    <ul class="minerva-chrome-main-menu__list minerva-chrome-main-menu__list--hlist">
      <li v-for="link in FOOTER_LINKS" :key="link.id">
        <a
          class="minerva-chrome-main-menu__anchor"
          href="#"
          role="button"
          @click.prevent="close"
        >
          <span class="minerva-chrome-main-menu__label">{{ link.label }}</span>
        </a>
      </li>
    </ul>

    <template v-if="$slots['prototype-footer']" #footer>
      <ul class="minerva-chrome-main-menu__list minerva-chrome-main-menu__prototype">
        <slot name="prototype-footer" />
      </ul>
    </template>
  </MinervaMainMenuDrawer>
</template>

<style scoped>
.minerva-chrome-main-menu__list {
  margin: 0;
  padding: 0 0 22px;
  list-style: none;
}

.minerva-chrome-main-menu__item {
  position: relative;
  margin: -1px 0 0;
  border-top: 1px solid var(--border-color-muted);
  background-color: var(--background-color-base);
}

.minerva-chrome-main-menu__item:first-child {
  margin-top: 0;
  border-top: 0;
}

.minerva-chrome-main-menu__anchor {
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  padding: 0.75em 0.875em;
  border: 0;
  background: none;
  font: inherit;
  text-align: start;
  text-decoration: none;
  cursor: pointer;
}

.minerva-chrome-main-menu__anchor:hover {
  text-decoration: none;
}

@media (hover: hover) and (pointer: fine) {
  .minerva-chrome-main-menu__item .minerva-chrome-main-menu__anchor:hover {
    box-shadow: inset 4px 0 0 0 var(--box-shadow-color-progressive--focus);
  }
}

.minerva-chrome-main-menu__icon {
  flex-shrink: 0;
  color: var(--color-subtle);
}

.minerva-chrome-main-menu__label {
  overflow: hidden;
  color: var(--color-subtle);
  font-size: 0.875rem;
  font-weight: bold;
  line-height: var(--size-icon-medium, 20px);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.minerva-chrome-main-menu__list--hlist {
  display: flex;
  flex-wrap: wrap;
}

.minerva-chrome-main-menu__list--hlist .minerva-chrome-main-menu__anchor {
  padding: 0.7em 12px;
}

.minerva-chrome-main-menu__list--hlist .minerva-chrome-main-menu__label {
  font-weight: normal;
}

.minerva-chrome-main-menu__donate {
  margin-bottom: 22px;
  padding: 0.75em 0.875em;
  background-color: var(--background-color-base);
  font-size: 0.875rem;
  font-weight: bold;
}

.minerva-chrome-main-menu__donate-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-decoration: none;
}

.minerva-chrome-main-menu__donate-text {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  max-width: 200px;
}

.minerva-chrome-main-menu__donate-title {
  margin-bottom: 15px;
  color: var(--color-progressive);
}

.minerva-chrome-main-menu__donate-subtitle {
  color: var(--color-subtle);
  font-weight: normal;
}

.minerva-chrome-main-menu__donate-gif {
  flex-shrink: 0;
  width: 75px;
}

.minerva-chrome-main-menu__prototype {
  flex-shrink: 0;
  padding-bottom: 0;
  border-top: 1px solid var(--border-color-muted);
}

.minerva-chrome-main-menu__prototype :deep(.minerva-chrome-main-menu__item) {
  margin: -1px 0 0;
  border-top: 1px solid var(--border-color-muted);
  background-color: var(--background-color-base);
}

.minerva-chrome-main-menu__prototype :deep(.minerva-chrome-main-menu__anchor--destructive .minerva-chrome-main-menu__icon),
.minerva-chrome-main-menu__prototype :deep(.minerva-chrome-main-menu__anchor--destructive .minerva-chrome-main-menu__label) {
  color: var(--color-destructive);
}
</style>
