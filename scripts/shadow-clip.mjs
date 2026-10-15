// Clipped edges, for the browser audit (scripts/audit.mjs).
//
// The cut keyline, the revealed band and the focus ring are all outer
// `box-shadow`s, so they paint outside the element's box, and an ancestor
// with `overflow` other than visible clips them like anything else. The
// DataTable bulk bar's actions sat flush in an `overflow-x-auto` scroller: the
// first button lost its leading keyline, the last its trailing one, and the
// 6.5px focus ring was cut to a sliver. The clipped-text check could not see
// it: no text was cut, only paint.
//
// So an element's outer shadow extent (offset, blur and spread, per side) is
// measured against the padding box of its nearest clipping ancestor, on the
// axes that ancestor clips. Inset shadows paint inside the box and are
// ignored, as are fully transparent ones (Tailwind's composite leaves
// `0 0 #0000` placeholders). An element that itself reaches past the
// ancestor's box has been scrolled or cut on purpose (a table row under its
// frame's edge), and is skipped: what is cut there is the element, not its
// edge.

/** Runs in the page: installs `window.__shadowClip(el)`. */
export function installShadowClip() {
  const split = (list) => {
    const parts = []
    let depth = 0
    let start = 0
    for (let i = 0; i < list.length; i++) {
      if (list[i] === '(') depth++
      else if (list[i] === ')') depth--
      else if (list[i] === ',' && depth === 0) {
        parts.push(list.slice(start, i))
        start = i + 1
      }
    }
    parts.push(list.slice(start))
    return parts.map((p) => p.trim()).filter(Boolean)
  }
  // How far the element's outer shadows reach past its box on each side.
  const reach = (el) => {
    const shadow = getComputedStyle(el).boxShadow
    if (!shadow || shadow === 'none') return null
    const out = { left: 0, top: 0, right: 0, bottom: 0 }
    let any = false
    for (const part of split(shadow)) {
      if (/\binset\b/.test(part)) continue
      const color = part.match(/[a-z-]+\([^)]*\)/)?.[0] ?? ''
      if (/(?:,\s*0|\/\s*0)\)$/.test(color)) continue
      const [x = 0, y = 0, blur = 0, spread = 0] = part
        .replace(color, '')
        .trim()
        .split(/\s+/)
        .map((n) => Number.parseFloat(n))
        .filter((n) => !Number.isNaN(n))
      const grow = blur + spread
      if (grow <= 0 && x === 0 && y === 0) continue
      any = true
      out.left = Math.max(out.left, grow - x)
      out.right = Math.max(out.right, grow + x)
      out.top = Math.max(out.top, grow - y)
      out.bottom = Math.max(out.bottom, grow + y)
    }
    return any ? out : null
  }
  window.__shadowClip = (el) => {
    const r = reach(el)
    if (!r || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return null
    let a = el.parentElement
    let s
    for (; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
      s = getComputedStyle(a)
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') break
    }
    if (!a || a === document.body || a === document.documentElement) return null
    const box = a.getBoundingClientRect()
    let left = box.left + a.clientLeft
    let top = box.top + a.clientTop
    let right = left + a.clientWidth
    let bottom = top + a.clientHeight
    const e = el.getBoundingClientRect()
    // Scrolled or cut on purpose: the element itself is not inside.
    if (e.left < left - 0.5 || e.right > right + 0.5 || e.top < top - 0.5 || e.bottom > bottom + 0.5) return null
    // On an axis that scrolls, the edge is cut only if no scroll position
    // shows it: measured against the whole scrolled area, not the view. Tab
    // scrolls a stop flush to the view's edge, and a ring there is a scroll
    // away from whole, unless the content ends there too.
    if (/auto|scroll/.test(s.overflowX) && a.scrollWidth > a.clientWidth) {
      const rtl = s.direction === 'rtl'
      const before = Math.abs(a.scrollLeft)
      const after = a.scrollWidth - a.clientWidth - before
      left -= rtl ? after : before
      right += rtl ? before : after
    }
    if (/auto|scroll/.test(s.overflowY) && a.scrollHeight > a.clientHeight) {
      top -= a.scrollTop
      bottom += a.scrollHeight - a.clientHeight - a.scrollTop
    }
    const x = s.overflowX !== 'visible'
    const y = s.overflowY !== 'visible'
    const by = Math.max(
      x ? left - (e.left - r.left) : 0,
      x ? e.right + r.right - right : 0,
      y ? top - (e.top - r.top) : 0,
      y ? e.bottom + r.bottom - bottom : 0,
    )
    return by > 0.75 ? { by: Math.round(by * 10) / 10, ancestor: a } : null
  }
}

/** Runs in the page: every element with an outer shadow cut by its clipping ancestor, at rest. */
export function restingShadowClips() {
  const roots = [document.getElementById('storybook-root'), ...document.querySelectorAll('body > [data-base-ui-portal]')].filter(Boolean)
  const name = (el) => {
    const slot = el.closest('[data-slot]')?.getAttribute('data-slot')
    const text = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)
    return `${el.tagName.toLowerCase()}${slot ? ` in ${slot}` : ''}${text ? ` "${text}"` : ''}`
  }
  const found = []
  const seen = new Set()
  for (const root of roots) {
    for (const el of root.querySelectorAll('*')) {
      const clip = window.__shadowClip(el)
      if (!clip || seen.has(clip.ancestor)) continue
      seen.add(clip.ancestor)
      found.push(`keyline clipped by ${clip.by}px: ${name(el)} inside ${name(clip.ancestor)}`)
      if (found.length >= 6) return found
    }
  }
  return found
}
