import {
  cdxIconRobot,
  cdxIconUserAnonymous,
  cdxIconUserAvatar,
  cdxIconUserTemporary,
  type Icon,
} from '@wikimedia/codex-icons'

import type { EditorKind } from './fetchWikitabSearchActivity'

const EDITOR_KIND_ICONS: Record<EditorKind, Icon> = {
  bot: cdxIconRobot,
  temporary: cdxIconUserTemporary,
  user: cdxIconUserAvatar,
  anonymous: cdxIconUserAnonymous,
}

export function editorIconForKind(kind: EditorKind | undefined): Icon | undefined {
  if (!kind) return undefined
  return EDITOR_KIND_ICONS[kind]
}
