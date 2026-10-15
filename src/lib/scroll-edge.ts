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

/**
 * Sets or clears the cue on one element now, rather than at its next scroll
 * event. For a scroller moved by script in step with another: SideBySideDiff
 * moves one pane as the other scrolls, and the moved pane's own event comes a
 * frame later, so at the end of a line its cue came off a frame after its
 * partner's. The cue's border gives back 2px as it comes off, so for that
 * frame the two panes rested 2px apart.
 */
export function measureScrollEdge(el: HTMLElement) {
  const more = el.scrollWidth - el.clientWidth - Math.abs(el.scrollLeft) > 1
  if (more) el.dataset.overflowEnd = ''
  else delete el.dataset.overflowEnd
}

function trackScrollEdge(el: HTMLElement | null) {
  if (!el) return undefined
  el.dataset.scrollEdge = ''
  const measure = () => measureScrollEdge(el)
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
  // Text can also widen inside boxes that keep their size: a code block held
  // at a max height kept its frame and its <pre> when spacious density grew
  // the type, so neither observer fired and the cue stayed off on JSON that
  // now scrolled (#130). Density changes and late fonts re-measure too.
  // Density is an attribute on any element, so the whole document is
  // watched, for that one attribute only.
  const density =
    typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(measure)
  density?.observe(el.ownerDocument.documentElement, { attributes: true, attributeFilter: ['data-density'], subtree: true })
  const fonts = el.ownerDocument.fonts as FontFaceSet | undefined
  fonts?.addEventListener?.('loadingdone', measure)
  return () => {
    el.removeEventListener('scroll', measure)
    observer?.disconnect()
    mutations?.disconnect()
    density?.disconnect()
    fonts?.removeEventListener?.('loadingdone', measure)
  }
}
