import { ref } from 'vue'

import { loadConfig, type Config } from '@/config'

/** Module-level config store shared by settings UI, URL sync, and boot. */
export const protowikiConfig = ref<Config>(loadConfig())
