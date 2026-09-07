import { computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  DEFAULT_WIKITA_LITE_VIEW,
  parseWikitaLiteView,
  viewForPath,
  WIKITA_LITE_HOME,
  type WikitaLiteView,
} from '../routes'

export function useWikitaLiteView() {
  const route = useRoute()
  const router = useRouter()

  const isHome = computed(
    () => route.path === WIKITA_LITE_HOME || route.path === `${WIKITA_LITE_HOME}/`,
  )

  const activeView = computed<WikitaLiteView>(() => {
    if (isHome.value) {
      return parseWikitaLiteView(route.query.view)
    }
    return viewForPath(route.path)
  })

  function scrollToTop() {
    window.scrollTo(0, 0)
  }

  const isHomeFeed = computed(
    () => isHome.value && activeView.value === DEFAULT_WIKITA_LITE_VIEW,
  )

  async function selectView(view: WikitaLiteView) {
    if (isHome.value && activeView.value === view) {
      scrollToTop()
      return
    }

    const destination =
      view === DEFAULT_WIKITA_LITE_VIEW
        ? { path: WIKITA_LITE_HOME }
        : { path: WIKITA_LITE_HOME, query: { view } }

    await router.push(destination)

    await nextTick()
    scrollToTop()
  }

  async function goHome() {
    if (isHomeFeed.value) {
      scrollToTop()
      return
    }

    await router.push({ path: WIKITA_LITE_HOME })

    await nextTick()
    scrollToTop()
  }

  return {
    activeView,
    isHome,
    isHomeFeed,
    selectView,
    goHome,
    scrollToTop,
  }
}
