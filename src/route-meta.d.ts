import type { PageCategory } from '@/prototype-gallery'

export {}

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    description?: string
    category?: PageCategory
    order?: number
    hidden?: boolean
    spotlight?: boolean
    hidePrimary?: boolean
    hideSecondary?: boolean
  }
}
