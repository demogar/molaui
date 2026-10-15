/**
 * Keeps `data-overflow-end` on a sideways-scrolling element while there is
 * more past its trailing edge, for the `scroll-edge` utility to draw its cue
 * from. Also marks the element `data-scroll-edge`, so the browser audit can
 * tell a region meant to scroll from a layout that overflows by accident.
 *
 *   <div ref={useScrollEdge()} className="overflow-x-auto scroll-edge">…</div>
 *
 * "Trailing" follows the writing direction: in right-to-left, `scrollLeft`
 * runs from 0 down to a negative maximum, so the distance travelled is its
 * absolute value either way.
 *
 * It returns a callback ref (with React 19's ref cleanup) rather than taking
 * a ref object, so it follows an element that mounts later, as a table's bulk
 * bar does when a row is selected; an effect keyed on a ref object runs once
 * and never sees it.
 *
 * A scroll-driven CSS animation was tried first, because it needs no
 * JavaScript at all. It drew the cue in the browser and nowhere else: the
 * visual tests screenshot with animations finished, which jumps a scroll
 * timeline to its end, where the cue is off, so the gate could never see it;
 * and as a background on the scroller it was painted under the sticky
 * header's ground. An attribute set from a scroll listener has neither
 * problem, and works in every browser.
 */
export function useScrollEdge<T extends HTMLElement = HTMLElement>(): (el: T | null) => (() => void) | undefined {
  return trackScrollEdge
}

function trackScrollEdge(el: HTMLElement | null) {
  if (!el) return undefined
  el.dataset.scrollEdge = ''
  const measure = () => {
    const more = el.scrollWidth - el.clientWidth - Math.abs(el.scrollLeft) > 1
    if (more) el.dataset.overflowEnd = ''
    else delete el.dataset.overflowEnd
  }
  measure()
  el.addEventListener('scroll', measure, { passive: true })
  // The content can grow (rows arrive, a tab is added) without the frame
  // changing size, so its children are observed too.
  const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure)
  observer?.observe(el)
  for (const child of el.children) observer?.observe(child)
  // A ResizeObserver never fires for an inline box, and streamed code grows
  // inside an inline <code>: the cue stayed off on a code block that had
  // come to overflow. Text arriving is re-measured too.
  const mutations = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(measure)
  mutations?.observe(el, { childList: true, characterData: true, subtree: true })
  return () => {
    el.removeEventListener('scroll', measure)
    observer?.disconnect()
    mutations?.disconnect()
  }
}
