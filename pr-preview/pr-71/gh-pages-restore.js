// Injected at the top of <head> on build (see vite.config.ts). Runs before the
// Vite bundle so Vue Router sees the deep path. Pairs with gh-pages-preview-404.js.
;(function (l, h) {
  var key = 'protowiki-gh-pages-path'
  var stored = sessionStorage.getItem(key)
  if (!stored) return
  // dist/404.html includes this script after the preview redirect preamble. On a
  // pr-preview deep link, do not consume storage here — wait for the redirect to
  // the preview index, which runs this script again on …/pr-N/.
  if (/^(.+\/pr-preview\/pr-\d+)\/.+/.test(l.pathname)) return
  sessionStorage.removeItem(key)
  var base = l.pathname.replace(/\/$/, '') || l.pathname
  h.replaceState(null, '', base + stored)
})(location, history)
