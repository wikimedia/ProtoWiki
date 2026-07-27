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

/** Document-layout offset within the scroll page (immune to sticky visual position). */
function getLayoutScrollOffsetTop(el: Element, scrollPage: HTMLElement): number {
  let offset = parseFloat(getComputedStyle(el).marginTop) || 0
  let node: Element | null = el

  while (node && node !== scrollPage) {
    const parent = node.parentElement
    if (!parent) break

    const parentStyles = getComputedStyle(parent)
    offset += parseFloat(parentStyles.paddingTop) || 0

    let siblingsBefore = 0
    for (const sibling of parent.children) {
      if (sibling === node) break
      offset += (sibling as HTMLElement).offsetHeight
      siblingsBefore++
    }

    const rowGap = parseFloat(parentStyles.rowGap || parentStyles.gap) || 0
    if (rowGap > 0 && siblingsBefore > 0) {
      offset += rowGap * siblingsBefore
    }

    node = parent
  }

  return offset
}

function measureMusicalGroupTabsStuckMinScroll(page: HTMLElement): number {
  const hasPageTitle = Boolean(page.querySelector('.musical-group-chrome-stack .wikita-title'))
  const hasHomeSectionTitle = hasMusicalGroupHomeTabBorderAnchor(page)
  return hasPageTitle || hasHomeSectionTitle ? 2 : 1
}

/** ScrollTop at which the tab bar first pins below the chrome stack. */
export function measureMusicalGroupTabsStuckBaseline(page: HTMLElement): number {
  const tabsEl = page.querySelector('.musical-group-tabs-sticky')
  if (!tabsEl) return 0

  const stickyTop =
    parseFloat(getComputedStyle(page).getPropertyValue('--musical-group-tabs-sticky-top')) || 0
  const tabsLayoutTop = getLayoutScrollOffsetTop(tabsEl, page)
  const layoutBaseline = tabsLayoutTop - stickyTop

  // Never snap to 0 while stuck — that drops tabs out of the sticky band and
  // lets body content bleed into the gap above the tab bar (Wikipedia skin).
  return Math.max(measureMusicalGroupTabsStuckMinScroll(page), layoutBaseline)
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

  const panelLayoutTop = getLayoutScrollOffsetTop(panel, page)
  const panelTopScroll = Math.max(0, panelLayoutTop - measureMusicalGroupTabPanelTopInset(page))

  return Math.max(stuckBaseline, panelTopScroll)
}

/**
 * ScrollTop at which sticky tab-panel content reaches the tab bar — the same
 * threshold that drives data-page-scrolled (entity panel top or home title).
 */
export function measureMusicalGroupTabBorderScrollThreshold(page: HTMLElement): number {
  const hasPageTitle = Boolean(page.querySelector('.musical-group-chrome-stack .wikita-title'))
  if (hasPageTitle) {
    return measureMusicalGroupTabContentTopScroll(page)
  }
  if (hasMusicalGroupHomeTabBorderAnchor(page)) {
    return measureMusicalGroupHomeTabBorderScroll(page)
  }
  return 0
}

/** First home-section in the active tab body, skipping chrome like loaders/errors. */
function getFirstHomeTabSection(body: Element): Element | null {
  for (const child of body.children) {
    if (child.classList.contains('wikita-home-section')) {
      return child
    }

    if (child.classList.contains('musical-group-home__saved-tab')) {
      const firstSection = child.querySelector('.wikita-home-section')
      if (firstSection) return firstSection
    }
  }

  return null
}

/** Section heading that gates the tab border, when the first section has one. */
function getHomeTabBorderAnchor(body: Element): Element | null {
  const firstSection = getFirstHomeTabSection(body)
  if (!firstSection?.classList.contains('wikita-home-section--has-title')) {
    return null
  }

  return firstSection.querySelector('.wikita-home-section__title') ?? firstSection
}

/** Whether the active home tab's first visible section has a heading. */
export function hasMusicalGroupHomeTabBorderAnchor(page: HTMLElement): boolean {
  const body = page.querySelector('.musical-group-home__body')
  return Boolean(body && getHomeTabBorderAnchor(body))
}

/** ScrollTop at which the first home-section title sits below the sticky tabs with breathing room. */
export function measureMusicalGroupHomeTabBorderScroll(page: HTMLElement): number {
  const stuckBaseline = measureMusicalGroupTabsStuckBaseline(page)
  const body = page.querySelector('.musical-group-home__body')
  if (!body) return stuckBaseline

  const anchor = getHomeTabBorderAnchor(body)
  if (!anchor) return stuckBaseline

  const firstSection = getFirstHomeTabSection(body)
  const sectionMarginTop = firstSection
    ? parseFloat(getComputedStyle(firstSection).marginTop) || 0
    : 0
  const anchorLayoutTop = getLayoutScrollOffsetTop(anchor, page)
  const anchorTopScroll = Math.max(
    0,
    anchorLayoutTop - measureMusicalGroupTabPanelTopInset(page) - sectionMarginTop,
  )

  return Math.max(stuckBaseline, anchorTopScroll)
}

/** ScrollTop that places the top of the home tab body below sticky chrome + tabs. */
export function measureMusicalGroupHomeTabContentTopScroll(page: HTMLElement): number {
  const body = page.querySelector('.musical-group-home__body')
  const stuckBaseline = measureMusicalGroupTabsStuckBaseline(page)
  if (!body) return stuckBaseline

  const bodyLayoutTop = getLayoutScrollOffsetTop(body, page)
  const bodyTopScroll = Math.max(0, bodyLayoutTop - measureMusicalGroupTabPanelTopInset(page))

  return Math.max(stuckBaseline, bodyTopScroll)
}

/** Default scrollTop when opening a home tab (section title anchor or body top). */
export function measureMusicalGroupHomeTabDefaultScroll(page: HTMLElement): number {
  return hasMusicalGroupHomeTabBorderAnchor(page)
    ? measureMusicalGroupHomeTabBorderScroll(page)
    : measureMusicalGroupHomeTabContentTopScroll(page)
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
