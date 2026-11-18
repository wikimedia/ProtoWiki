/*
 * wikilink.js — turn [[Wikilinks]] in any page into real links.
 *
 *   <script src="wikilink.js"></script>
 *
 * Supported syntax (same as MediaWiki):
 *   [[Wet Leg]]              → link to the "Wet Leg" article
 *   [[Wet Leg|the band]]     → custom label
 *   [[Wet Leg#Career]]       → link to a section
 *   [[wiki]]s                → trailing letters join the label ("wikis")
 *
 * Options (attributes on the <script> tag):
 *   data-wiki="https://fr.wikipedia.org"  which wiki to link to (default: English Wikipedia)
 *   data-check                            look up each title and mark missing pages as red links
 *   data-no-style                         don't inject the default CSS (dotted underline,
 *                                         red links); style a.wikilink yourself
 *   data-no-previews                      turn off hover previews
 *
 * Hovering (or keyboard-focusing) a wikilink shows a page preview, ported
 * from English Wikipedia's Page Previews. Red links get no preview, as on
 * Wikipedia.
 *
 * Text inside <a>, <code>, <pre>, <script>, <style>, <textarea> and any
 * element with [data-no-wikilink] is left alone.
 *
 * For content added later: window.Wikilink.convert(element)
 */
;(function () {
  'use strict'

  var script = document.currentScript
  var attr = function (name) {
    return script ? script.getAttribute(name) : null
  }
  var has = function (name) {
    return !!script && script.hasAttribute(name)
  }

  var wiki = (attr('data-wiki') || 'https://en.wikipedia.org').replace(/\/+$/, '')
  var check = has('data-check')

  var SKIP = 'a, code, pre, script, style, textarea, [data-no-wikilink]'
  // [[target]] or [[target|label]], followed by an optional link trail of letters.
  var PATTERN = /\[\[([^[\]|]+?)(?:\|([^[\]]*))?\]\]([a-z]*)/g

  function normalizeTitle(raw) {
    var title = raw.trim().replace(/[\s_]+/g, ' ')
    return title.charAt(0).toUpperCase() + title.slice(1)
  }

  function articleUrl(title, section) {
    var path = encodeURIComponent(title.replace(/ /g, '_')).replace(/%2F/g, '/').replace(/%3A/g, ':')
    var hash = section ? '#' + encodeURIComponent(section.trim().replace(/ /g, '_')) : ''
    return wiki + '/wiki/' + path + hash
  }

  function makeLink(target, label, trail) {
    var hashIndex = target.indexOf('#')
    var page = hashIndex === -1 ? target : target.slice(0, hashIndex)
    var section = hashIndex === -1 ? '' : target.slice(hashIndex + 1)
    var title = normalizeTitle(page)

    var a = document.createElement('a')
    a.className = 'wikilink'
    a.href = articleUrl(title, section)
    a.title = section ? title + ' § ' + section.trim() : title
    a.textContent = (label != null && label.trim() !== '' ? label : target.trim()) + trail
    a.setAttribute('data-wikilink-title', title)
    return a
  }

  function convertTextNode(node) {
    var text = node.nodeValue
    PATTERN.lastIndex = 0
    if (!PATTERN.test(text)) return []
    PATTERN.lastIndex = 0

    var fragment = document.createDocumentFragment()
    var links = []
    var last = 0
    var match
    while ((match = PATTERN.exec(text))) {
      if (match.index > last) fragment.appendChild(document.createTextNode(text.slice(last, match.index)))
      var link = makeLink(match[1], match[2], match[3])
      fragment.appendChild(link)
      links.push(link)
      last = PATTERN.lastIndex
    }
    if (last < text.length) fragment.appendChild(document.createTextNode(text.slice(last)))
    node.parentNode.replaceChild(fragment, node)
    return links
  }

  function convert(root) {
    root = root || document.body
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        if (node.nodeValue.indexOf('[[') === -1) return NodeFilter.FILTER_REJECT
        var parent = node.parentElement
        if (parent && parent.closest(SKIP)) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })

    // Collect first: replacing nodes while walking would confuse the walker.
    var nodes = []
    while (walker.nextNode()) nodes.push(walker.currentNode)

    var links = []
    nodes.forEach(function (node) {
      links = links.concat(convertTextNode(node))
    })
    if (check && links.length) markMissing(links)
    return links
  }

  // Ask the wiki which titles exist, 50 at a time, and mark the rest as red links.
  function markMissing(links) {
    var titles = []
    links.forEach(function (link) {
      var t = link.getAttribute('data-wikilink-title')
      if (titles.indexOf(t) === -1) titles.push(t)
    })

    for (var i = 0; i < titles.length; i += 50) {
      var batch = titles.slice(i, i + 50)
      var url =
        wiki +
        '/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1&titles=' +
        encodeURIComponent(batch.join('|'))

      fetch(url)
        .then(function (response) {
          return response.json()
        })
        .then(function (data) {
          var query = data.query || {}
          // Map each requested title through normalization and redirects to its final page.
          var resolve = {}
          ;(query.normalized || []).concat(query.redirects || []).forEach(function (step) {
            resolve[step.from] = step.to
          })
          var missing = {}
          ;(query.pages || []).forEach(function (page) {
            if (page.missing || page.invalid) missing[page.title] = true
          })
          links.forEach(function (link) {
            var t = link.getAttribute('data-wikilink-title')
            var final = t
            for (var hops = 0; resolve[final] && hops < 5; hops++) final = resolve[final]
            if (missing[final]) {
              link.classList.add('new')
              link.title = t + ' (page does not exist)'
            }
          })
        })
        .catch(function () {
          // Network trouble: leave links as plain blue links.
        })
    }
  }

  // ---------------------------------------------------------------------------
  // Page previews
  //
  // A port of English Wikipedia's hover previews (Extension:Popups,
  // https://gerrit.wikimedia.org/g/mediawiki/extensions/Popups). Markup, class
  // names, CSS, timings, thumbnail sizing and placement all follow the
  // extension's source and the CSS it serves in production. The preview lives
  // in a shadow root so the host page's styles can't change how it looks.
  // ---------------------------------------------------------------------------

  // src/constants.js
  var FETCH_START_DELAY = 150
  var FETCH_COMPLETE_TARGET_DELAY = 350 + FETCH_START_DELAY
  var PAGE_DWELL_DELAY = FETCH_COMPLETE_TARGET_DELAY - FETCH_START_DELAY
  var ABANDON_END_DELAY = 300
  // src/ui/renderer.js
  var LANDSCAPE_POPUP_WIDTH = 450
  var PORTRAIT_POPUP_WIDTH = 320
  var POINTER_SIZE = 8
  var MAX_LINK_WIDTH_FOR_CENTERED_POINTER = 28
  // src/ui/thumbnail.js
  var SIZES = { portraitImage: { h: 250, w: 203 }, landscapeImage: { h: 200, w: 320 } }
  // $wgThumbnailSteps on Wikimedia wikis
  var THUMBNAIL_STEPS = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840]
  // i18n/en.json
  var MSG = {
    noPreview: 'There was an issue displaying this preview',
    read: 'Go to this page',
    disambiguation: 'This title relates to more than one page',
    disambiguationLink: 'View similar pages',
  }

  // src/bracketedPixelRatio.js
  function bracketedPixelRatio() {
    var dpr = window.devicePixelRatio
    if (!dpr) return 1
    if (dpr > 1.5) return 2
    if (dpr > 1) return 1.5
    return 1
  }
  var BPR = bracketedPixelRatio()
  var THUMBNAIL_SIZE = 320 * Math.max(BPR, 1.5)

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms)
    })
  }

  // --- Data: REST page summary → preview model (src/gateway/rest.js, src/preview/model.js)

  function adjustThumbWidthForSteps(thumbWidth, originalWidth, isVectorized) {
    for (var i = 0; i < THUMBNAIL_STEPS.length; i++) {
      var step = THUMBNAIL_STEPS[i]
      if (step > originalWidth && !isVectorized) return originalWidth
      if (step >= thumbWidth) return step
    }
    return thumbWidth
  }

  function generateThumbnailData(thumbnail, original, thumbSize) {
    var parts = thumbnail.source.split('/')
    var lastPart = parts[parts.length - 1]
    var originalIsSafe = /\.(jpg|jpeg|png|gif)$/i.test(original.source) || undefined
    var filenamePxIndex = lastPart.indexOf('px-')
    if (filenamePxIndex === -1) return originalIsSafe && original
    var filename = lastPart.slice(filenamePxIndex + 3)
    var width, height
    if (thumbnail.width > thumbnail.height) {
      width = thumbSize
      height = Math.floor((thumbSize / thumbnail.width) * thumbnail.height)
    } else {
      width = Math.floor((thumbSize / thumbnail.height) * thumbnail.width)
      height = thumbSize
    }
    var isSvg = filename.indexOf('.svg') !== -1
    width = adjustThumbWidthForSteps(width, original.width, isSvg)
    if (width >= original.width && !isSvg) return originalIsSafe && original
    parts[parts.length - 1] = width + 'px-' + filename
    return { source: parts.join('/'), width: width, height: height }
  }

  function createModel(page) {
    var extract
    if (page.extract_html) {
      var node = document.createElement('div')
      node.innerHTML = page.extract_html
      extract = Array.prototype.slice.call(node.childNodes)
    }
    var type
    if (page.type === 'disambiguation') type = 'disambiguation'
    else if (!extract) type = 'generic'
    else type = 'page'
    return {
      title: page.title,
      url: articleUrl(page.title),
      languageCode: page.lang,
      languageDirection: page.dir,
      extract: extract,
      type: type,
      thumbnail: page.thumbnail && page.originalimage ? generateThumbnailData(page.thumbnail, page.originalimage, THUMBNAIL_SIZE) : undefined,
    }
  }

  function createNullModel(title) {
    return { title: title, url: articleUrl(title), languageCode: '', languageDirection: '', type: 'generic' }
  }

  // Resolves to a model, or null when no preview should show (network error or abort).
  function fetchModel(title, signal) {
    var url = wiki + '/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_'))
    return fetch(url, { signal: signal }).then(
      function (response) {
        if (!response.ok) return createNullModel(title)
        return response.json().then(function (page) {
          page = page || {}
          page.title = page.title || title
          return createModel(page)
        })
      },
      function () {
        return null
      },
    )
  }

  // --- Rendering (src/ui/thumbnail.js, src/ui/templates/*)

  function el(tag, className, attrs) {
    var node = document.createElement(tag)
    if (className) node.className = className
    for (var key in attrs || {}) node.setAttribute(key, attrs[key])
    return node
  }

  function createThumbnail(raw) {
    if (!raw) return null
    var thumbWidth = raw.width / BPR
    var thumbHeight = raw.height / BPR
    var tall = raw.height > raw.width || thumbWidth < SIZES.landscapeImage.w
    if (
      (tall && thumbHeight < SIZES.portraitImage.h && raw.height < SIZES.portraitImage.h) ||
      /[\\'"]/.test(raw.source)
    ) {
      return null
    }
    var aspectRatio = thumbWidth / thumbHeight
    var isSquare = aspectRatio > 0.7 && aspectRatio < 1.3
    var isNarrow = tall && thumbWidth < SIZES.portraitImage.w
    var img = el('img', 'mwe-popups-thumbnail')
    img.src = raw.source
    return {
      el: img,
      isTall: tall || isSquare,
      isNarrow: isNarrow,
      offset: isNarrow ? SIZES.portraitImage.w - thumbWidth : 0,
      width: thumbWidth,
      height: thumbHeight,
    }
  }

  function renderPopup(type, container) {
    var popup = el('div', 'mwe-popups mwe-popups-type-' + type, { 'aria-hidden': '' })
    container.className = 'mwe-popups-container'
    popup.appendChild(container)
    return popup
  }

  function createPagePreview(model) {
    var thumbnail = createThumbnail(model.thumbnail)
    var container = el('div')
    if (thumbnail) {
      var discreet = el('a', 'mwe-popups-discreet', { href: model.url })
      discreet.appendChild(thumbnail.el)
      container.appendChild(discreet)
    }
    var extract = el('a', 'mwe-popups-extract', {
      href: model.url,
      dir: model.languageDirection,
      lang: model.languageCode,
    })
    model.extract.forEach(function (node) {
      extract.appendChild(node)
    })
    container.appendChild(extract)
    // Production also has a footer with a settings cog here; it's left out.
    return {
      el: renderPopup(model.type, container),
      hasThumbnail: !!thumbnail,
      thumbnail: thumbnail,
      isTall: !!thumbnail && thumbnail.isTall,
    }
  }

  function renderPreview(model, message, linkMsg) {
    var container = el('div')
    var extract = el('a', 'mwe-popups-extract', { href: model.url })
    var scroll = el('div', 'mwe-popups-scroll')
    var title = el('strong', 'mwe-popups-title')
    title.appendChild(el('span', 'popups-icon popups-icon--preview-' + model.type))
    title.appendChild(document.createTextNode(model.title))
    scroll.appendChild(title)
    if (message) {
      var messageEl = el('div', 'mwe-popups-message')
      messageEl.textContent = message
      scroll.appendChild(messageEl)
    }
    extract.appendChild(scroll)
    container.appendChild(extract)
    var footer = el('footer')
    var readLink = el('a', 'mwe-popups-read-link', { href: model.url })
    readLink.textContent = linkMsg
    footer.appendChild(readLink)
    container.appendChild(footer)
    return { el: renderPopup(model.type, container), hasThumbnail: false, isTall: false }
  }

  function createPreview(model) {
    if (model.type === 'page') return createPagePreview(model)
    if (model.type === 'disambiguation') return renderPreview(model, MSG.disambiguation, MSG.disambiguationLink)
    model.title = MSG.noPreview
    return renderPreview(model, null, MSG.read)
  }

  // --- Placement (src/ui/renderer.js)

  function getClosestYPosition(y, rects, isTop) {
    var minY = null
    var result
    Array.prototype.forEach.call(rects, function (rect) {
      var deltaY = Math.abs(y - rect.top + y - rect.bottom)
      if (minY === null || minY > deltaY) {
        minY = deltaY
        result = isTop ? Math.floor(rect.top) : Math.ceil(rect.bottom)
      }
    })
    return result
  }

  function createLayout(isPreviewTall, measures, pointerSpaceSize, dir) {
    var flippedX = false
    var flippedY = false
    var offsetTop = measures.pageY
      ? getClosestYPosition(measures.pageY - measures.scrollTop, measures.clientRects, false) +
        measures.scrollTop +
        pointerSpaceSize
      : measures.offset.top + measures.height + POINTER_SIZE
    var offsetLeft
    var clientTop = measures.clientY ? measures.clientY : offsetTop - measures.scrollTop

    if (measures.pageX) {
      offsetLeft =
        measures.width > MAX_LINK_WIDTH_FOR_CENTERED_POINTER
          ? measures.pageX
          : measures.offset.left + measures.width / 2
    } else {
      offsetLeft = measures.offset.left
    }

    if (offsetLeft > measures.windowWidth / 2) {
      offsetLeft += !measures.pageX ? measures.width : 0
      offsetLeft -= !isPreviewTall ? PORTRAIT_POPUP_WIDTH : LANDSCAPE_POPUP_WIDTH
      flippedX = true
    }

    if (measures.pageX) offsetLeft += flippedX ? 18 : -18

    if (clientTop > measures.windowHeight / 2) {
      flippedY = true
      offsetTop = measures.offset.top
      if (measures.pageY) {
        offsetTop =
          getClosestYPosition(measures.pageY - measures.scrollTop, measures.clientRects, true) +
          measures.scrollTop
      }
      offsetTop -= pointerSpaceSize
    }

    return {
      offset: { top: offsetTop, left: offsetLeft },
      flippedX: dir === 'rtl' ? !flippedX : flippedX,
      flippedY: flippedY,
    }
  }

  function hasPointerOnImage(preview, layout) {
    if ((!preview.hasThumbnail || (preview.isTall && !layout.flippedX)) && !layout.flippedY) return false
    if (preview.hasThumbnail) {
      if ((!preview.isTall && !layout.flippedY) || (preview.isTall && layout.flippedX)) return true
    }
    return false
  }

  function getClasses(preview, layout) {
    var classes = [layout.flippedY ? 'mwe-popups-fade-in-down' : 'mwe-popups-fade-in-up']
    if (layout.flippedY && layout.flippedX) classes.push('flipped-x-y')
    else if (layout.flippedY) classes.push('flipped-y')
    else if (layout.flippedX) classes.push('flipped-x')
    classes.push(hasPointerOnImage(preview, layout) ? 'mwe-popups-image-pointer' : 'mwe-popups-no-image-pointer')
    classes.push(preview.isTall ? 'mwe-popups-is-tall' : 'mwe-popups-is-not-tall')
    return classes
  }

  var root = null

  function getRoot() {
    if (root) return root
    // Attached to <html> and absolutely positioned at the document origin, so
    // popup coordinates are page coordinates even if <body> is positioned.
    var host = document.createElement('div')
    host.setAttribute('data-wikilink-previews', '')
    host.style.cssText = 'position:absolute;top:0;left:0;width:0;height:0;z-index:110;'
    document.documentElement.appendChild(host)
    root = host.attachShadow({ mode: 'open' })
    var style = document.createElement('style')
    style.textContent = POPUP_CSS
    root.appendChild(style)
    return root
  }

  function show(preview, measures) {
    var dir = document.documentElement.getAttribute('dir') === 'rtl' ? 'rtl' : 'ltr'
    var layout = createLayout(preview.isTall, measures, POINTER_SIZE, dir)
    var popup = preview.el
    getRoot().appendChild(popup)
    if (dir === 'rtl') popup.classList.add('rtl')
    getClasses(preview, layout).forEach(function (c) {
      popup.classList.add(c)
    })
    popup.style.left = layout.offset.left + 'px'
    popup.style.display = 'block'
    // Production sets `bottom` against the initial containing block; our host
    // has no height, so place the popup's bottom edge at the same y with `top`.
    popup.style.top = (layout.flippedY ? layout.offset.top - popup.offsetHeight : layout.offset.top) + 'px'
  }

  function hide(preview) {
    var popup = preview.el
    var fadeIn = popup.classList.contains('mwe-popups-fade-in-up') ? 'mwe-popups-fade-in-up' : 'mwe-popups-fade-in-down'
    popup.classList.remove(fadeIn)
    popup.classList.add(fadeIn === 'mwe-popups-fade-in-up' ? 'mwe-popups-fade-out-down' : 'mwe-popups-fade-out-up')
    wait(150).then(function () {
      popup.remove()
    })
  }

  // --- Behaviour (src/actions.js, src/index.js, src/changeListeners/linkTitle.js)

  var active = { link: null, token: 0, preview: null, abandonTimer: null, controller: null, savedTitle: null }
  var tokens = 0

  function eligibleLink(target) {
    var link = target && target.closest ? target.closest('a.wikilink[href]') : null
    return link && !link.classList.contains('new') ? link : null
  }

  function measure(link, event) {
    var scrollTop = window.scrollY
    var bbox = link.getBoundingClientRect()
    return {
      pageX: event && event.pageX,
      pageY: event && event.pageY,
      clientY: event && event.clientY,
      width: link.offsetWidth,
      height: link.offsetHeight,
      offset: { top: scrollTop + bbox.y, left: window.scrollX + bbox.x },
      clientRects: link.getClientRects(),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      scrollTop: scrollTop,
    }
  }

  function cancelAbandon() {
    clearTimeout(active.abandonTimer)
    active.abandonTimer = null
  }

  function endInteraction() {
    cancelAbandon()
    if (active.controller) active.controller.abort()
    if (active.preview) hide(active.preview)
    if (active.link && active.savedTitle) active.link.setAttribute('title', active.savedTitle)
    active = { link: null, token: ++tokens, preview: null, abandonTimer: null, controller: null, savedTitle: null }
  }

  function linkDwell(link, event) {
    if (active.link === link) {
      cancelAbandon()
      return
    }
    if (active.link) endInteraction()

    var token = ++tokens
    var measures = measure(link, event)
    active.link = link
    active.token = token
    // Hide the native tooltip while previewing, like production does.
    active.savedTitle = link.getAttribute('title')
    link.setAttribute('title', '')

    wait(FETCH_START_DELAY)
      .then(function () {
        if (active.token !== token) return null
        active.controller = typeof AbortController === 'function' ? new AbortController() : null
        var title = link.getAttribute('data-wikilink-title')
        return Promise.all([
          fetchModel(title, active.controller && active.controller.signal),
          wait(PAGE_DWELL_DELAY),
        ])
      })
      .then(function (result) {
        if (!result || !result[0] || active.token !== token) return
        var preview = createPreview(result[0])
        active.preview = preview
        show(preview, measures)
        return wait(200).then(function () {
          preview.el.addEventListener('mouseenter', function () {
            if (active.preview === preview) cancelAbandon()
          })
          preview.el.addEventListener('mouseleave', function () {
            if (active.preview === preview) abandon()
          })
        })
      })
  }

  function abandon() {
    if (!active.link) return
    var token = active.token
    cancelAbandon()
    active.abandonTimer = setTimeout(function () {
      if (active.token === token) endInteraction()
    }, ABANDON_END_DELAY)
  }

  function initPreviews() {
    function onHover(event) {
      var link = eligibleLink(event.target)
      if (link) linkDwell(link, event.type === 'keyup' ? null : event)
    }
    function onHoverOut(event) {
      if (eligibleLink(event.target)) abandon()
    }
    document.addEventListener('mouseover', onHover)
    document.addEventListener('keyup', onHover)
    document.addEventListener('mouseout', onHoverOut)
    document.addEventListener('focusout', onHoverOut)
  }

  // Production CSS for ext.popups.main (Vector 2022, light theme), trimmed to
  // what page previews use, with Codex token fallbacks inlined.
  var SAD_FACE_ICON =
    'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"20\\" height=\\"20\\" viewBox=\\"0 0 20 20\\"><path fill=\\"%23000000\\" d=\\"M2 0a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm4 4c1.336 0 2.007 1.617 1.06 2.56-.943.947-2.56.276-2.56-1.06A1.5 1.5 0 0 1 6 4m8 0c1.336 0 2.007 1.617 1.06 2.56-.943.947-2.56.276-2.56-1.06A1.5 1.5 0 0 1 14 4m-4 5c2.61 0 4.83.67 5.65 3H4.35C5.17 9.67 7.39 9 10 9\\"/></svg>")'

  var DISAMBIGUATION_ICON =
    'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"20\\" height=\\"20\\" viewBox=\\"0 0 20 20\\" fill=\\"%23000\\"><path d=\\"M12 17H4v-1h8zm0-2H4v-1h8zm-5-3H4v-1h3zm5 0H8V7h4zm-5-2H4V9h3zm0-2H4V7h3z\\"/><path d=\\"M15 20H1V4h14zM3 18h10V6H3z\\"/><path d=\\"M19 16h-2V2H5V0h14z\\"/></svg>")'

  var POPUP_CSS = [
    // Shadow-root baseline: Vector 2022's body font and link colour.
    ':host{all:initial}',
    '.mwe-popups{font-family:sans-serif;text-align:start}',
    '.mwe-popups a{color:#36c;text-decoration:none}',
    // Animations
    '@keyframes mwe-popups-fade-in-up{0%{opacity:0;transform:translate(0,20px)}100%{opacity:1;transform:translate(0,0)}}',
    '@keyframes mwe-popups-fade-in-down{0%{opacity:0;transform:translate(0,-20px)}100%{opacity:1;transform:translate(0,0)}}',
    '@keyframes mwe-popups-fade-out-down{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(0,20px)}}',
    '@keyframes mwe-popups-fade-out-up{0%{opacity:1;transform:translate(0,0)}100%{opacity:0;transform:translate(0,-20px)}}',
    '.mwe-popups-fade-in-up{animation:mwe-popups-fade-in-up 0.2s ease forwards}',
    '.mwe-popups-fade-in-down{animation:mwe-popups-fade-in-down 0.2s ease forwards}',
    '.mwe-popups-fade-out-down{animation:mwe-popups-fade-out-down 0.2s ease forwards}',
    '.mwe-popups-fade-out-up{animation:mwe-popups-fade-out-up 0.2s ease forwards}',
    // Popup
    '.mwe-popups{background:#fff;position:absolute;z-index:110;box-shadow:0 30px 90px -20px rgba(0,0,0,0.3),0 0 0 1px #eaecf0;padding:0;display:none;font-size:14px;line-height:20px;min-width:300px;border-radius:2px}',
    '.mwe-popups .mwe-popups-container{color:#202122;text-decoration:none}',
    '.mwe-popups .mwe-popups-container footer{padding:0 16px 16px;margin:0;position:absolute;bottom:0;pointer-events:none}',
    '.mwe-popups .mwe-popups-container footer a{pointer-events:auto}',
    '.mwe-popups .mwe-popups-extract{margin:16px;display:block;color:#202122;text-decoration:none;position:relative;padding-bottom:4px}',
    '.mwe-popups .mwe-popups-extract:hover{text-decoration:none;color:inherit}',
    ".mwe-popups .mwe-popups-extract::after{content:' ';position:absolute;bottom:0;width:25%;height:20px;background-color:transparent;pointer-events:none}",
    ".mwe-popups .mwe-popups-extract[dir='ltr']::after{right:0;background-image:linear-gradient(to right,rgba(255,255,255,0),#ffffff 50%)}",
    ".mwe-popups .mwe-popups-extract[dir='rtl']::after{left:0;background-image:linear-gradient(to left,rgba(255,255,255,0),#ffffff 50%)}",
    '.mwe-popups .mwe-popups-extract p{margin:0}',
    '.mwe-popups .mwe-popups-extract ul,.mwe-popups .mwe-popups-extract ol,.mwe-popups .mwe-popups-extract li,.mwe-popups .mwe-popups-extract dl,.mwe-popups .mwe-popups-extract dd,.mwe-popups .mwe-popups-extract dt{margin-top:0;margin-bottom:0}',
    '.mwe-popups .mwe-popups-extract blockquote{margin:0;padding:0 20px}',
    '.mwe-popups svg{overflow:hidden}',
    '.mwe-popups.mwe-popups-is-tall{width:450px}',
    '.mwe-popups.mwe-popups-is-tall .mwe-popups-extract{width:215px;height:176px;overflow:hidden;float:left}',
    '.mwe-popups.mwe-popups-is-tall footer{left:0;right:203px}',
    '.mwe-popups.mwe-popups-is-not-tall{width:320px}',
    '.mwe-popups.mwe-popups-is-not-tall .mwe-popups-extract{min-height:50px;max-height:136px;overflow:hidden;margin-bottom:50px}',
    '.mwe-popups.mwe-popups-is-not-tall footer{left:0;right:0}',
    // Page previews have no footer here (production's settings cog is left
    // out), so drop the 50px reserved for it back to the normal 16px margin.
    '.mwe-popups.mwe-popups-type-page.mwe-popups-is-not-tall .mwe-popups-extract{margin-bottom:16px}',
    // Pointer (CSS clip-path version)
    '.mwe-popups.flipped-y .mwe-popups-container,.mwe-popups.flipped-x-y .mwe-popups-container{--y1:100%;--y2:calc(100% - var(--pointer-height));--y3:calc(100% - var(--pointer-height) - var(--pseudo-radius));--y4:var(--pseudo-radius);--y5:0;margin-bottom:calc(var(--pointer-height) * -1);padding-bottom:var(--pointer-height)}',
    '.mwe-popups:not(.flipped-y):not(.flipped-x-y) .mwe-popups-container{margin-top:calc(var(--pointer-height) * -1);padding-top:var(--pointer-height)}',
    '.mwe-popups .mwe-popups-discreet{margin-top:calc(var(--pointer-height) * -1)}',
    '.mwe-popups.mwe-popups-is-tall.flipped-y .mwe-popups-discreet,.mwe-popups.mwe-popups-is-tall.flipped-x-y .mwe-popups-discreet{margin-top:0;margin-bottom:calc(var(--pointer-height) * -1)}',
    '.mwe-popups .mwe-popups-container{--x1:0;--x2:var(--pseudo-radius);--x3:calc(var(--pointer-offset) - (var(--pointer-width) / 2));--x4:var(--pointer-offset);--x5:calc(var(--pointer-offset) + (var(--pointer-width) / 2));--x6:calc(100% - var(--pseudo-radius));--x7:100%;--y1:0;--y2:var(--pointer-height);--y3:calc(var(--pointer-height) + var(--pseudo-radius));--y4:calc(100% - var(--pseudo-radius));--y5:100%;padding-top:0;display:flex;background:#fff;--pseudo-radius:2px;--pointer-height:8px;--pointer-width:16px;--pointer-offset:26px;clip-path:polygon(var(--x2) var(--y2),var(--x3) var(--y2),var(--x4) var(--y1),var(--x5) var(--y2),var(--x6) var(--y2),var(--x7) var(--y3),var(--x7) var(--y4),var(--x6) var(--y5),var(--x2) var(--y5),var(--x1) var(--y4),var(--x1) var(--y3))}',
    '.mwe-popups.mwe-popups-is-tall{flex-direction:row}',
    '.mwe-popups.mwe-popups-is-tall .mwe-popups-discreet{order:1}',
    '.mwe-popups .mwe-popups-thumbnail{display:block;object-fit:cover;outline:1px solid rgba(0,0,0,0.1)}',
    '.mwe-popups.mwe-popups-is-tall .mwe-popups-discreet .mwe-popups-thumbnail{width:203px;box-sizing:border-box;height:250px}',
    '.mwe-popups.mwe-popups-is-not-tall .mwe-popups-thumbnail{width:320px;height:192px}',
    '.mwe-popups.mwe-popups-is-not-tall .mwe-popups-container{flex-direction:column}',
    '.mwe-popups::before{display:none}',
    '.mwe-popups::after{display:none}',
    '.mwe-popups.flipped-x .mwe-popups-container,.mwe-popups.flipped-x-y .mwe-popups-container,.mwe-popups.rtl:not(.flipped-x):not(.flipped-x-y) .mwe-popups-container{--x3:calc(100% - var(--pointer-offset) - (var(--pointer-width) / 2));--x4:calc(100% - var(--pointer-offset));--x5:calc(100% - var(--pointer-offset) + (var(--pointer-width) / 2))}',
    // Generic and disambiguation previews (preview.less)
    '.mwe-popups .mwe-popups-title{display:block;margin-bottom:12px}',
    '.mwe-popups-type-generic.mwe-popups .mwe-popups-title{font-weight:normal;margin:0}',
    '.mwe-popups .mwe-popups-title .popups-icon{margin:0 8px 0 0}',
    '.mwe-popups.mwe-popups-type-generic .mwe-popups-extract,.mwe-popups.mwe-popups-type-disambiguation .mwe-popups-extract{min-height:auto}',
    '.mwe-popups.mwe-popups-type-generic .mwe-popups-read-link,.mwe-popups.mwe-popups-type-disambiguation .mwe-popups-read-link{font-weight:bold;font-size:12px;text-decoration:none}',
    '.mwe-popups.mwe-popups-type-generic .mwe-popups-extract:hover + footer .mwe-popups-read-link,.mwe-popups.mwe-popups-type-disambiguation .mwe-popups-extract:hover + footer .mwe-popups-read-link,.mwe-popups.mwe-popups-type-generic .mwe-popups-read-link:hover,.mwe-popups.mwe-popups-type-disambiguation .mwe-popups-read-link:hover{text-decoration:underline}',
    // Icons
    '.popups-icon{min-width:10px;min-height:10px;width:20px;height:20px;display:inline-block;vertical-align:text-bottom;-webkit-mask-position:center;mask-position:center;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;-webkit-mask-size:20px;mask-size:20px}',
    '.popups-icon--preview-generic{-webkit-mask-image:' + SAD_FACE_ICON + ';mask-image:' + SAD_FACE_ICON + ';background-color:#202122}',
    '.popups-icon--preview-disambiguation{-webkit-mask-image:' + DISAMBIGUATION_ICON + ';mask-image:' + DISAMBIGUATION_ICON + ';background-color:#202122}',
  ].join('\n')

  function injectStyle() {
    var style = document.createElement('style')
    // Wikilinks get a dotted underline so they read
    // differently from the page's own links. Override any of this in your CSS.
    style.textContent = [
      // Dot size follows line thickness, so a thinner line means more, smaller dots.
      // A set thickness also moves the line up to the baseline, so push it back
      // down to sit centred on where a normal (auto) underline would be.
      'a.wikilink { color: #36c; text-decoration-style: dotted; text-decoration-thickness: 1.5px; text-underline-offset: calc(0.09em - 0.75px); }',
      'a.wikilink:hover { text-decoration-style: solid; }',
      'a.wikilink.new { color: #d73333; }',
      'a.wikilink.new:visited { color: #a55858; }',
    ].join('\n')
    // First in <head>, so the page's own a.wikilink rules win without extra specificity.
    document.head.insertBefore(style, document.head.firstChild)
  }

  function start() {
    if (!has('data-no-style')) injectStyle()
    convert(document.body)
    if (!has('data-no-previews')) initPreviews()
  }

  window.Wikilink = { convert: convert }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start)
  else start()
})()
