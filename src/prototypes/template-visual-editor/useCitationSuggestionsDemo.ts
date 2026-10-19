/**
 * Citation suggestion demo state — derived from Bárbara Martínez Calvo’s
 * [suggestion-mode](https://github.com/bmartinezcalvo/suggestion-mode) prototype.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type ComputedRef, type Ref } from 'vue'

import type { InjectionKey } from 'vue'

const MAIN_CONTENT_SELECTOR = '.visual-editor-layout .main-content-area'

export type CitationSuggestionsDemo = ReturnType<typeof useCitationSuggestionsDemo>
export const CITATION_SUGGESTIONS_DEMO_KEY: InjectionKey<CitationSuggestionsDemo> = Symbol(
  'citation-suggestions-demo',
)

export function useCitationSuggestionsDemo(options: {
  isEditMode: Ref<boolean>
  showSuggestions: Ref<boolean>
  isMobileSkin: ComputedRef<boolean>
  editRootRef: Ref<HTMLElement | null>
}) {
  const hasUnsavedChanges = ref(false)
  const isLoading = ref(false)
  const enableAutoScroll = ref(true)
  const showSuggestionNotification = ref(false)

  const isMinervaSheetOpen = ref(false)
  const activeMinervaSuggestion = ref(1)
  const minervaSheetRef = ref<HTMLElement | null>(null)
  const minervaSheetHeight = ref(0)

  const isCardExpanded = ref(false)
  const isCardHovered = ref(false)
  const isTextHovered = ref(false)
  const highlightedTextRef = ref<HTMLElement | null>(null)
  const sidebarTopOffset = ref(0)
  const articleFirstSectionRef = ref<HTMLElement | null>(null)
  const suggestionsTopOffset = ref(0)
  const isHovered = computed(() => isCardHovered.value || isTextHovered.value)

  const isCardExpanded2 = ref(false)
  const isCardHovered2 = ref(false)
  const isTextHovered2 = ref(false)
  const highlightedTextRef2 = ref<HTMLElement | null>(null)
  const sidebarTopOffset2 = ref(0)
  const isHovered2 = computed(() => isCardHovered2.value || isTextHovered2.value)

  const showCitationPopup1 = ref(false)
  const showCitationPopup2 = ref(false)
  const citationUrl1 = ref('')
  const citationUrl2 = ref('')
  const citationNumber1 = ref<number | null>(null)
  const citationNumber2 = ref<number | null>(null)
  const citationCounter = ref(0)
  const showSuccessMessage1 = ref(false)
  const showSuccessMessage2 = ref(false)
  const isSuggestionDeclined1 = ref(false)
  const isSuggestionDeclined2 = ref(false)

  const editSnapshot = ref<{ node: Element; html: string }[]>([])

  const isValidUrl1 = computed(() => isValidHttpUrl(citationUrl1.value))
  const isValidUrl2 = computed(() => isValidHttpUrl(citationUrl2.value))

  const allSuggestionsHandled = computed(() => {
    const s1 = citationNumber1.value !== null || isSuggestionDeclined1.value
    const s2 = citationNumber2.value !== null || isSuggestionDeclined2.value
    return s1 && s2
  })

  const showEmptyState = computed(() => {
    const s1 = citationNumber1.value !== null || isSuggestionDeclined1.value
    const s2 = citationNumber2.value !== null || isSuggestionDeclined2.value
    return s1 && s2
  })

  const shouldShowEmptyState = computed(() => options.showSuggestions.value && showEmptyState.value)

  const minervaSheetTitle = computed(() => {
    if (showSuggestionNotification.value) return '2 suggestions available'
    if (shouldShowEmptyState.value) return 'No suggestions'
    return 'Add a citation'
  })

  const hasPendingSuggestions = computed(() => {
    const s1 =
      citationNumber1.value === null &&
      !isSuggestionDeclined1.value &&
      !showSuccessMessage1.value
    const s2 =
      citationNumber2.value === null &&
      !isSuggestionDeclined2.value &&
      !showSuccessMessage2.value
    return s1 || s2
  })

  function resetSuggestionState() {
    showCitationPopup1.value = false
    showCitationPopup2.value = false
    citationUrl1.value = ''
    citationUrl2.value = ''
    citationNumber1.value = null
    citationNumber2.value = null
    citationCounter.value = 0
    showSuccessMessage1.value = false
    showSuccessMessage2.value = false
    isSuggestionDeclined1.value = false
    isSuggestionDeclined2.value = false
    isCardExpanded.value = false
    isCardExpanded2.value = false
    isCardHovered.value = false
    isCardHovered2.value = false
    isTextHovered.value = false
    isTextHovered2.value = false
    closeMinervaSuggestion()
  }

  function handleNotificationClick() {
    options.showSuggestions.value = true
    showSuggestionNotification.value = false
    if (options.isMobileSkin.value) {
      isMinervaSheetOpen.value = true
    }
    nextTick(() => openFirstPendingSuggestion())
  }

  function handleNotificationKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleNotificationClick()
    }
  }

  function handleYesSuggestion1() {
    showCitationPopup1.value = true
  }

  function handleYesSuggestion2() {
    showCitationPopup2.value = true
  }

  function handleNoSuggestion1() {
    isSuggestionDeclined1.value = true
    isCardExpanded.value = false
    closeMinervaSuggestion()
  }

  function handleNoSuggestion2() {
    isSuggestionDeclined2.value = true
    isCardExpanded2.value = false
    closeMinervaSuggestion()
  }

  function createCitation1() {
    if (!citationUrl1.value.trim()) return
    citationCounter.value++
    citationNumber1.value = citationCounter.value
    showCitationPopup1.value = false
    closeMinervaSuggestion()
    showSuccessMessage1.value = true
    setTimeout(() => {
      showSuccessMessage1.value = false
    }, 4000)
  }

  function createCitation2() {
    if (!citationUrl2.value.trim()) return
    citationCounter.value++
    citationNumber2.value = citationCounter.value
    showCitationPopup2.value = false
    closeMinervaSuggestion()
    showSuccessMessage2.value = true
    setTimeout(() => {
      showSuccessMessage2.value = false
    }, 4000)
  }

  watch(isCardExpanded, (open) => {
    if (open) isCardExpanded2.value = false
  })

  watch(isCardExpanded2, (open) => {
    if (open) isCardExpanded.value = false
  })

  function alignSidebarWithText() {
    if (!highlightedTextRef.value) return
    nextTick(() => {
      const mainContentArea = document.querySelector(MAIN_CONTENT_SELECTOR)
      if (!mainContentArea) return
      const textRect = highlightedTextRef.value!.getBoundingClientRect()
      const containerRect = mainContentArea.getBoundingClientRect()
      sidebarTopOffset.value = textRect.top - containerRect.top - suggestionsTopOffset.value
    })
  }

  function alignSidebarWithText2() {
    if (!highlightedTextRef2.value) return
    nextTick(() => {
      const mainContentArea = document.querySelector(MAIN_CONTENT_SELECTOR)
      if (!mainContentArea) return
      const textRect = highlightedTextRef2.value!.getBoundingClientRect()
      const containerRect = mainContentArea.getBoundingClientRect()
      sidebarTopOffset2.value = textRect.top - containerRect.top - suggestionsTopOffset.value
    })
  }

  function alignSuggestionsContainer() {
    if (!articleFirstSectionRef.value) return
    nextTick(() => {
      const mainContentArea = document.querySelector(MAIN_CONTENT_SELECTOR)
      if (!mainContentArea) return
      const sectionRect = articleFirstSectionRef.value!.getBoundingClientRect()
      const containerRect = mainContentArea.getBoundingClientRect()
      suggestionsTopOffset.value = Math.max(0, sectionRect.top - containerRect.top)
    })
  }

  function alignBothSuggestions() {
    alignSuggestionsContainer()
    alignSidebarWithText()
    alignSidebarWithText2()
  }

  watch(options.showSuggestions, (active) => {
    if (active) {
      nextTick(() => alignBothSuggestions())
    } else {
      sidebarTopOffset.value = 0
      sidebarTopOffset2.value = 0
      suggestionsTopOffset.value = 0
      closeMinervaSuggestion()
    }
  })

  watch(
    () => options.isEditMode.value,
    (edit) => {
      if (edit && options.showSuggestions.value) {
        nextTick(() => alignBothSuggestions())
      }
    },
  )

  watch(
    () => [options.showSuggestions.value, showEmptyState.value, options.isMobileSkin.value],
    ([suggestionsActive, emptyActive, isMinerva]) => {
      if (isMinerva && suggestionsActive && emptyActive) {
        isMinervaSheetOpen.value = true
      }
    },
  )

  watch(isMinervaSheetOpen, () => updateMinervaSheetHeight())

  let autoSuggestionTimer: ReturnType<typeof setTimeout> | null = null

  function clearAutoSuggestionTimer() {
    if (autoSuggestionTimer) {
      clearTimeout(autoSuggestionTimer)
      autoSuggestionTimer = null
    }
  }

  function openFirstPendingSuggestion() {
    if (!options.isEditMode.value || !options.showSuggestions.value) return

    const s1Pending =
      citationNumber1.value === null &&
      !isSuggestionDeclined1.value &&
      !showSuccessMessage1.value
    const s2Pending =
      citationNumber2.value === null &&
      !isSuggestionDeclined2.value &&
      !showSuccessMessage2.value

    if (s1Pending) {
      if (options.isMobileSkin.value) {
        openMinervaSuggestion(1)
      } else {
        isCardExpanded.value = true
        isCardExpanded2.value = false
      }
      scrollToSuggestionIfNeeded(highlightedTextRef)
    } else if (s2Pending) {
      if (options.isMobileSkin.value) {
        openMinervaSuggestion(2)
      } else {
        isCardExpanded2.value = true
        isCardExpanded.value = false
      }
      scrollToSuggestionIfNeeded(highlightedTextRef2)
    }
  }

  watch(
    () => [options.isEditMode.value, options.showSuggestions.value],
    ([editActive, suggestionsActive]) => {
      clearAutoSuggestionTimer()
      if (editActive && suggestionsActive && enableAutoScroll.value) {
        autoSuggestionTimer = setTimeout(() => openFirstPendingSuggestion(), 1200)
      }
    },
  )

  function openMinervaSuggestion(suggestionId: number) {
    activeMinervaSuggestion.value = suggestionId
    isMinervaSheetOpen.value = true
    if (suggestionId === 1) {
      isCardExpanded.value = true
      isCardExpanded2.value = false
    } else {
      isCardExpanded2.value = true
      isCardExpanded.value = false
    }
    updateMinervaSheetHeight()
  }

  function closeMinervaSuggestion() {
    isMinervaSheetOpen.value = false
    isCardExpanded.value = false
    isCardExpanded2.value = false
    minervaSheetHeight.value = 0
  }

  function updateMinervaSheetHeight() {
    if (!isMinervaSheetOpen.value) {
      minervaSheetHeight.value = 0
      return
    }
    nextTick(() => {
      const sheet = minervaSheetRef.value
      if (sheet) minervaSheetHeight.value = sheet.offsetHeight
    })
  }

  function captureEditSnapshot() {
    const root = options.editRootRef.value
    if (!root) return
    const nodes = root.querySelectorAll('.article-text-editable')
    editSnapshot.value = Array.from(nodes).map((node) => ({
      node,
      html: node.innerHTML,
    }))
  }

  function restoreEditSnapshot() {
    editSnapshot.value.forEach(({ node, html }) => {
      if (node) node.innerHTML = html
    })
  }

  function undoEdits() {
    restoreEditSnapshot()
    hasUnsavedChanges.value = false
  }

  function markArticleEdited() {
    hasUnsavedChanges.value = true
  }

  function beginEditSession() {
    isLoading.value = true
    hasUnsavedChanges.value = false
    nextTick(() => captureEditSnapshot())
    setTimeout(() => {
      isLoading.value = false
    }, 2000)
  }

  function endEditSession() {
    restoreEditSnapshot()
    hasUnsavedChanges.value = false
    closeMinervaSuggestion()
    resetSuggestionState()
  }

  onMounted(() => {
    if (options.isEditMode.value && options.showSuggestions.value) {
      setTimeout(() => alignBothSuggestions(), 100)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', alignBothSuggestions)
      window.addEventListener('scroll', alignBothSuggestions, true)
      window.addEventListener('resize', updateMinervaSheetHeight)
    }
  })

  onBeforeUnmount(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', alignBothSuggestions)
      window.removeEventListener('scroll', alignBothSuggestions, true)
      window.removeEventListener('resize', updateMinervaSheetHeight)
    }
    clearAutoSuggestionTimer()
  })

  return {
    hasUnsavedChanges,
    isLoading,
    showSuggestionNotification,
    isMinervaSheetOpen,
    activeMinervaSuggestion,
    minervaSheetRef,
    minervaSheetHeight,
    isCardExpanded,
    isCardHovered,
    isTextHovered,
    highlightedTextRef,
    sidebarTopOffset,
    articleFirstSectionRef,
    suggestionsTopOffset,
    isHovered,
    isCardExpanded2,
    isCardHovered2,
    isTextHovered2,
    highlightedTextRef2,
    sidebarTopOffset2,
    isHovered2,
    showCitationPopup1,
    showCitationPopup2,
    citationUrl1,
    citationUrl2,
    citationNumber1,
    citationNumber2,
    showSuccessMessage1,
    showSuccessMessage2,
    isSuggestionDeclined1,
    isSuggestionDeclined2,
    isValidUrl1,
    isValidUrl2,
    allSuggestionsHandled,
    shouldShowEmptyState,
    minervaSheetTitle,
    hasPendingSuggestions,
    handleNotificationClick,
    handleNotificationKeydown,
    handleYesSuggestion1,
    handleYesSuggestion2,
    handleNoSuggestion1,
    handleNoSuggestion2,
    createCitation1,
    createCitation2,
    openMinervaSuggestion,
    closeMinervaSuggestion,
    undoEdits,
    markArticleEdited,
    beginEditSession,
    endEditSession,
    alignBothSuggestions,
  }
}

function isValidHttpUrl(raw: string): boolean {
  const url = raw.trim()
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function scrollToSuggestionIfNeeded(targetRef: Ref<HTMLElement | null>) {
  nextTick(() => {
    const target = targetRef.value
    if (!target) return
    const rect = target.getBoundingClientRect()
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight
    if (rect.bottom > 0 && rect.top < viewportHeight) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}
