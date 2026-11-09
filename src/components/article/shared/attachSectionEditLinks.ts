/** Desktop Vector-style [edit] links beside section headings (read surface). */
export function decorateSectionEditLinks(root: HTMLElement, mobile: boolean): void {
  if (mobile) return
  root
    .querySelectorAll<HTMLElement>('section[data-mw-section-id] > :is(h2, h3, h4, h5, h6)')
    .forEach((heading) => {
      const id = heading.parentElement?.getAttribute('data-mw-section-id')
      if (!id || Number(id) <= 0 || heading.querySelector('.mw-editsection')) return
      const wrap = document.createElement('span')
      wrap.className = 'mw-editsection'
      wrap.innerHTML =
        '<span class="mw-editsection-bracket">[</span><a href="#" class="ve-section-edit"></a><span class="mw-editsection-bracket">]</span>'
      const link = wrap.querySelector('a')!
      link.textContent = 'edit'
      link.title = `Edit section: ${heading.textContent?.trim() ?? ''}`
      link.dataset.section = id
      heading.appendChild(wrap)
    })
}

export function attachSectionEditLinkHandler(
  root: HTMLElement | null | undefined,
  onEdit: (section: string | null) => void,
): () => void {
  if (!root) return () => {}

  function onClick(e: MouseEvent) {
    const target = e.target as Element | null
    const trigger = target?.closest('.ve-section-edit, .protowiki-mobile-h2__edit')
    if (!trigger) return
    const section =
      (trigger as HTMLElement).dataset.section ??
      trigger.closest('section[data-mw-section-id]')?.getAttribute('data-mw-section-id')
    if (!section) return
    e.preventDefault()
    e.stopPropagation()
    onEdit(Number(section) > 0 ? section : null)
  }

  root.addEventListener('click', onClick, true)
  return () => root.removeEventListener('click', onClick, true)
}
