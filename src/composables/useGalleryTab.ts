import { onMounted, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useConfig } from '@/composables/useConfig'
import type { GalleryTab } from '@/prototype-gallery'

function tabFromQuery(platform: unknown): GalleryTab | null {
  if (platform === 'app') return 'app'
  if (platform === 'web') return 'web'
  return null
}

/**
 * Active gallery tab — each value is a filtered view over the full entry list.
 * Synced to `?platform=` (web / app); omitted query means All.
 */
export function useGalleryTab(): { galleryTab: Ref<GalleryTab> } {
  const route = useRoute()
  const router = useRouter()
  const { device } = useConfig()
  const galleryTab = ref<GalleryTab>('all')

  function applyQueryToTab(): void {
    const fromQuery = tabFromQuery(route.query.platform)
    if (fromQuery !== null && galleryTab.value !== fromQuery) {
      galleryTab.value = fromQuery
    }
  }

  function syncTabToQuery(): void {
    const query = { ...route.query }
    delete query.platform
    delete query.category

    if (galleryTab.value === 'app') {
      query.platform = 'app'
    }

    const platformUnchanged =
      route.query.platform === query.platform ||
      (!route.query.platform && !query.platform)
    const hadCategory = route.query.category !== undefined

    if (platformUnchanged && !hadCategory) return

    router.replace({ query })
  }

  onMounted(() => {
    applyQueryToTab()
    syncTabToQuery()
  })

  watch(() => route.query.platform, applyQueryToTab)
  watch(galleryTab, (tab) => {
    if (tab === 'web' || tab === 'app') {
      device.value = tab
    }
    syncTabToQuery()
  })

  return { galleryTab }
}
