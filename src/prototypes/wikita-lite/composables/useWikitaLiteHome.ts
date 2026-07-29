import { useMusicalGroupHome } from '../../musical-group/useMusicalGroupHome'

export const WIKITA_LITE_HELP_WANTED_LIMIT = 9

export function useWikitaLiteHome() {
  return useMusicalGroupHome({ helpWantedLimit: WIKITA_LITE_HELP_WANTED_LIMIT })
}
