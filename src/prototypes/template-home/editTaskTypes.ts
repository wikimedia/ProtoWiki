/**
 * Suggested-edit task types, as English Wikipedia's Growth newcomer tasks define
 * them (`MediaWiki:GrowthExperimentsSuggestedEdits.json`, snapshot 2026-09-30):
 * a task is an article carrying one of these maintenance templates, or one with
 * a machine "Add a link" recommendation. In priority order.
 */

export interface EditTaskType {
  id: string
  label: string
  /** Template names (no `Template:` prefix) that mark an article as needing this. */
  templates: string[]
}

export const TEMPLATE_TASK_TYPES: readonly EditTaskType[] = [
  {
    id: 'references',
    label: 'Find a reference',
    templates: [
      'Unreferenced',
      'Unreferenced section',
      'More references',
      'More references needed section',
    ],
  },
  { id: 'links', label: 'Add links', templates: ['Underlinked', 'Dead end'] },
  { id: 'expand', label: 'Extend article', templates: ['Stub', 'Expand section', 'Expand lead'] },
  {
    id: 'copyedit',
    label: 'Copyedit',
    templates: [
      'Inappropriate person',
      'Cleanup tense',
      'Copy edit section',
      'Sentence fragment',
      'Copy edit inline',
      'Copy edit',
    ],
  },
  { id: 'update', label: 'Update article', templates: ['Update'] },
]

/** Growth's "Add a link" structured task (CirrusSearch `hasrecommendation:link`). */
export const LINK_RECOMMENDATION_ID = 'links'
export const LINK_RECOMMENDATION_LABEL = 'Add links'

export const ALL_TASK_TEMPLATES = TEMPLATE_TASK_TYPES.flatMap((type) => type.templates)

/** The highest-priority task type among an article's templates (names without `Template:`). */
export function taskTypeForTemplates(templates: string[]): EditTaskType | undefined {
  const present = new Set(templates)
  return TEMPLATE_TASK_TYPES.find((type) => type.templates.some((name) => present.has(name)))
}
