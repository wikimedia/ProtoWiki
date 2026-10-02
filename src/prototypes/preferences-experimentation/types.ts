export type PrefOption = {
  value: string
  label: string
  description?: string
  href?: string
  linkLabel?: string
}

export type PrefLink = {
  label: string
  href: string
}

export type PrefFieldType =
  | 'info'
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'checkboxes'
  | 'buttons'
  | 'matrix'
  | 'betafeature'
  | 'separator'

export interface PrefField {
  id: string
  type: PrefFieldType
  label?: string
  description?: string
  /** Pre-parsed HTML description (beta features). */
  descriptionHtml?: string
  help?: string
  /** Pre-parsed HTML help text when a link or markup is needed. */
  helpHtml?: string
  value?: string
  options?: PrefOption[]
  links?: PrefLink[]
  rows?: PrefOption[]
  columns?: PrefOption[]
  disabled?: boolean
  readonly?: boolean
  defaultValue?: unknown
  screenshot?: string
  infoHref?: string
  discussionHref?: string
  userCount?: number
  requiresJavascript?: boolean
}

export interface PrefSection {
  id: string
  title: string
  description?: string
  fields: PrefField[]
}

export interface PrefTab {
  id: string
  label: string
  description?: string
  sections: PrefSection[]
}
