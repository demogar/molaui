// Target size, for the browser audit (scripts/audit.mjs).
//
// WCAG 2.2 SC 2.5.8 (AA): every pointer target is at least 24 by 24 CSS px,
// or is far enough from every other target that a 24px circle centred on it
// touches none of them (the spacing exception), or sits in a line of text
// (the inline exception).
//
// Why it exists: the audit of 2026-10-14 measured 4,101 targets at three
// densities and found table checkboxes at 16px, the compact combobox's two
// end buttons at 21px and touching, and chip remove buttons at 20px. axe has
// a `target-size` rule, but it is off by default, it does not know a density
// attribute exists, and it does not count a wrapping <label> as the target of
// the control inside it — which is how every Checkbox and Radio here meets
// the size (the 16px box is inside a label the width of its text).
//
// It runs at compact density, the smallest: a target that clears 24px there
// clears it at comfortable and spacious, whose control heights only grow.
// Density is a document attribute (docs/adr), so the page is re-measured by
// setting it, without a reload.

const MIN = 24

/** Runs in the page: every undersized target that no exception covers. */
function measure(min) {
  const SELECTOR = [
    'a[href]',
    'button',
    'input:not([type="hidden"])',
    'select',
    'textarea',
    'summary',
    '[role="button"]',
    '[role="link"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',')

  const visible = (el) => {
    if (el.closest('[aria-hidden="true"], [inert], [data-base-ui-focus-guard]')) return false
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false
    // Clipped away (`sr-only`, a skip link until it is focused): not a target.
    if (cs.clipPath === 'inset(50%)' || cs.clip === 'rect(0px, 0px, 0px, 0px)') return false
    const r = el.getBoundingClientRect()
    // Visually hidden (the clip pattern): the control's label is the target.
    return r.width > 1 && r.height > 1
  }

  // A control inside a <label> is hit anywhere on the label, so the label's
  // box is the target when it is larger.
  // The same for a segment of a date or time field (a spinbutton in a
  // `role="group"` box): pressing anywhere in the box focuses a segment, as
  // pressing a native input's padding would, so the box is the target.
  const box = (el) => {
    const label = el.closest('label') ?? (el.getAttribute('role') === 'spinbutton' ? el.closest('[role="group"]') : null)
    const own = el.getBoundingClientRect()
    if (!label || label === el) return own
    const l = label.getBoundingClientRect()
    return l.width * l.height > own.width * own.height ? l : own
  }

  // The inline exception: a link set in running text, whose height is the
  // line's.
  const inline = (el) => {
    if (getComputedStyle(el).display !== 'inline') return false
    const parent = el.parentElement
    return Boolean(parent && (parent.textContent ?? '').trim().length > (el.textContent ?? '').trim().length)
  }

  const targets = [...document.querySelectorAll(SELECTOR)].filter(visible)
  // A focusable element nested in another target (a button inside a focusable
  // row) is measured on its own; the outer one is not a competitor for it.
  const rects = targets.map((el) => ({ el, r: box(el) }))
  const small = rects.filter(({ el, r }) => (r.width < min - 0.5 || r.height < min - 0.5) && !inline(el))

  const intersectsCircle = (cx, cy, rad, r) => {
    const nx = Math.max(r.left, Math.min(cx, r.right))
    const ny = Math.max(r.top, Math.min(cy, r.bottom))
    return (nx - cx) ** 2 + (ny - cy) ** 2 < rad ** 2
  }

  const describe = (el) => {
    const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 40)
    const role = el.getAttribute('role') || el.tagName.toLowerCase()
    const slot = el.closest('[data-slot]')?.getAttribute('data-slot')
    return `${role}${slot ? ` in ${slot}` : ''}${name ? ` "${name}"` : ''}`
  }

  const found = []
  for (const s of small) {
    const cx = (s.r.left + s.r.right) / 2
    const cy = (s.r.top + s.r.bottom) / 2
    const rad = min / 2
    const crowded = rects.some((o) => {
      if (o.el === s.el || o.el.contains(s.el) || s.el.contains(o.el)) return false
      if (o.r === s.r) return false
      if (intersectsCircle(cx, cy, rad, o.r)) return true
      // Two undersized targets' circles must not overlap either.
      const isSmall = small.some((x) => x.el === o.el)
      if (!isSmall) return false
      const ox = (o.r.left + o.r.right) / 2
      const oy = (o.r.top + o.r.bottom) / 2
      return (ox - cx) ** 2 + (oy - cy) ** 2 < min ** 2
    })
    if (crowded) found.push(`${describe(s.el)} is ${Math.round(s.r.width)}×${Math.round(s.r.height)}`)
  }
  return [...new Set(found)]
}

/** Measures the open page at compact density; returns findings. */
export async function targetSize(page) {
  const found = await page
    .evaluate(
      async ({ min, source }) => {
        // The decorator sets the attribute on <html> and on the story's own
        // wrapper, so every carrier is switched, and restored afterwards.
        const carriers = [document.documentElement, ...document.querySelectorAll('body [data-density]')]
        const before = carriers.map((el) => el.getAttribute('data-density'))
        for (const el of carriers) el.setAttribute('data-density', 'compact')
        for (let i = 0; i < 2; i++) await new Promise((resolve) => requestAnimationFrame(resolve))
        try {
          return new Function(`return (${source})`)()(min)
        } finally {
          carriers.forEach((el, i) =>
            before[i] === null ? el.removeAttribute('data-density') : el.setAttribute('data-density', before[i]),
          )
        }
      },
      { min: MIN, source: measure.toString() },
    )
    .catch(() => null)
  if (found === null) return ['[target size] could not measure the page']
  return found.map((f) => `[target size, compact] ${f}: under ${MIN}×${MIN} with another target within reach`)
}
