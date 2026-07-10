import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  applySpotlightFilter,
  buildGallerySections,
  isTopLevelPrototypePath,
  parseGalleryEntry,
} from '@/prototype-gallery'

export function usePrototypeGallery() {
  const router = useRouter()
  const route = useRoute()

  const sections = computed(() => {
    const visibleEntries = router
      .getRoutes()
      .filter((r) => r.path !== '/' && r.path !== '/:catchAll(.*)')
      .filter((r) => isTopLevelPrototypePath(r.path))
      .filter((r) => r.meta.hidden !== true)
      .map((r) => parseGalleryEntry(r.meta, r.path))

    const { entries, spotlightActive } = applySpotlightFilter(visibleEntries)

    return buildGallerySections(
      entries,
      {
        hidePrimary: route.meta.hidePrimary === true,
        hideSecondary: route.meta.hideSecondary === true,
      },
      spotlightActive,
    )
  })

  const primaryEntries = computed(() => sections.value.primary)
  const secondaryEntries = computed(() => sections.value.secondary)
  const showDivider = computed(() => sections.value.showDivider)
  const spotlightActive = computed(() => sections.value.spotlightActive)

  return {
    primaryEntries,
    secondaryEntries,
    showDivider,
    spotlightActive,
  }
}
