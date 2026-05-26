import { computed, type ComputedRef } from 'vue'

import type { SuggestionDescriptionPart } from '@/lib/ve-suggestions'

import { STRUCTURED_TASKS } from './dashpage-fixtures'

export interface StructuredTasksModuleBind {
  currentIndex?: number
  totalCount?: number
  articleTitle?: string
  articleDescription?: string
  thumbnailSrc?: string
  taskTypeLabel?: string
}

export interface StructuredTasksViewBind {
  showFilterBar?: boolean
  topicFilter?: string
  difficultyFilter?: string
  currentIndex?: number
  totalCount?: number
  articleTitle?: string
  articleShortDescription?: string
  thumbnailSrc?: string
  pageviewsLabel?: string
  taskHeading?: string
  taskTimeEstimate?: string
  taskDescription?: string
  taskDescriptionParts?: SuggestionDescriptionPart[]
  showSnippet?: boolean
  taskDifficulty?: 'easy' | 'medium' | 'hard'
  editHref?: string
  canGoPrev?: boolean
  canGoNext?: boolean
}

export function useDashpageStructuredTasksModule(): {
  moduleProps: ComputedRef<StructuredTasksModuleBind>
  fullscreenProps: ComputedRef<StructuredTasksViewBind>
} {
  const moduleProps = computed((): StructuredTasksModuleBind => ({
    currentIndex: STRUCTURED_TASKS.currentIndex,
    totalCount: STRUCTURED_TASKS.totalCount,
    articleTitle: STRUCTURED_TASKS.articleTitle,
    articleDescription: STRUCTURED_TASKS.articleDescription,
    thumbnailSrc: STRUCTURED_TASKS.thumbnailSrc,
    taskTypeLabel: STRUCTURED_TASKS.taskHeading,
  }))

  const fullscreenProps = computed((): StructuredTasksViewBind => ({
    showFilterBar: true,
    topicFilter: STRUCTURED_TASKS.topicFilter,
    difficultyFilter: STRUCTURED_TASKS.difficultyFilter,
    currentIndex: STRUCTURED_TASKS.currentIndex - 1,
    totalCount: STRUCTURED_TASKS.totalCount,
    articleTitle: STRUCTURED_TASKS.articleTitle,
    articleShortDescription: STRUCTURED_TASKS.articleDescription,
    thumbnailSrc: STRUCTURED_TASKS.thumbnailSrc,
    pageviewsLabel: STRUCTURED_TASKS.pageviewsLabel,
    taskHeading: STRUCTURED_TASKS.taskHeading,
    taskDifficulty: STRUCTURED_TASKS.taskDifficulty,
    taskTimeEstimate: STRUCTURED_TASKS.taskTimeEstimate,
    taskDescription: STRUCTURED_TASKS.taskDescription,
    taskDescriptionParts: [{ kind: 'text', text: STRUCTURED_TASKS.taskDescription }],
    showSnippet: false,
    editHref: STRUCTURED_TASKS.editHref,
    canGoPrev: false,
    canGoNext: false,
  }))

  return { moduleProps, fullscreenProps }
}
