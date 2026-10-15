// Anatomy pins, for the browser audit (scripts/audit.mjs).
//
// A component docs page with an Anatomy section (src/docs/blocks/anatomy.tsx)
// pins a number on each part of a live example. The pins are placed by
// measuring the page, so only a real browser can say where they landed. This
// reports, per diagram:
//
//   - two pins that overlap: the reader cannot tell which number is which.
//     The Banner diagram stacked pin 4 on pin 2 and piled the rest along its
//     top edge, because the placement only penalised a collision and a
//     full-bleed strip left it nowhere better to go;
//   - a pin outside the diagram box: the overlay clips, so it is cut or gone.
//
// A pin is the number square (PinMark) inside its positioned span; the part
// outlines are childless spans beside them.
// A pin is measured with what it paints outside its square (the keyline,
// gold reveal and keyline of `cut-band`, all box-shadow spread), read from
// its computed style, because two rings that cross read as one shape.
//
// It runs on docs pages, in both themes, at the wide audit width and again at
// 390px: the diagram re-measures on resize, and a phone is where the room
// runs out.

/** Runs in the page: resolves once every diagram has drawn its pins and they have stopped moving. */
async function settle() {
  const frames = (n) => new Promise((resolve) => {
    const tick = () => (n-- <= 0 ? resolve() : requestAnimationFrame(tick))
    tick()
  })
  const snapshot = () =>
    [...document.querySelectorAll('[data-anatomy-pins] > span > span')].map((el) => {
      const r = el.getBoundingClientRect()
      return `${r.left},${r.top}`
    }).join(';')
  const deadline = Date.now() + 5_000
  let last = null
  while (Date.now() < deadline) {
    await frames(3)
    const ready = [...document.querySelectorAll('[data-anatomy]')].every((s) => s.querySelector('[data-anatomy-pins]'))
    const now = snapshot()
    if (ready && now === last) return 'settled'
    last = now
  }
  // A diagram that never draws its overlay could not find its component:
  // the notification centre's example rendered in an iframe, out of reach.
  return [...document.querySelectorAll('[data-anatomy]')].every((s) => s.querySelector('[data-anatomy-pins]')) ? 'moving' : 'none'
}

/** Runs in the page: one finding per overlapping pair and per pin outside its diagram. */
function check() {
  // How far an element's box-shadows paint outside its border box.
  const extent = (el) => {
    let most = 0
    for (const m of getComputedStyle(el).boxShadow.matchAll(/(-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px (-?[\d.]+)px(?! inset)/g)) {
      const [x, y, blur, spread] = m.slice(1).map(Number)
      most = Math.max(most, spread + blur + Math.max(Math.abs(x), Math.abs(y)))
    }
    return most
  }
  const found = []
  const sections = [...document.querySelectorAll('[data-anatomy]')]
  for (const section of sections) {
    const overlay = section.querySelector('[data-anatomy-pins]')
    if (!overlay) {
      found.push('anatomy: no pins drawn')
      continue
    }
    const frame = overlay.getBoundingClientRect()
    const pins = [...overlay.querySelectorAll(':scope > span > span')].map((el) => {
      const r = el.getBoundingClientRect()
      const reveal = extent(el)
      return {
        n: el.textContent.trim(),
        left: r.left - reveal,
        top: r.top - reveal,
        right: r.right + reveal,
        bottom: r.bottom + reveal,
      }
    })
    for (const p of pins) {
      // Half a pixel of slack for sub-pixel layout.
      if (p.left < frame.left - 0.5 || p.top < frame.top - 0.5 || p.right > frame.right + 0.5 || p.bottom > frame.bottom + 0.5)
        found.push(`anatomy: pin ${p.n} is outside the diagram`)
    }
    for (let i = 0; i < pins.length; i++) {
      for (let j = i + 1; j < pins.length; j++) {
        const a = pins[i]
        const b = pins[j]
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (w > 0.5 && h > 0.5) found.push(`anatomy: pins ${a.n} and ${b.n} overlap`)
      }
    }
  }
  return found
}

/** Whether the page has an Anatomy section at all; the others skip the scan and its resize. */
export const hasAnatomy = (page) => page.evaluate(() => !!document.querySelector('[data-anatomy]'))

/** Returns one finding per overlapping pair of pins and per pin outside its diagram, at the current viewport. */
export async function anatomyScan(page) {
  if (!(await hasAnatomy(page))) return []
  const state = await page.evaluate(settle)
  if (state === 'none') return ['anatomy: no pins drawn (the example is not in this document?)']
  if (state === 'moving') return ['anatomy: pins did not settle within 5s']
  return page.evaluate(check)
}
