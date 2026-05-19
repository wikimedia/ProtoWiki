import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'

import App from './App.vue'

import '@wikimedia/codex/dist/codex.style.css'
import './styles/global.css'
import './styles/wiki-content/vector-2022.css'
import './styles/wiki-content/minerva.css'
import './styles/wiki-content/mobile-wiki-overrides.css'
import './styles/dark.css'

import {
  githubPagesSubpathAfterBase,
  restoreGithubPagesSpaUrl,
} from './lib/githubPagesSpaRedirect'
import { initTheming } from './lib/theming'

restoreGithubPagesSpaUrl()
initTheming()

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const subPath = githubPagesSubpathAfterBase(import.meta.env.BASE_URL)
if (subPath) {
  void router.replace(subPath)
}

if (import.meta.hot) {
  handleHotUpdate(router)
}

createApp(App).use(router).mount('#app')
