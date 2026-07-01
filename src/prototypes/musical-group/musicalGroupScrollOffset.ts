import { scrollTabIntoTrackView } from './scrollTabIntoTrackView'

export function getMusicalGroupScrollPage(): HTMLElement | null {
  return document.querySelector('.musical-group-page')
}

export function scrollMusicalGroupPageToTop(behavior: ScrollBehavior = 'instant'): void {
  const page = getMusicalGroupScrollPage()
  if (!page) return
  page.scrollTo({ top: 0, behavior })
}

/** Scroll a tab button into view in the home or entity tab strip. */
export function scrollMusicalGroupTabIntoView(tabId: string): void {
  const page = getMusicalGroupScrollPage()
  if (!page) return

  const track = page.querySelector('.musical-group-tabs__track')
  if (!(track instanceof HTMLElement)) return

  const button = track.querySelector<HTMLElement>(`[data-tab-id="${tabId}"]`)
  if (button) scrollTabIntoTrackView(button, track)
}

export function isMusicalGroupTabsStuck(page: Element): boolean {
  return page.hasAttribute('data-tabs-stuck')
}

function getScrollContentOffsetTop(el: Element, scrollPage: HTMLElement): number {
  const pageRect = scrollPage.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  return scrollPage.scrollTop + (elRect.top - pageRect.top)
}

/** ScrollTop at which the tab bar first pins below the chrome stack. */
export function measureMusicalGroupTabsStuckBaseline(page: HTMLElement): number {
  const tabsEl = page.querySelector('.musical-group-tabs-sticky')
  if (!tabsEl) return 0

  const stickyTop =
    parseFloat(getComputedStyle(page).getPropertyValue('--musical-group-tabs-sticky-top')) || 0
  const tabsOffsetTop = getScrollContentOffsetTop(tabsEl, page)

  return Math.max(0, tabsOffsetTop - stickyTop)
}

/** Viewport inset for the top of tab panel content (sticky chrome + tab bar). */
export function measureMusicalGroupTabPanelTopInset(page: Element): number {
  const styles = getComputedStyle(page)
  const tabsTop = parseFloat(styles.getPropertyValue('--musical-group-tabs-sticky-top'))
  const tabsHeight = parseFloat(styles.getPropertyValue('--musical-group-tabs-height'))

  if (tabsTop > 0 && tabsHeight > 0) {
    return tabsTop + tabsHeight
  }

  const pageTop = page.getBoundingClientRect().top
  let bottom = 0

  for (const selector of ['.musical-group-chrome-stack', '.musical-group-tabs-sticky']) {
    const el = page.querySelector(selector)
    if (el) {
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom - pageTop)
    }
  }

  return bottom
}

/** ScrollTop that places the top of the active tab panel below sticky chrome + tabs. */
export function measureMusicalGroupTabContentTopScroll(page: HTMLElement): number {
  const panel = page.querySelector('.musical-group-screen__panel')
  const stuckBaseline = measureMusicalGroupTabsStuckBaseline(page)
  if (!panel) return stuckBaseline

  const panelOffsetTop = getScrollContentOffsetTop(panel, page)
  const panelTopScroll = Math.max(0, panelOffsetTop - measureMusicalGroupTabPanelTopInset(page))

  return Math.max(stuckBaseline, panelTopScroll)
}

/** ScrollTop that places the top of the home tab body below sticky chrome + tabs. */
export function measureMusicalGroupHomeTabContentTopScroll(page: HTMLElement): number {
  const body = page.querySelector('.musical-group-home__body')
  const stuckBaseline = measureMusicalGroupTabsStuckBaseline(page)
  if (!body) return stuckBaseline

  const bodyOffsetTop = getScrollContentOffsetTop(body, page)
  const bodyTopScroll = Math.max(0, bodyOffsetTop - measureMusicalGroupTabPanelTopInset(page))

  return Math.max(stuckBaseline, bodyTopScroll)
}

/** Space to leave above in-page scroll targets so sticky chrome + tabs do not cover them. */
export function measureMusicalGroupStickyScrollOffset(page: Element): number {
  const styles = getComputedStyle(page)
  const gap = parseFloat(styles.getPropertyValue('--spacing-50')) || 8
  const tabsTop = parseFloat(styles.getPropertyValue('--musical-group-tabs-sticky-top'))
  const tabsHeight = parseFloat(styles.getPropertyValue('--musical-group-tabs-height'))

  if (tabsTop > 0 && tabsHeight > 0) {
    return tabsTop + tabsHeight + gap
  }

  const pageTop = page.getBoundingClientRect().top
  let bottom = 0

  for (const selector of ['.musical-group-chrome-stack', '.musical-group-tabs-sticky']) {
    const el = page.querySelector(selector)
    if (el) {
      bottom = Math.max(bottom, el.getBoundingClientRect().bottom - pageTop)
    }
  }

  return bottom + gap
}

export function scrollMusicalGroupPageToElement(page: HTMLElement, target: Element): void {
  const offset = measureMusicalGroupStickyScrollOffset(page)
  const pageRect = page.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const top = page.scrollTop + (targetRect.top - pageRect.top) - offset

  page.scrollTo({ top: Math.max(0, top), behavior: 'instant' })
}
