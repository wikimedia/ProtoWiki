import type { Icon } from '@wikimedia/codex-icons'

import type { PrototypePlatform } from '@/config'
import type { PageCategory } from '@/prototype-gallery'

export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    description?: string
    category?: PageCategory
    platform?: PrototypePlatform
    order?: number
    hidden?: boolean
    spotlight?: boolean
    hidePrimary?: boolean
    hideSecondary?: boolean
    icon?: Icon
    /** Public path under `public/` (e.g. `images/wikitab-favicon.svg`). */
    favicon?: string
  }
}
