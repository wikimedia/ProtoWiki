// Injected at the top of <head> on build (see vite.config.ts). Runs before the Vite bundle.
// Pairs with public/404.html and src/lib/githubPagesSpaRedirect.ts.
;(function (l) {
  var search = l.search
  if (search.length > 1 && search[1] === '/') {
    var decoded = search
      .slice(1)
      .split('&')
      .map(function (s) {
        return s.replace(/~and~/g, '&')
      })
      .join('?')
    var basePath = l.pathname.endsWith('/') ? l.pathname.slice(0, -1) : l.pathname
    l.replaceState(null, '', basePath + decoded + l.hash)
    return
  }
  if (search.length > 1 && search[1] !== '/' && search.indexOf('=') === -1) {
    var base = l.pathname.endsWith('/') ? l.pathname.slice(0, -1) : l.pathname
    l.replaceState(null, '', base + '/' + search.slice(1) + l.hash)
  }
})(window.location)
