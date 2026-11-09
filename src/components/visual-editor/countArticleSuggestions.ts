import { editorHasAtLeast25Edits, editorIsExperienced } from '@/config'

import { detectSuggestions } from './engine/checks'
import { suggestionSettings } from './settings'
import type { VisualEditorPage } from './useVisualEditorArticle'

function parseArticleHtml(html: string): Document {
  return new DOMParser().parseFromString(`<div class="mw-parser-output">${html}</div>`, 'text/html')
}

/** Count enabled suggestions for settings-panel shortfall (load-time only). */
export async function countArticleSuggestions(
  html: string,
  page: VisualEditorPage,
  editCount: number,
): Promise<number> {
  if (!suggestionSettings.enabled) return 0
  const root = parseArticleHtml(html).querySelector('.mw-parser-output')
  if (!root) return 0
  const options = {
    experiencedEditor: editorIsExperienced(editCount),
    atLeast25Edits: editorHasAtLeast25Edits(editCount),
  }
  const list = await detectSuggestions(root, page, options)
  return list.filter(
    (f) => suggestionSettings.types[f.type as keyof typeof suggestionSettings.types] !== false,
  ).length
}
