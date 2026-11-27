// Prepended to dist/404.html on build (see vite.config.ts). GitHub Pages only
// serves 404.html at the site root, so deep links under pr-preview/pr-N/... or a
// Codex variant (…/codex/<variant>/..., see build-codex-variants.mjs) hit this
// file, which carries the production build. Instead of redirecting (which would
// lose the path), fetch that base's own index.html and render it in place: the
// URL never changes, and its router boots with the right base on the deep path.
;(function (l, doc) {
  var m = l.pathname.match(
    /^(.+\/pr-preview\/pr-\d+(?:\/codex\/[\w.-]+)?|.*\/codex\/[\w.-]+)(?:\/(.*))?$/,
  )
  if (!m) return
  var base = m[1] + '/'
  // Do not let the production SPA in this file boot (wrong PROTOWIKI_BASE).
  doc.documentElement.innerHTML =
    '<head><meta charset="utf-8"><title>ProtoWiki</title></head><body></body>'
  function render(html) {
    doc.open()
    doc.write(html)
    doc.close()
  }
  function notFound() {
    render(
      '<!doctype html><meta charset="utf-8"><title>Page not found</title>' +
        '<p>Page not found. <a href="' +
        // Production base: strip the pr-preview / codex variant segment.
        base.replace(/\/(?:pr-preview\/pr-\d+|codex\/[\w.-]+)\/.*$/, '/') +
        '">Go to the start</a>.</p>',
    )
  }
  fetch(base + 'index.html', { cache: 'no-cache' })
    .then(function (res) {
      if (!res.ok) throw new Error(res.status)
      return res.text()
    })
    .then(render, notFound)
})(location, document)
