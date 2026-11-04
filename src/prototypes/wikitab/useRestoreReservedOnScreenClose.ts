import { ref, watch, type Ref } from 'vue'

/**
 * When leaving module fullscreen, restore the home "reserved" slot count to
 * whatever was showing when fullscreen opened — extra cards revealed/fetched
 * while fullscreen stay in the buffer but aren't shown on home again.
 */
export function useRestoreReservedOnScreenClose(
  isScreen: Ref<boolean>,
  reserved: Ref<number>,
  itemCount: Ref<number>,
): void {
  const snapshot = ref<number | null>(null)

  watch(isScreen, (screen, wasScreen) => {
    if (screen && !wasScreen) {
      snapshot.value = reserved.value
      return
    }
    if (!screen && wasScreen && snapshot.value != null) {
      reserved.value = Math.min(snapshot.value, itemCount.value)
      snapshot.value = null
    }
  })
}
