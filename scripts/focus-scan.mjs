// Focus visibility, for the browser audit (scripts/audit.mjs).
//
// Tabs through a rendered story and, for every stop, compares the computed
// paint of the focused element with the same element once focus has moved on.
// A stop whose focused and unfocused paint are identical has no visible focus
// indicator (WCAG 2.4.7), and is reported.
//
// Why it exists: focus, the cut keyline and the state variants all draw with
// `box-shadow`, so whichever rule wins the cascade replaces the others. The
// base layer's `:focus-visible` ring lost to `shadow-cut` and to state
// variants (`data-disabled`, `data-active`, `aria-current`) on about a dozen
// elements, and nothing noticed: axe does not look at focus, and every unit
// test passed because focus *moved* correctly — it just could not be seen.
//
// Why computed styles and not screenshots: the audit visits about a thousand
// pages per run and a story can have dozens of stops; two element screenshots
// per stop would roughly double the audit. Comparing a handful of computed
// properties costs a few milliseconds per stop. The audit's own finding was a
// computed box-shadow identical before and after focus, so that is what this
// measures.
//
// What counts as "the indicator": the element itself, its ::before/::after,
// and its three nearest ancestors. Ancestors because several controls focus a
// visually hidden input and draw the ring on the wrapper (`focus-within`,
// `has-focus-visible`) — a field, a slider thumb, a switch.

// The busiest story (the app shell) has 64 stops; the cap only stops a page
// that keeps generating focusable elements from holding a worker forever.
const MAX_STOPS = 150

/** Runs in the page: the paint of one element that focus could change. */
function installProbe() {
  // Only what would actually paint differently: an outline or a border
  // colour counts only where there is an outline or a border to colour
  // (Chromium reports `outline-width: 1px` on a focused link whose outline
  // style is `none`, which is no indicator at all).
  const paint = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo)
    if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return ''
    const outline =
      cs.outlineStyle === 'none' || cs.outlineWidth === '0px'
        ? 'none'
        : `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor} ${cs.outlineOffset}`
    const borders = ['Top', 'Right', 'Bottom', 'Left']
      .map((side) =>
        cs[`border${side}Style`] === 'none' || cs[`border${side}Width`] === '0px' ? '-' : cs[`border${side}Color`],
      )
      .join(' ')
    return [cs.boxShadow, outline, borders, cs.backgroundColor, cs.color, cs.textDecorationLine].join('|')
  }
  const snapshot = (el) => {
    const parts = []
    for (let node = el, depth = 0; node && node.nodeType === 1 && depth < 4; node = node.parentElement, depth++) {
      parts.push(paint(node), paint(node, '::before'), paint(node, '::after'))
    }
    return parts.join('\n')
  }
  const describe = (el) => {
    const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40)
    const role = el.getAttribute('role') || el.tagName.toLowerCase()
    const slot = el.closest('[data-slot]')?.getAttribute('data-slot')
    return `${role}${slot ? ` in ${slot}` : ''}${name ? ` "${name}"` : ''}`
  }
  window.__focusScan = { snapshot, describe, prev: null, seen: new Set() }
}

/**
 * Runs in the page after each Tab: settles the previous stop (unfocused now)
 * and records the current one (focused). Returns whether to keep going.
 * `last` settles the final stop without recording another.
 */
function step(last) {
  const s = window.__focusScan
  const found = []
  if (s.prev) {
    // Tab from the last stop of a page, or from the only stop in a focus
    // trap, can leave focus where it was; take it away to see the rest state.
    if (s.prev.el === document.activeElement) s.prev.el.blur()
    if (s.prev.el.isConnected && s.snapshot(s.prev.el) === s.prev.focused) found.push(s.prev.label)
    s.prev = null
  }
  const el = document.activeElement
  if (last || !el || el === document.body || el === document.documentElement) return { found, more: false }
  // A focus trap (an open dialog, a menu) cycles; once round is enough.
  if (s.seen.has(el)) return { found, more: false }
  s.seen.add(el)
  // Base UI's focus guards hand focus straight on; they are never painted.
  if (!el.hasAttribute('data-base-ui-focus-guard') && el.matches(':focus-visible'))
    s.prev = { el, focused: s.snapshot(el), label: s.describe(el) }
  return { found, more: true }
}

/** Returns one finding per focusable element whose focus cannot be seen. */
export async function focusScan(page) {
  // Transitions would make "focused" a mid-ease value that may still equal
  // the resting one. The scan is about the end state.
  await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; }' })
  await page.evaluate(installProbe)
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  const blind = []
  for (let i = 0; i <= MAX_STOPS; i++) {
    await page.keyboard.press('Tab')
    const { found, more } = await page.evaluate(step, i === MAX_STOPS)
    blind.push(...found)
    if (!more) break
  }
  // Leave nothing focused (an open tooltip, a scrolled list) for the checks
  // that run after this one.
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  })
  return blind.map((label) => `focus not visible: ${label}`)
}
