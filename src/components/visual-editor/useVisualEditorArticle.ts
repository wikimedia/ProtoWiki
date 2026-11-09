import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

import {
  attachSectionEditLinkHandler,
  decorateSectionEditLinks,
} from '@/components/article/shared/attachSectionEditLinks'
import type { Skin } from '@/theme'

export interface VisualEditorPage {
  title: string
  lang: string
  host: string
}

export interface UseVisualEditorArticleOptions {
  /** Article HTML for read/edit surfaces (includes published overlay). */
  html: ComputedRef<string>
  page: ComputedRef<VisualEditorPage | null>
  skin: ComputedRef<Skin>
  /** When true, enter edit mode once `page` and `html` are ready. */
  startInEditMode: Ref<boolean>
  /** Never show the inline read surface — stay in (or loading toward) edit mode. */
  editorOnly?: Ref<boolean>
  /** Fires when the loaded article identity changes (new fetch). */
  onArticleIdentityChange?: () => void
}

export function useVisualEditorArticle(options: UseVisualEditorArticleOptions) {
  const { html, page, skin, startInEditMode, editorOnly, onArticleIdentityChange } = options

  const editing = ref(false)
  const editKey = ref(0)
  const editorRef = ref<{ requestExit: () => void } | null>(null)
  const editSection = ref<string | null>(null)
  const readerRef = ref<{ $el: HTMLElement } | null>(null)
  const sidebarOpen = ref(false)
  const detectedCount = ref<number | null>(null)
  const publishedToast = ref(0)
  const publishedHtml = ref<string | null>(null)

  const isMobile = computed(() => skin.value === 'mobile')

  const displayHtml = computed(() => publishedHtml.value ?? html.value)

  function resetForNewArticle() {
    if (!editorOnly?.value) editing.value = false
    sidebarOpen.value = false
    publishedHtml.value = null
    detectedCount.value = null
    onArticleIdentityChange?.()
  }

  function startEditing(section: string | null = null) {
    if (!page.value || editing.value) return
    editSection.value = section
    editKey.value++
    editing.value = true
    if (isMobile.value) window.scrollTo({ top: 0 })
  }

  function stopEditing() {
    if (editorOnly?.value) return
    editing.value = false
    sidebarOpen.value = false
  }

  function requestStopEditing() {
    if (editorRef.value) editorRef.value.requestExit()
    else stopEditing()
  }

  function onEditClick() {
    if (editing.value) requestStopEditing()
    else startEditing(null)
  }

  function onReadClick() {
    if (editing.value) requestStopEditing()
  }

  function onPublished(newHtml: string) {
    publishedHtml.value = newHtml
    stopEditing()
    publishedToast.value++
    window.scrollTo({ top: 0 })
  }

  let detachSectionEdit: (() => void) | null = null
  watch(
    () => [readerRef.value?.$el, displayHtml.value, skin.value, editing.value] as const,
    async () => {
      await nextTick()
      setTimeout(() => {
        detachSectionEdit?.()
        detachSectionEdit = null
        const root = readerRef.value?.$el as HTMLElement | undefined
        if (!root || editing.value) return
        decorateSectionEditLinks(root, isMobile.value)
        detachSectionEdit = attachSectionEditLinkHandler(root, (section) => startEditing(section))
      }, 0)
    },
    { flush: 'post' },
  )
  onBeforeUnmount(() => detachSectionEdit?.())

  let autoStartedForTitle: string | null = null
  watch(
    () =>
      [
        page.value?.title,
        displayHtml.value,
        startInEditMode.value,
        editorOnly?.value,
      ] as const,
    ([title, bodyHtml, shouldStart, onlyEditor]) => {
      if (!title || !bodyHtml || (!shouldStart && !onlyEditor)) return
      if (autoStartedForTitle === title) return
      autoStartedForTitle = title
      startEditing(null)
    },
  )

  watch(
    () => page.value?.title,
    (title, prev) => {
      if (title === prev) return
      autoStartedForTitle = null
      resetForNewArticle()
    },
  )

  function updateToastOffset() {
    const header = document.querySelector('.vector-chrome-header')
    const bottom = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0
    document.documentElement.style.setProperty('--ve-toast-top', `${bottom + 16}px`)
  }

  watch(
    skin,
    (value) => {
      document.documentElement.classList.toggle('ve-template-vector', value === 'desktop')
      nextTick(updateToastOffset)
    },
    { immediate: true },
  )
  updateToastOffset()
  window.addEventListener('scroll', updateToastOffset, { passive: true })
  onBeforeUnmount(() => {
    window.removeEventListener('scroll', updateToastOffset)
    document.documentElement.classList.remove('ve-template-vector')
    document.documentElement.style.removeProperty('--ve-toast-top')
  })

  return {
    editing,
    editKey,
    editorRef,
    editSection,
    readerRef,
    sidebarOpen,
    detectedCount,
    publishedToast,
    publishedHtml,
    displayHtml,
    isMobile,
    startEditing,
    stopEditing,
    requestStopEditing,
    onEditClick,
    onReadClick,
    onPublished,
    resetForNewArticle,
    exitEditForNavigation: stopEditing,
  }
}
