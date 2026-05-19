// Injected at the top of <head> on build (see vite.config.ts). Runs before the
// Vite bundle so Vue Router sees the deep path. Pairs with gh-pages-preview-404.js.
;(function (l) {
  var key = 'protowiki-gh-pages-path'
  var stored = sessionStorage.getItem(key)
  if (!stored) return
  sessionStorage.removeItem(key)
  var base = l.pathname.replace(/\/$/, '') || l.pathname
  l.replaceState(null, '', base + stored)
})(location)
