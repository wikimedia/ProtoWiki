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
