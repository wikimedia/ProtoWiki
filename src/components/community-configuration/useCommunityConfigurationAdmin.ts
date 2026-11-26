import { ref } from 'vue'

/**
 * Whether the reader is an administrator: only administrators can save
 * Community Configuration forms. Not on wiki — a prototype control, toggled
 * from the editor page's "…" menu. Shared by every editor page, so it holds
 * while the reader moves between features.
 */
const isAdmin = ref(true)

export function useCommunityConfigurationAdmin() {
  return { isAdmin }
}
