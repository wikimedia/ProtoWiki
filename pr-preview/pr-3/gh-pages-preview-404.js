// Prepended to dist/404.html on build (see vite.config.ts). GitHub Pages only
// serves 404.html at the site root; deep links under pr-preview/pr-N/... hit
// that file with the production base. Redirect into the preview base and stash
// the path for gh-pages-restore.js on the preview index.
;(function (l) {
  var m = l.pathname.match(/^(.+\/pr-preview\/pr-\d+)\/?(.*)$/)
  if (!m) return
  var base = m[1] + '/'
  var rest = m[2] || ''
  var path = rest ? '/' + rest : '/'
  sessionStorage.setItem(
    'protowiki-gh-pages-path',
    path + (l.search || '') + (l.hash || ''),
  )
  l.replace(base)
})(location)
