declare global {
  interface Window {
    pcs?: {
      c1?: {
        Page?: {
          onBodyStart?: () => void
          /** Reveals collapsed sections and finishes PCS setup (native apps call after onBodyStart). */
          onBodyEnd?: () => void
        }
      }
    }
  }
}

export {}

const PCS_SCRIPT_ID = 'protowiki-pcs-script'
const PCS_STYLESHEET_ATTR = 'data-protowiki-pcs-stylesheet'

let pcsScriptPromise: Promise<void> | null = null

/** Load pagelib PCS script once (shared across article navigations). */
export function ensurePcsScript(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve()
  if (window.pcs?.c1?.Page?.onBodyStart) return Promise.resolve()

  if (pcsScriptPromise) return pcsScriptPromise

  pcsScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(PCS_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('PCS script failed to load.')), {
        once: true,
      })
      if (window.pcs?.c1?.Page?.onBodyStart) resolve()
      return
    }

    const script = document.createElement('script')
    script.id = PCS_SCRIPT_ID
    script.src = 'https://meta.wikimedia.org/api/rest_v1/data/javascript/mobile/pcs'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('PCS script failed to load.'))
    document.head.appendChild(script)
  })

  return pcsScriptPromise
}

/** Inject PCS stylesheets from mobile-html head; replaces prior article-scoped links. */
export function applyPcsStylesheets(hrefs: string[]): void {
  if (typeof document === 'undefined') return

  document
    .querySelectorAll<HTMLLinkElement>(`link[${PCS_STYLESHEET_ATTR}]`)
    .forEach((link) => link.remove())

  for (const href of hrefs) {
    if (!href) continue
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = href
    link.setAttribute(PCS_STYLESHEET_ATTR, 'true')
    document.head.appendChild(link)
  }
}

export function removePcsStylesheets(): void {
  if (typeof document === 'undefined') return
  document
    .querySelectorAll<HTMLLinkElement>(`link[${PCS_STYLESHEET_ATTR}]`)
    .forEach((link) => link.remove())
}

export function runPcsPageStart(): void {
  window.pcs?.c1?.Page?.onBodyStart?.()
}

const PCS_BODY_END_EVENT = 'onBodyEnd'
const PCS_BODY_END_FALLBACK_MS = 500

/**
 * PCS phase 2: expand hidden sections and run footer/table setup.
 * Without this, sections after the lead stay `display: none` and the article appears truncated.
 */
export function runPcsPageEnd(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()

  return new Promise((resolve) => {
    let settled = false
    const finish = (): void => {
      if (settled) return
      settled = true
      window.removeEventListener(PCS_BODY_END_EVENT, onEnd)
      resolve()
    }
    const onEnd = (): void => finish()

    window.addEventListener(PCS_BODY_END_EVENT, onEnd)
    window.setTimeout(finish, PCS_BODY_END_FALLBACK_MS)

    window.pcs?.c1?.Page?.onBodyEnd?.()
    if (!window.pcs?.c1?.Page?.onBodyEnd) finish()
  })
}

export type PcsThemeClass = 'pagelib_theme_default' | 'pagelib_theme_dark'

export function pcsThemeClass(theme: 'light' | 'dark' | undefined): PcsThemeClass {
  return theme === 'dark' ? 'pagelib_theme_dark' : 'pagelib_theme_default'
}
