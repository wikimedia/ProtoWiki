import type { Component } from 'vue'

/** Codex icon name in kebab-case (e.g. `arrow-previous`) — see `codex-icons` skill. */
export type HeaderIconName = string

export interface HeaderLinkItem {
  type: 'link'
  icon: HeaderIconName
  label: string
  href?: string
}

export interface HeaderButtonItem {
  type: 'button'
  icon: HeaderIconName
  label: string
  onClick?: () => void
}

export interface HeaderComponentItem {
  type: 'component'
  component: Component
}

/** Screen title — Codex Heading 3. */
export interface HeaderTitleItem {
  type: 'title'
  text: string
}

export type HeaderItem =
  | HeaderLinkItem
  | HeaderButtonItem
  | HeaderComponentItem
  | HeaderTitleItem
