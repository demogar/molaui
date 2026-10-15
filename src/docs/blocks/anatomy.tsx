import { Story, useOf } from '@storybook/addon-docs/blocks'
import * as React from 'react'
import { storyNameFromExport } from 'storybook/internal/csf'

import { Code } from '../../components/code'
import { cn } from '../../lib/cn'
import clothCss from '../../styles/cloth.css?raw'
import themeCss from '../../styles/theme.css?raw'
import { type Anatomy, anatomyRoot, partElement, pinnedParts, ROOT_PART } from '../usage/anatomy'
import { storyId } from '../usage/links'
import type { PageData } from '../usage/contract'
import { utilityReader } from './anatomy-utilities'

const { partUtilities } = utilityReader(clothCss, themeCss)

/**
 * The Anatomy section: the real component, with a numbered pin on each part,
 * and a legend that names the part, says what it does and lists the system
 * classes it is made of.
 *
 * ── measured, not drawn ──
 * A hand-drawn anatomy (a Figma frame, an SVG with coordinates) is right on
 * the day it is drawn and wrong the first time a part moves. Here the story is
 * rendered through Storybook, with the page's theme and density, and every pin
 * is placed by measuring the element marked `data-part` after it renders. The
 * observers re-measure when the story resizes, re-renders or its fonts load,
 * so a streaming or ticking example keeps its pins. The class list in the
 * legend is read from the same elements at the same moment.
 *
 * ── the legend is the content ──
 * The pins are a picture of the legend, so the whole overlay is aria-hidden.
 * The legend is an ordered list whose numbers match the pins; a pin is a
 * number in an ink square with a gold reveal, never a colour to decode. A part
 * that the example does not show at the current width is listed, and says so,
 * instead of pinning an empty box. A part that only another state shows (an
 * error, a running call) is listed after the numbered ones, unpinned, with a
 * link to the example that has it.
 *
 * The overlay copies `data-theme` and `data-density` from the story frame,
 * because the decorator sets them on the frame, inside this block: without
 * them the pins would stay light-theme ink on a dark example. It also sets
 * `bg-transparent`, because base.css paints every `[data-theme]` element with
 * cloth, which would cover the example it is meant to annotate.
 */

interface Pin {
  n: number
  part: string
  /** Where the pin goes, relative to the diagram box. */
  x: number
  y: number
  /** The part's own box, for its outline. */
  box: { left: number; top: number; width: number; height: number }
}

interface Layout {
  pins: Pin[]
  /** Part -> system classes, read from the live element. */
  utilities: Record<string, string[]>
  /** Parts with no box in this render (hidden at this width, or not rendered yet). */
  hidden: string[]
  theme?: string
  density?: string
}

const PIN = 22
/** How far a pin overlaps the corner it marks. */
const TUCK = 5
/** The width of the gold reveal and keyline around a pin. */
const RING = 5

/** `display: contents` has no box of its own; use its children's. */
function rectOf(el: Element): DOMRect {
  const own = el.getBoundingClientRect()
  if (own.width || own.height) return own
  const kids = [...el.children].map((child) => child.getBoundingClientRect()).filter((r) => r.width || r.height)
  if (!kids.length) return own
  const left = Math.min(...kids.map((r) => r.left))
  const top = Math.min(...kids.map((r) => r.top))
  return new DOMRect(left, top, Math.max(...kids.map((r) => r.right)) - left, Math.max(...kids.map((r) => r.bottom)) - top)
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

function overlap(a: Box, b: Box) {
  const w = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left)
  const h = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top)
  return w > 0 && h > 0 ? w * h : 0
}

/**
 * Where a pin goes. A pin covers something wherever it sits, so the question
 * is what it covers. Centred on the part's corner, it covered the first
 * letters of every label it named; always outside the corner, it covered the
 * icon or the line before. So each pin tries a few spots around its part's
 * leading top corner (diagonally outside, beside it, above or below it, just
 * inside) and takes the one that covers the least: pins already placed count
 * most, then text and icons, then the other parts. Text is measured per line,
 * so a pin may sit in the white space beside a short label but not on it. A
 * part's ancestors do not count, because every pin sits inside the root.
 */
interface Avoid {
  /** What a reader came to see: text, icons, controls. */
  ink: Box[]
  /** The other parts, and this one. */
  parts: Box[]
  pins: Box[]
}

function placePin(r: Box, avoid: Avoid, bounds: { width: number; height: number }, rtl: boolean) {
  const lead = rtl ? r.left + r.width : r.left
  // Offsets along the reading direction, from the leading edge.
  const at = (dx: number) => (rtl ? lead - dx - PIN : lead + dx)
  const step = PIN + 4
  const above = r.top - PIN - 2
  const below = r.top + r.height + 2
  const candidates = [
    { x: at(TUCK - PIN), y: r.top - PIN + TUCK },
    { x: at(-PIN - 2), y: r.top },
    { x: at(0), y: above },
    { x: at(step), y: above },
    { x: at(2), y: r.top + 2 },
    { x: at(2 * step), y: above },
    // Below only a short part: under a tall one the pin is nowhere near the corner it names.
    ...(r.height <= 2 * PIN ? [{ x: at(0), y: below }, { x: at(step), y: below }] : []),
  ].map(({ x, y }) => ({
    // The gold reveal draws outside the square, so keep a few pixels clear of the clipped edge.
    left: Math.min(Math.max(x, RING), bounds.width - PIN - RING),
    top: Math.min(Math.max(y, RING), bounds.height - PIN - RING),
    width: PIN,
    height: PIN,
  }))
  const sum = (boxes: Box[], c: Box) => boxes.reduce((total, b) => total + overlap(c, b), 0)
  const cost = (c: Box) => sum(avoid.ink, c) * 4 + sum(avoid.pins, c) * 20 + sum(avoid.parts, c) + overlap(c, r)
  return candidates.reduce((best, c) => (cost(c) < cost(best) ? c : best))
}

/** The boxes of every line of text and every icon or control in the example. */
function inkBoxes(root: HTMLElement, origin: DOMRect): Box[] {
  const boxes: Box[] = []
  const add = (r: DOMRect) => {
    if (r.width && r.height) boxes.push({ left: r.left - origin.left, top: r.top - origin.top, width: r.width, height: r.height })
  }
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.textContent?.trim()) continue
    range.selectNodeContents(node)
    for (const r of range.getClientRects()) add(r)
  }
  for (const el of root.querySelectorAll('svg, input, textarea, select, img, button')) add(el.getBoundingClientRect())
  return boxes
}

function measure(box: HTMLElement, stage: HTMLElement, anatomy: Anatomy): Layout | null {
  const root = anatomyRoot(stage, anatomy)
  if (!root) return null
  const origin = box.getBoundingClientRect()
  const rtl = getComputedStyle(root).direction === 'rtl'
  const themed = stage.querySelector<HTMLElement>('[data-theme]')
  const utilities: Record<string, string[]> = {}
  const hidden: string[] = []
  const found: { n: number; part: string; el: HTMLElement; box: Box }[] = []
  pinnedParts(anatomy).forEach(({ part, nth }, i) => {
    const el = partElement(root, part, nth)
    if (!el) {
      hidden.push(part)
      return
    }
    utilities[part] = partUtilities(el, part !== ROOT_PART)
    const r = rectOf(el)
    if (!r.width && !r.height) {
      hidden.push(part)
      return
    }
    found.push({ n: i + 1, part, el, box: { left: r.left - origin.left, top: r.top - origin.top, width: r.width, height: r.height } })
  })
  // The whole example, not only the root: a pin must not land on the next instance either.
  const ink = inkBoxes(stage, origin)
  const pins: Pin[] = []
  for (const f of found) {
    const parts = found.filter((o) => o !== f && !o.el.contains(f.el)).map((o) => o.box)
    const placed = pins.map((p) => ({ left: p.x, top: p.y, width: PIN, height: PIN }))
    const spot = placePin(f.box, { ink, parts, pins: placed }, origin, rtl)
    pins.push({ n: f.n, part: f.part, x: spot.left, y: spot.top, box: f.box })
  }
  return { pins, utilities, hidden, theme: themed?.dataset.theme, density: themed?.dataset.density }
}

function useMeasuredLayout(anatomy: Anatomy) {
  const boxRef = React.useRef<HTMLDivElement>(null)
  const stageRef = React.useRef<HTMLDivElement>(null)
  const [layout, setLayout] = React.useState<Layout | null>(null)

  React.useEffect(() => {
    const box = boxRef.current
    const stage = stageRef.current
    if (!box || !stage) return
    let frame = 0
    let last = ''
    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const next = measure(box, stage, anatomy)
        const key = JSON.stringify(next)
        if (key !== last) {
          last = key
          setLayout(next)
        }
      })
    }
    // Only the stage is observed: the overlay is a sibling, so drawing the
    // pins never triggers another measurement.
    const resize = new ResizeObserver(run)
    resize.observe(stage)
    const mutations = new MutationObserver(run)
    mutations.observe(stage, { subtree: true, childList: true, attributes: true, characterData: true })
    window.addEventListener('resize', run)
    void document.fonts?.ready.then(run)
    run()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener('resize', run)
    }
  }, [anatomy])

  return { boxRef, stageRef, layout }
}

/** The number, in the same cut square on the diagram and in the legend. */
function PinMark({ n, className }: { n: number; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-[22px] shrink-0 place-items-center bg-ink font-ui text-2xs leading-none font-bold tabular-nums text-on-ink',
        'band-oro cut-band [--cut-reveal:2px]',
        className,
      )}
    >
      {n}
    </span>
  )
}

export function AnatomySection({ page }: { page: PageData }) {
  const of = useOf('meta')
  const anatomy = page.anatomy
  const story = anatomy && of.type === 'meta' ? of.csfFile.moduleExports[anatomy.story] : undefined
  if (!anatomy || !story) return null
  return <AnatomyContent anatomy={anatomy} story={story} title={page.title} />
}

function AnatomyContent({ anatomy, story, title }: { anatomy: Anatomy; story: unknown; title: string }) {
  const { boxRef, stageRef, layout } = useMeasuredLayout(anatomy)
  return (
    <section data-anatomy className="sb-unstyled not-prose my-10 grid grid-cols-[minmax(0,1fr)] gap-4 font-ui text-sm text-ink">
      <h2 className="m-0 text-xl font-bold text-ink">Anatomy</h2>
      <p className="m-0 max-w-reading text-ink-2">
        Measured from the live example: each pin sits on the element marked <Code>data-part</Code>, so the diagram
        moves when the component does. The classes under each part are read from the same elements.
      </p>
      <div ref={boxRef} className="relative min-w-0">
        <div ref={stageRef}>
          <Story of={story as never} />
        </div>
        {layout ? <Pins layout={layout} /> : null}
      </div>
      <Legend anatomy={anatomy} layout={layout} title={title} />
    </section>
  )
}

function Pins({ layout }: { layout: Layout }) {
  return (
    <div
      aria-hidden
      data-anatomy-pins
      data-theme={layout.theme}
      data-density={layout.density}
      className="pointer-events-none absolute inset-0 overflow-hidden bg-transparent"
    >
      {layout.pins
        .filter((pin) => pin.part !== ROOT_PART)
        .map((pin) => (
          <span
            key={`box-${pin.part}`}
            className="absolute outline-1 outline-offset-1 outline-ink-muted outline-dashed"
            style={{ left: pin.box.left, top: pin.box.top, width: pin.box.width, height: pin.box.height }}
          />
        ))}
      {/* Physical left: x and y were measured in viewport pixels, in either direction. */}
      {layout.pins.map((pin) => (
        <span key={pin.part} className="absolute" style={{ left: pin.x, top: pin.y }}>
          <PinMark n={pin.n} />
        </span>
      ))}
    </div>
  )
}

function PartName({ anatomy, part, name }: { anatomy: Anatomy; part: string; name: string }) {
  return (
    <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-semibold text-ink">{name}</span>
      <Code>{part === ROOT_PART ? `data-slot="${anatomy.slot}"` : `data-part="${part}"`}</Code>
    </p>
  )
}

function Legend({ anatomy, layout, title }: { anatomy: Anatomy; layout: Layout | null; title: string }) {
  const pinned = pinnedParts(anatomy)
  const others = anatomy.parts.filter((p) => !pinned.includes(p))
  return (
    <>
      <ol className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-2">
        {pinned.map(({ part, name, does }, i) => {
          const utilities = layout?.utilities[part] ?? []
          return (
            <li key={part} className="flex gap-3 py-3 rule-b">
              <PinMark n={i + 1} className="ms-1 mt-0.5" />
              <div className="grid min-w-0 content-start gap-1">
                <PartName anatomy={anatomy} part={part} name={name} />
                <p className="m-0 text-ink-2">{does}</p>
                {layout?.hidden.includes(part) ? <p className="m-0 text-ink-muted">Not shown at this width.</p> : null}
                {utilities.length ? (
                  <p className="m-0 flex flex-wrap gap-1.5 [overflow-wrap:anywhere]">
                    <span className="sr-only">Made of:</span>
                    {utilities.map((cls) => (
                      <Code key={cls}>{cls}</Code>
                    ))}
                  </p>
                ) : null}
              </div>
            </li>
          )
        })}
      </ol>
      {others.length ? (
        <div className="grid gap-2">
          <p className="m-0 rotulo text-ink-muted">In other states</p>
          <ul className="m-0 grid list-none gap-x-8 p-0 md:grid-cols-2">
            {others.map(({ part, name, does, story }) => (
              <li key={part} className="grid min-w-0 content-start gap-1 py-3 rule-b">
                <PartName anatomy={anatomy} part={part} name={name} />
                <p className="m-0 text-ink-2">
                  {does}{' '}
                  <a href={`?path=/story/${storyId(title, story!)}`} target="_top" className="text-ink underline underline-offset-2">
                    See it in {storyNameFromExport(story!)}
                  </a>
                  .
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  )
}
