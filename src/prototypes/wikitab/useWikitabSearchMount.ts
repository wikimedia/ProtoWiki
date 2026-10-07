import { ref } from 'vue'

/** Bumped on every search navigation so WikitabSearch remounts with a clean menu. */
const mountKey = ref(0)

export function useWikitabSearchMountKey() {
  return mountKey
}

export function bumpWikitabSearchMountKey(): void {
  mountKey.value += 1
}
