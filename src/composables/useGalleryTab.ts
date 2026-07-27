import { onMounted, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import type { GalleryTab } from '@/prototype-gallery'

function tabFromQuery(category: unknown): GalleryTab {
  if (category === 'prototype') return 'prototype'
  if (category === 'template') return 'template'
  if (category === 'example') return 'example'
  return 'home'
}

/**
 * Active gallery tab — Home shows all sections; other tabs filter by category.
 * Synced to `?category=` (prototype / template / example); omitted query means Home.
 */
export function useGalleryTab(): { galleryTab: Ref<GalleryTab> } {
  const route = useRoute()
  const router = useRouter()
  const galleryTab = ref<GalleryTab>('home')

  function applyQueryToTab(): void {
    const fromQuery = tabFromQuery(route.query.category)
    if (galleryTab.value !== fromQuery) {
      galleryTab.value = fromQuery
    }
  }

  function syncTabToQuery(): void {
    const query = { ...route.query }
    delete query.category
    delete query.platform

    if (galleryTab.value !== 'home') {
      query.category = galleryTab.value
    }

    const categoryUnchanged =
      route.query.category === query.category ||
      (!route.query.category && !query.category)
    const hadPlatform = route.query.platform !== undefined

    if (categoryUnchanged && !hadPlatform) return

    router.replace({ query })
  }

  onMounted(() => {
    applyQueryToTab()
    syncTabToQuery()
  })

  watch(() => route.query.category, applyQueryToTab)
  watch(galleryTab, () => {
    syncTabToQuery()
  })

  return { galleryTab }
}
