import { onScopeDispose, shallowRef, type ShallowRef } from 'vue'

/**
 * What the page around the chrome does when the reader acts on their account.
 *
 * Chrome is generic: account menus can't know whether the prototype has its own
 * signed-in state. A prototype registers actions here, and matching menu rows
 * start working. With nothing registered, those rows stay inert mocks.
 *
 * Module-level rather than provide/inject, like `articleOpener`.
 */
export interface AccountActions {
  /** The user menu's "Log out" row. */
  logOut?(): void
  /** The user menu's own row (account name in Minerva, "User page" in Vector). */
  userPage?(): void
  /** The logged-out "Create account" link: the prototype's own account flow. */
  createAccount?: {
    /** Real `href` for ⌘- / middle-click; plain clicks go through `open`. */
    href(): string
    open(): void
  }
}

/** The actions the current page registered, or `null`. */
export const accountActions: ShallowRef<AccountActions | null> = shallowRef(null)

let owner: symbol | null = null

/** Register actions for the lifetime of the calling component. Call in `<script setup>`. */
export function registerAccountActions(actions: AccountActions): void {
  const token = Symbol('account-actions')
  owner = token
  accountActions.value = actions
  onScopeDispose(() => {
    if (owner !== token) return
    owner = null
    accountActions.value = null
  })
}
