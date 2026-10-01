import { getContentLang } from '@/lib/contentLang'

import { getUiLang } from './index'
import { directionForLang, type TextDirection } from './rtl'

export { directionForLang, type TextDirection }

/** Direction of the interface language — set on `<html dir>` in main.ts. */
export function getUiDir(): TextDirection {
  return directionForLang(getUiLang())
}

/** Direction of the content wiki (article HTML, wiki-sourced titles). */
export function getContentDir(): TextDirection {
  return directionForLang(getContentLang())
}

/** Apply the interface `lang` / `dir` to `<html>`. */
export function applyDocumentDirection(): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = getUiLang()
  document.documentElement.dir = getUiDir()
}
