// Prepended to dist/404.html on build (see vite.config.ts). GitHub Pages only
// serves 404.html at the site root; deep links under pr-preview/pr-N/... or a
// Codex variant (…/codex/<variant>/..., see build-codex-variants.mjs) hit that
// file with the production base. Redirect into the right base and stash the
// path for gh-pages-restore.js on that base's index. Keep the regex in sync
// with gh-pages-restore.js.
;(function (l, doc) {
  var m = l.pathname.match(
    /^(.+\/pr-preview\/pr-\d+(?:\/codex\/[\w.-]+)?|.*\/codex\/[\w.-]+)(?:\/(.*))?$/,
  )
  if (!m) return
  var base = m[1] + '/'
  var rest = m[2] || ''
  var path = rest ? '/' + rest : '/'
  sessionStorage.setItem(
    'protowiki-gh-pages-path',
    path + (l.search || '') + (l.hash || ''),
  )
  // Do not let the production SPA in this file boot (wrong PROTOWIKI_BASE).
  doc.documentElement.innerHTML =
    '<head><meta charset="utf-8"><title>ProtoWiki</title></head><body></body>'
  l.replace(base)
})(location, document)
