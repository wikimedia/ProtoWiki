<script setup lang="ts">
import { computed, inject, useSlots } from 'vue'
import { CdxIcon } from '@wikimedia/codex'
import { cdxIconHelpNotice } from '@wikimedia/codex-icons'

import {
  globalSkin,
  globalTheme,
  PROTOWIKI_CHROME_SKIN,
  PROTOWIKI_CHROME_THEME,
} from '@/lib/theming'
import type { Skin, Theme } from '@/lib/theming'

/** Codex docs — fixed target for the built-in Help link (not a public prop). */
const HELP_LINK_HREF = 'https://doc.wikimedia.org/codex/latest/'
const DEFAULT_HELP_LABEL = 'Help'

interface Props {
  /**
   * Default inner text for the special-page **`h1`** (**`#title`** overrides markup).
   * **`null`** suppresses that default **`h1`** unless **`#title`** is supplied (**`#header`** replaces the whole title cluster).
   */
  title?: string | null
  /**
   * When **`true`**, show the default Help link (**desktop**): **"Help"** + icon, fixed Codex-docs URL (**`#help`** overrides markup).
   */
  help?: boolean
  /**
   * Reserve the actions aside (e.g. toolbar). When **`true`** and **`#actions`** is absent,
   * the region renders with no default buttons.
   */
  actions?: boolean
  /**
   * BCP-47 language tag for the wrapped subtree. Sets `lang` on the root.
   * Inherited by descendants via the DOM. Usually you set this once on the
   * outermost wrapper; only nest it for multi-language A/B previews.
   */
  lang?: string
  /**
   * Writing direction for the wrapped subtree. Sets `dir` on the root.
   * Pass `'rtl'` explicitly for RTL previews; we don't infer it from `lang`.
   */
  dir?: 'ltr' | 'rtl'
  /** Local skin override. Sets `data-skin` on the wrapper root. */
  skin?: Skin
  /** Local theme override. Sets `data-theme` on the wrapper root. */
  theme?: Theme
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  help: false,
  actions: false,
  lang: undefined,
  dir: undefined,
  skin: undefined,
  theme: undefined,
})

const inheritedSkin = inject(PROTOWIKI_CHROME_SKIN)
const inheritedTheme = inject(PROTOWIKI_CHROME_THEME)

const effectiveSkin = computed<Skin>(() => props.skin ?? inheritedSkin?.value ?? globalSkin.value)
const effectiveTheme = computed<Theme>(
  () => props.theme ?? inheritedTheme?.value ?? globalTheme.value,
)

const slots = useSlots()

/** Default **`h1`** path: prop / **`#title`** supply inner markup (no **`#header`**). */
const hasInnerTitle = computed(() => {
  if (slots.title) return true
  if (props.title === null || props.title === undefined) return false
  return String(props.title).trim().length > 0
})

/** Title cluster occupies space when **`#header`** is used or default **`h1`** should show. */
const hasTitleCluster = computed(() => Boolean(slots.header) || hasInnerTitle.value)

const showHelpRegion = computed(() => Boolean(slots.help) || props.help === true)
const showActionsRegion = computed(() => props.actions || Boolean(slots.actions))

const showHeaderNav = computed(
  () => hasTitleCluster.value || showHelpRegion.value || showActionsRegion.value,
)
</script>

<template>
  <div
    class="special-page-wrapper"
    :data-skin="effectiveSkin"
    :data-theme="effectiveTheme"
    :lang="props.lang"
    :dir="props.dir"
  >
    <header v-if="showHeaderNav" class="special-page-wrapper__header">
      <span class="special-page-wrapper__title-cluster">
        <slot name="header">
          <h1 v-if="hasInnerTitle" class="special-page-wrapper__title">
            <slot name="title">{{ props.title }}</slot>
          </h1>
        </slot>
      </span>
      <span class="special-page-wrapper__header-aside">
        <span v-if="showHelpRegion" class="special-page-wrapper__help">
          <slot name="help">
            <a
              v-if="props.help"
              class="special-page-wrapper__help-link"
              :href="HELP_LINK_HREF"
              rel="noopener noreferrer"
            >
              <CdxIcon size="small" :icon="cdxIconHelpNotice" />
              <span>{{ DEFAULT_HELP_LABEL }}</span>
            </a>
          </slot>
        </span>
        <span v-if="showActionsRegion" class="special-page-wrapper__actions">
          <slot name="actions" />
        </span>
      </span>
    </header>

    <div class="special-page-wrapper__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
/*
 * Layout aligned with FakeMediaWiki `SpecialView`: max width ~1596px,
 * horizontal padding ~2.75rem, title row flex + baseline Help link.
 */
.special-page-wrapper {
  box-sizing: border-box;
  width: 100%;
  max-width: 99.75rem;
  margin: 0 auto;
  padding-top: var(--spacing-150);
  padding-inline: var(--spacing-150);
  background-color: var(--background-color-base);
}

.special-page-wrapper__header {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--spacing-100, 16px);
  width: 100%;
  margin-bottom: var(--spacing-100, 16px);
  padding-bottom: 2px;
  border-bottom: 1px solid var(--border-color-base, #a2a9b1);
}

.special-page-wrapper__title-cluster {
  display: flex;
  align-items: baseline;
  gap: var(--spacing-75, 12px);
  min-width: 0;
}

.special-page-wrapper__title {
  margin: 0;
  padding-bottom: 2px;
  border: none;
}

/*
 * Minerva / mobile — sans title (global `h1` is serif Heading 1); xx-large reads
 * smaller than xxx-large without the desktop title-rule line under the header.
 */
.special-page-wrapper[data-skin='mobile'] .special-page-wrapper__title {
  padding-bottom: 0;
  font-family:
    var(--font-family-system-sans, system-ui, sans-serif), var(--font-family-base, sans-serif);
  font-size: var(--font-size-xx-large);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-xx-large);
  color: var(--color-base);
}

.special-page-wrapper[data-skin='mobile'] .special-page-wrapper__header {
  border-bottom: none;
  padding-bottom: 0;
}

.special-page-wrapper__header-aside {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--spacing-100, 16px);
}

.special-page-wrapper__help :deep(a),
.special-page-wrapper__help-link {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
  padding: var(--spacing-25, 4px) var(--spacing-50, 8px);
  font-size: var(--font-size-medium, 1rem);
  color: var(--color-progressive, #36c);
  text-decoration: none;
}

.special-page-wrapper__help :deep(a:hover),
.special-page-wrapper__help-link:hover {
  text-decoration: underline;
}

.special-page-wrapper__actions {
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-50, 8px);
}

.special-page-wrapper__body {
  min-width: 0;
}

.special-page-wrapper[data-skin='mobile'] {
  padding: var(--spacing-100);
  padding-block: var(--spacing-150);
}

.special-page-wrapper[data-skin='mobile'] .special-page-wrapper__help {
  display: none;
}
</style>
