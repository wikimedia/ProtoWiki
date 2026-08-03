import { mobileH2ChevronSvg } from '@/components/article/shared/mobileH2CodexIcons'

const WRAPPER_CLASS = 'pw-collapsible-table'

/** "Born, Alma mater ..." — first two labels, ellipsis if more remain. */
function buildPreviewText(labels: string[]): string {
  const shown = labels.slice(0, 2).filter((label) => label.length > 0)
  if (!shown.length) return ''
  return labels.length > shown.length ? `${shown.join(', ')} ...` : shown.join(', ')
}

function wrapCollapsibleTable(
  table: HTMLTableElement,
  options: { label: string; preview: string },
): void {
  const wrapper = document.createElement('div')
  wrapper.className = WRAPPER_CLASS

  const summary = document.createElement('button')
  summary.type = 'button'
  summary.className = `${WRAPPER_CLASS}__summary`
  summary.setAttribute('aria-expanded', 'false')

  const labelEl = document.createElement('span')
  labelEl.className = `${WRAPPER_CLASS}__label`
  labelEl.textContent = options.label

  const previewEl = document.createElement('span')
  previewEl.className = `${WRAPPER_CLASS}__preview`
  previewEl.textContent = options.preview

  const chevron = document.createElement('span')
  chevron.className = `${WRAPPER_CLASS}__chevron`
  chevron.setAttribute('aria-hidden', 'true')
  chevron.innerHTML = mobileH2ChevronSvg(true)

  summary.append(labelEl, previewEl, chevron)

  const panel = document.createElement('div')
  panel.className = `${WRAPPER_CLASS}__panel ${WRAPPER_CLASS}__panel--collapsed`

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.className = `${WRAPPER_CLASS}__close`
  const closeChevron = document.createElement('span')
  closeChevron.className = `${WRAPPER_CLASS}__chevron`
  closeChevron.setAttribute('aria-hidden', 'true')
  closeChevron.innerHTML = mobileH2ChevronSvg(false)
  closeBtn.append(document.createTextNode('Close'), closeChevron)

  table.replaceWith(wrapper)
  panel.append(table, closeBtn)
  wrapper.append(summary, panel)

  function toggle(): void {
    const collapsed = panel.classList.toggle(`${WRAPPER_CLASS}__panel--collapsed`)
    summary.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
    chevron.innerHTML = mobileH2ChevronSvg(collapsed)
  }

  summary.addEventListener('click', toggle)
  closeBtn.addEventListener('click', toggle)
}

/**
 * Mirrors Wikipedia's mobile "Quick facts" / "More information" treatment:
 * collapses the infobox and any data tables behind a summary + preview bar.
 */
export function enhanceCollapsibleTables(root: HTMLElement): void {
  const infobox = root.querySelector<HTMLTableElement>('table.infobox')
  if (infobox && !infobox.closest(`.${WRAPPER_CLASS}`)) {
    const labels = Array.from(infobox.querySelectorAll('th.infobox-label')).map(
      (th) => th.textContent?.trim() ?? '',
    )
    wrapCollapsibleTable(infobox, { label: 'Quick facts', preview: buildPreviewText(labels) })
  }

  root.querySelectorAll<HTMLTableElement>('table.wikitable').forEach((table) => {
    if (table.closest(`.${WRAPPER_CLASS}`)) return
    const headers = Array.from(table.querySelectorAll('tr:first-child th')).map(
      (th) => th.textContent?.trim() ?? '',
    )
    wrapCollapsibleTable(table, { label: 'More information', preview: buildPreviewText(headers) })
  })
}
