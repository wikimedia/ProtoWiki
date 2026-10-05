import { mobileH2ChevronSvg } from './mobileH2CodexIcons'

/**
 * Folds article tables into the "Quick facts" / "More information" widgets the
 * Wikipedia apps show — a port of the apps' `CollapseTable` page-library
 * transform, which ProtoWiki cannot use directly because it only runs against a
 * PCS `mobile-html` document.
 */

const CONTAINER_CLASS = 'protowiki-collapse-table-container'
const INFOBOX_TITLE = 'Quick facts'
const OTHER_TITLE = 'More information'
const FOOTER_TITLE = 'Close'

/** Tables the apps leave alone: navigation and maintenance furniture. */
const SKIP_CLASSES = ['navbox', 'vertical-navbox', 'navbox-inner', 'metadata', 'mbox-small']

/** A `th` this link-heavy is a navigation row, not a caption. */
const MAX_HEADER_LINKS = 3

const HEADER_NOISE_SELECTOR = '.geo, .coordinates, sup.mw-ref, ol, ul, style, script'

/**
 * The infobox's own title row repeats the article title, so the apps drop it
 * from the caption. Upstream compares first words against the page title; on
 * Parsoid markup the row carries a class, which says the same thing without the
 * renderer needing to know what article it is showing.
 */
const TITLE_ROW_SELECTOR = 'th.infobox-above, th.infobox-title'

function isInfobox(table: HTMLTableElement): boolean {
  return table.classList.contains('infobox') || table.classList.contains('infobox_v3')
}

function shouldSkip(table: HTMLTableElement): boolean {
  if (table.closest(`.${CONTAINER_CLASS}`)) return true
  if (table.style.display === 'none') return true
  return SKIP_CLASSES.some((className) => table.classList.contains(className))
}

/** Visible caption text of one `th`, or `null` when there is nothing worth showing. */
function headerText(th: HTMLTableCellElement): string | null {
  if (th.querySelectorAll('a').length >= MAX_HEADER_LINKS) return null
  if (th.matches(TITLE_ROW_SELECTOR)) return null

  const clone = th.cloneNode(true) as HTMLTableCellElement
  clone.querySelectorAll(HEADER_NOISE_SELECTOR).forEach((el) => el.remove())
  clone.querySelectorAll('br').forEach((br) => br.replaceWith(' '))

  const text = (clone.textContent ?? '').trim().replace(/\s+/g, ' ')
  // Bare numbers (years, chart positions) read as noise in a caption.
  return text.replace(/[\s\d]/g, '').length ? text : null
}

/** The first two usable header captions, in document order. */
function captionParts(table: HTMLTableElement): string[] {
  const parts: string[] = []
  for (const th of table.querySelectorAll('th')) {
    const text = headerText(th)
    if (!text || parts.includes(text)) continue
    parts.push(text)
    if (parts.length === 2) break
  }
  return parts
}

function makeChevron(collapsed: boolean): HTMLSpanElement {
  const chevron = document.createElement('span')
  chevron.className = 'protowiki-collapse-table__chevron'
  chevron.setAttribute('aria-hidden', 'true')
  chevron.innerHTML = mobileH2ChevronSvg(collapsed)
  return chevron
}

function wrapTable(table: HTMLTableElement, title: string, caption: string) {
  const container = document.createElement('div')
  container.className = CONTAINER_CLASS

  const header = document.createElement('button')
  header.type = 'button'
  header.className = 'protowiki-collapse-table__header'
  header.setAttribute('aria-expanded', 'false')

  const strong = document.createElement('strong')
  strong.className = 'protowiki-collapse-table__title'
  strong.textContent = title

  const captionEl = document.createElement('span')
  captionEl.className = 'protowiki-collapse-table__caption'
  captionEl.textContent = caption

  const headerChevron = makeChevron(true)
  header.append(strong, captionEl, headerChevron)

  const content = document.createElement('div')
  content.className = 'protowiki-collapse-table__content'
  content.hidden = true

  const footer = document.createElement('button')
  footer.type = 'button'
  footer.className = 'protowiki-collapse-table__footer'
  footer.hidden = true
  const footerLabel = document.createElement('span')
  footerLabel.className = 'protowiki-collapse-table__footer-label'
  footerLabel.textContent = FOOTER_TITLE
  footer.append(footerLabel, makeChevron(false))

  table.replaceWith(container)
  content.appendChild(table)
  container.append(header, content, footer)
  table.classList.add('protowiki-collapse-table')

  function setCollapsed(collapsed: boolean) {
    content.hidden = collapsed
    footer.hidden = collapsed
    header.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
    header.classList.toggle('protowiki-collapse-table__header--expanded', !collapsed)
    headerChevron.innerHTML = mobileH2ChevronSvg(collapsed)
  }

  header.addEventListener('click', () => setCollapsed(!content.hidden))

  footer.addEventListener('click', () => {
    setCollapsed(true)
    // Collapsing from the bottom otherwise leaves the reader below the widget.
    header.scrollIntoView({ block: 'nearest' })
  })
}

/**
 * Idempotent: tables already inside a widget are skipped, which also keeps
 * tables nested inside a wrapped table from getting their own widget.
 */
export function collapseArticleTables(root: HTMLElement): void {
  root.querySelectorAll<HTMLTableElement>('table').forEach((table) => {
    if (shouldSkip(table)) return

    const infobox = isInfobox(table)
    const parts = captionParts(table)
    if (!parts.length && !infobox) return

    // Leading space separates the caption from the bold title beside it; the
    // ellipsis says the table holds more than the two headers named.
    const caption = parts.length ? ` ${parts.join(', ')} ...` : ''
    wrapTable(table, infobox ? INFOBOX_TITLE : OTHER_TITLE, caption)
  })
}
