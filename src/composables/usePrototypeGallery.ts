import { computed, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  applySpotlightFilter,
  filterGalleryEntriesByTab,
  isTopLevelPrototypePath,
  parseGalleryEntry,
  type GalleryEntry,
  type GalleryTab,
} from '@/prototype-gallery'

function isEntryAllowedByLayout(
  entry: GalleryEntry,
  hidePrimary: boolean,
  hideSecondary: boolean,
): boolean {
  if (entry.category === 'prototype' && hidePrimary) return false
  if ((entry.category === 'template' || entry.category === 'example') && hideSecondary) {
    return false
  }
  return true
}

export function usePrototypeGallery(galleryTab: Ref<GalleryTab>) {
  const router = useRouter()
  const route = useRoute()

  const galleryState = computed(() => {
    const visibleEntries = router
      .getRoutes()
      .filter((r) => r.path !== '/' && r.path !== '/:catchAll(.*)')
      .filter((r) => isTopLevelPrototypePath(r.path))
      .filter((r) => r.meta.hidden !== true)
      .map((r) => parseGalleryEntry(r.meta, r.path))

    return applySpotlightFilter(visibleEntries)
  })

  const filteredEntries = computed(() => {
    const hidePrimary = route.meta.hidePrimary === true
    const hideSecondary = route.meta.hideSecondary === true

    return filterGalleryEntriesByTab(galleryState.value.entries, galleryTab.value).filter(
      (entry) => isEntryAllowedByLayout(entry, hidePrimary, hideSecondary),
    )
  })

  const primaryEntries = computed(() =>
    filteredEntries.value.filter((entry) => entry.category === 'prototype'),
  )

  const templateEntries = computed(() =>
    filteredEntries.value.filter((entry) => entry.category === 'template'),
  )

  const exampleEntries = computed(() =>
    filteredEntries.value.filter((entry) => entry.category === 'example'),
  )

  const spotlightActive = computed(() => galleryState.value.spotlightActive)

  return {
    primaryEntries,
    templateEntries,
    exampleEntries,
    spotlightActive,
  }
}
