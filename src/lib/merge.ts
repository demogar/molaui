/**
 * Mola's class merger: tailwind-merge's rules, without tailwind-merge.
 *
 * `cn()` used `extendTailwindMerge`, and on the smallest useful import
 * (`{ Button, Field }`) tailwind-merge was 28 kB of the 45 kB minified, 63 per
 * cent of what a consumer paid before writing a line. Nearly all of it is the
 * default config: hundreds of class groups, built into a tree at runtime, so a
 * bundler cannot shake any of it out.
 *
 * The audit's first idea was to call twMerge only when a caller passes
 * `className`. That saves render time but not a byte, because the import is
 * still there, and a dynamic import cannot work: a class name is needed
 * synchronously, during render.
 *
 * What makes a smaller merger safe is that the vocabulary is closed
 * (docs/adr/0007-a-closed-bridge.md). So this file restates tailwind-merge's
 * decisions as flat data. A utility is a key (`p`, `border-x`, `grid-cols`)
 * and a value; each key lists its class groups in tailwind-merge's order, each
 * group its keywords and validators; and the loop is tailwind-merge's own:
 * right to left, a class is dropped when a kept class to its right has
 * already claimed its group, or a group that covers it (`p` covers `px`), per
 * set of variants and per `!`.
 *
 * Restating all of tailwind-merge came to 5.4 kB brotli, which saved only a
 * third. The rest of the saving comes from what merging is for here: a
 * caller's `className` overriding a component's own classes. An override can
 * only conflict with a family some component writes, so the merger knows
 * those families, completely, and the families that conflict with them. The
 * rest of Tailwind (masks, scroll snapping, backdrop filters, logical sizes…)
 * is left alone: such a class is kept, as it would be if it were not a
 * utility, and two of them passed together both survive.
 *
 * Mola's own utilities (cloth.css) are at the end of the table, each in the
 * group of what it sets: `cn('band-oro', 'band-danger')`, `cn('cut',
 * 'cut-band')` and `cn('on-ink', 'on-layer')` used to keep both classes and
 * leave the winner to the order of the stylesheet. The edge utilities are one
 * group per side, a slot each (see "edges" in cloth.css): `cut-t cut-b` adds
 * up, `rule-b cut-b` keeps the second, and since every edge writes the whole
 * `box-shadow`, an edge and a `shadow-*` replace each other.
 *
 * None of this is held by the comment. `merge.test.ts` keeps tailwind-merge as
 * a dev dependency, configured as `cn()` configured it, and on every pair of
 * utilities the source writes, and on one of every shape Tailwind compiles
 * under Mola's theme, requires the same answer; for a family left alone, it
 * requires that tailwind-merge would not have related it to a known one
 * either; and it fails if any utility the source writes is left alone.
 */

type Test = (value: string) => boolean
/** A keyword list (`'|'`-separated; a leading `|`, or `|` alone, admits the bare key) or a validator. */
type Spec = string | Test
type Group = [id: string, specs: Spec[]]

// ── validators, as tailwind-merge defines them ─────────────────────────────
const ARBITRARY = /^\[(?:(\w[\w-]*):)?(.+)\]$/i
const VARIABLE = /^\((?:(\w[\w-]*):)?(.+)\)$/i
const num: Test = (v) => !!v && !Number.isNaN(Number(v))
const arb: Test = (v) => ARBITRARY.test(v)
const vari: Test = (v) => VARIABLE.test(v)

/**
 * The validators the table below names by letter. `[labels]X` is an arbitrary
 * value (`[length:2px]`): the label decides when there is one, validator X the
 * value when not. `(labels)` is a variable (`(length:--x)`), and `(labels)*`
 * one that also matches with no label.
 */
const LETTERS: Record<string, Test> = {
  N: num,
  I: (v) => !!v && Number.isInteger(Number(v)),
  F: (v) => /^\d+(?:\.\d+)?\/\d+(?:\.\d+)?$/.test(v),
  P: (v) => v.endsWith('%') && num(v.slice(0, -1)),
  T: (v) => /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/.test(v),
  A: arb,
  V: vari,
  W: (v) => !arb(v) && !vari(v),
  '*': () => true,
  L: (v) =>
    /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/.test(v) &&
    !/^(rgba?|hsla?|hwb|(ok)?(lab|lch)|color-mix|color|light-dark)\(.+\)$/.test(v),
  S: (v) => /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/.test(v),
  G: (v) => /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/.test(v),
}

function spec(token: string): Spec {
  const labelled = /^([[(])([^\])]+)[\])](.?)$/.exec(token)
  if (!labelled) return LETTERS[token] ?? token
  const [, kind, labels, rest] = labelled
  const pattern = kind === '[' ? ARBITRARY : VARIABLE
  return (v) => {
    const m = pattern.exec(v)
    if (!m) return false
    if (m[1]) return labels!.split(',').includes(m[1])
    return kind === '[' ? !!LETTERS[rest!]?.(m[2]!) : rest === '*'
  }
}

// ── the table ──────────────────────────────────────────────────────────────
// A colour (`*`) is anything not claimed first, as in tailwind-merge: `text-ink`
// is a colour because it is not a size, an alignment or a wrap keyword. That
// is also why a new colour token needs no entry here; cn.test.ts checks that
// every token in theme.css still lands in the colour group.
const SPACE = 'V A px N'
const INSET = `F full|auto ${SPACE}`
const SIZE = `F auto|full|dvw|dvh|lvw|lvh|svw|svh|min|max|fit ${SPACE}`
const POSITION = 'center|top|bottom|left|right|top-left|left-top|top-right|right-top|bottom-right|right-bottom|bottom-left|left-bottom'
const BORDER_W = '| N (length) [length]L'
const STYLE = 'solid|dashed|dotted|double|hidden|none'
const NUM = 'N V A'
const MAIN = 'start|end|center|between|around|evenly|stretch|baseline|center-safe|end-safe'
const CROSS = 'start|end|center|stretch|center-safe|end-safe'
const SIDES = 'x y s e bs be t r b l'.split(' ')
const CORNERS = 's e t r b l ss se ee es tl tr br bl'.split(' ')
const withSides = (key: string) => [key, ...SIDES.map((s) => key + s)].join(' ')
const eachSide = (line: (side: string) => string) => SIDES.map(line).join('\n')

/**
 * One group per line, in tailwind-merge's order: `keys>group: specs`, the
 * group named after each key when there is no `>`. `=group: classes` is for
 * utilities that are one word or a fixed phrase (`block`, `sr-only`).
 */
const DEFINITIONS = `
aspect: auto|square|video F A V
=container: container
@container>container-type: |normal|size V A
=display: block inline-block inline flex inline-flex table inline-table table-caption table-cell table-column table-column-group table-footer-group table-header-group table-row-group table-row flow-root grid inline-grid contents list-item hidden
=sr: sr-only not-sr-only
=isolation: isolate isolation-auto
object>object-fit: contain|cover|fill|none|scale-down
object>object-position: ${POSITION} V A
overflow overflow-x overflow-y: auto|hidden|clip|visible|scroll
overscroll overscroll-x overscroll-y: auto|contain|none
=position: static fixed absolute relative sticky
inset inset-x inset-y inset-bs inset-be top right bottom left: ${INSET}
inset-s start>start: ${INSET}
inset-e end>end: ${INSET}
=visibility: visible invisible collapse
z: I auto V A
basis: F full|auto T ${SPACE}
flex>flex-direction: row|row-reverse|col|col-reverse
flex>flex-wrap: nowrap|wrap|wrap-reverse
flex>flex: N F auto|initial|none A
grow shrink: | ${NUM}
order: I first|last|none V A
grid-cols grid-rows: I none|subgrid V A
col>col-start-end: auto I V A
col-span>col-start-end: full I V A
row>row-start-end: auto I V A
row-span>row-start-end: full I V A
col-start col-end row-start row-end: I auto V A
gap gap-x gap-y: ${SPACE}
justify>justify-content: ${MAIN}|normal
content>align-content: normal|${MAIN}
items>align-items: ${CROSS}|baseline|baseline-last
self>align-self: auto|${CROSS}|baseline|baseline-last
place-items: ${CROSS}|baseline
${withSides('p')}: ${SPACE}
${withSides('m')}: auto ${SPACE}
space-x space-y: ${SPACE}
=space-x-reverse: space-x-reverse
=space-y-reverse: space-y-reverse
size: ${SIZE}
w: T screen ${SIZE}
min-w: T screen|none ${SIZE}
max-w: T screen|none|prose|page|wide|reading ${SIZE}
max-w-screen>max-w: T
h: screen|lh ${SIZE}
min-h max-h: screen|lh|none ${SIZE}
text>font-size: base T (length) [length]L
=font-smoothing: antialiased subpixel-antialiased
=font-style: italic not-italic
font>font-weight: thin|extralight|light|normal|medium|semibold|bold|extrabold|black (number,weight)* [number,weight]*
font>font-family: (family-name) [family-name] W
=font-family: literal
=fvn-normal: normal-nums
=fvn-ordinal: ordinal
=fvn-slashed-zero: slashed-zero
=fvn-figure: lining-nums oldstyle-nums
=fvn-spacing: proportional-nums tabular-nums tabular
=fvn-fraction: diagonal-fractions stacked-fractions
tracking: tighter|tight|normal|wide|wider|widest|display|heading|label|figures V A
line-clamp: N none V [number]N
leading: none|tight|snug|normal|relaxed|loose|reading|body|heading ${SPACE}
list>list-style-type: disc|decimal|none V A
text>text-alignment: left|center|right|justify|start|end
text>text-color: *
=text-decoration: underline overline line-through no-underline
decoration>text-decoration-style: solid|dashed|dotted|double|wavy
decoration>text-decoration-thickness: N from-font|auto V [length]L
decoration>text-decoration-color: *
underline-offset: N auto V A
=text-transform: uppercase lowercase capitalize normal-case
=text-overflow: truncate
text>text-overflow: ellipsis|clip
text>text-wrap: wrap|nowrap|balance|pretty
align>vertical-align: baseline|top|middle|bottom|text-top|text-bottom|sub|super V A
whitespace: normal|nowrap|pre|pre-line|pre-wrap|break-spaces
break: normal|words|all|keep
content: none V A
bg>bg-attachment: fixed|local|scroll
bg>bg-position: ${POSITION} (position,percentage) [position,percentage]
bg-position: V A
bg>bg-repeat: no-repeat|repeat|repeat-x|repeat-y|repeat-space|repeat-round
bg>bg-size: auto|cover|contain (length,size,bg-size) [length,size,bg-size]
bg-size: V A
bg>bg-image: none (image,url) [image,url]G
bg-linear>bg-image: to-t|to-tr|to-r|to-br|to-b|to-bl|to-l|to-tl I V A
bg-radial>bg-image: | V A
bg-conic>bg-image: | I V A
bg>bg-color: *
from>gradient-from-pos: P (length) [length]L
via>gradient-via-pos: P (length) [length]L
to>gradient-to-pos: P (length) [length]L
from>gradient-from: *
via>gradient-via: *
to>gradient-to: *
rounded ${CORNERS.map((c) => 'rounded-' + c).join(' ')}: |none|full T V A
border>border-w: ${BORDER_W}
${eachSide((s) => `border-${s}>border-w-${s}: ${BORDER_W}`)}
divide-x divide-y: ${BORDER_W}
=divide-x-reverse: divide-x-reverse
=divide-y-reverse: divide-y-reverse
border>border-style: ${STYLE}
divide>divide-style: ${STYLE}
border>border-color: *
${eachSide((s) => `border-${s}>border-color-${s}: *`)}
divide>divide-color: *
outline>outline-style: ${STYLE}
outline-offset: ${NUM}
outline>outline-w: ${BORDER_W}
outline>outline-color: *
shadow: |inner|none|cut|raised|floating|overlay T (shadow)* [shadow]S
shadow>shadow-color: *
ring>ring-w: ${BORDER_W}
ring>ring-w-inset: inset
ring>ring-color: *
inset-ring>inset-ring-w: ${BORDER_W}
inset-ring>inset-ring-color: *
opacity: ${NUM}
filter: |none V A
border>border-collapse: collapse|separate
border-spacing border-spacing-x border-spacing-y: ${SPACE}
transition: |all|colors|opacity|shadow|transform|none V A
duration: N initial V A
ease: linear|initial|in|out|in-out|cut V A
delay: ${NUM}
animate: none|spin|ping|pulse|bounce V A
rotate scale scale-x scale-y: none ${NUM}
transform: V A |none|gpu|cpu
origin>transform-origin: ${POSITION} V A
translate translate-x translate-y translate-z: F full ${SPACE}
=translate-none: translate-none
appearance: none|auto
cursor: auto|default|pointer|wait|text|move|help|not-allowed|none|context-menu|progress|cell|crosshair|vertical-text|alias|copy|no-drop|grab|grabbing|all-scroll|col-resize|row-resize|n-resize|e-resize|s-resize|w-resize|ne-resize|nw-resize|se-resize|sw-resize|ew-resize|ns-resize|nesw-resize|nwse-resize|zoom-in|zoom-out V A
pointer-events: auto|none
resize: none||y|x
touch: auto|none|manipulation
touch-pan>touch-x: x|left|right
touch-pan>touch-y: y|up|down
=touch-pz: touch-pinch-zoom
select: none|text|all|auto
fill: none *
stroke>stroke-w: N (length) [length]L [number]N
stroke: none *
forced-color-adjust: auto|none
=shadow: cut cut-band cut-band-focus
band: oro|rojo|anil|verde|ink|cloth|accent|danger
=panel: on-ink on-layer
=relleno: relleno relleno-field relleno-working
=diente: diente diente-up
=wdth: wdth-display wdth-label
=forced-role: forced-ink forced-selected forced-on-selected
=edge-focus: focus-ring focus-ring-inset
=edge-ring: cut-current cut-thin cut-tab cut-gap rule-ring keycap
cut>edge-ring: *
=edge-s: rule-s rule-s-soft cut-s
bar-start>edge-s: *
=edge-e: rule-e rule-e-soft cut-e
=edge-t: rule-t rule-t-soft cut-t
=edge-b: rule-b rule-b-soft cut-b
bar-bottom>edge-b: *
`

/** Utilities that are one word, or a fixed phrase. */
const WHOLE: Record<string, string> = {}
/** key → its class groups, in tailwind-merge's order. */
const TABLE: Record<string, Group[]> = {}
/** Keys left alone that a shorter key would otherwise misread (`text-shadow-*` as a text colour). */
const ALONE: Group[] = []

for (const line of DEFINITIONS.trim().split('\n')) {
  const [head, body] = line.split(': ') as [string, string]
  const tokens = body.split(' ')
  if (head.startsWith('=')) {
    for (const c of tokens) WHOLE[c] = head.slice(1)
    continue
  }
  const [keys, id] = head.split('>') as [string, string?]
  const specs = tokens.map(spec)
  for (const key of keys.split(' ')) (TABLE[key] ??= []).push([id ?? key, specs])
}
for (const key of 'text-shadow inset-shadow drop-shadow bg-blend bg-clip bg-origin ring-offset font-stretch font-features'.split(' ')) {
  TABLE[key] = ALONE
}

// ── conflicts ──────────────────────────────────────────────────────────────
/** Setting the left group also sets every group on the right. */
const CONFLICTS: Record<string, string[]> = {}
for (const line of `container-named: container-type
overflow: overflow-x overflow-y
overscroll: overscroll-x overscroll-y
inset: inset-x inset-y inset-bs inset-be start end top right bottom left
inset-x: start end right left
inset-y: inset-bs inset-be top bottom
flex: basis grow shrink
gap: gap-x gap-y
size: w h
font-size: leading
line-clamp: display overflow
border-spacing: border-spacing-x border-spacing-y
translate: translate-x translate-y translate-none
translate-none: translate translate-x translate-y translate-z
touch: touch-x touch-y touch-pz
touch-x touch-y touch-pz: touch
fvn-normal: fvn-ordinal fvn-slashed-zero fvn-figure fvn-spacing fvn-fraction
fvn-ordinal fvn-slashed-zero fvn-figure fvn-spacing fvn-fraction: fvn-normal
rounded: ${CORNERS.map((c) => 'rounded-' + c).join(' ')}
rounded-s: rounded-ss rounded-es
rounded-e: rounded-se rounded-ee
rounded-t: rounded-tl rounded-tr
rounded-r: rounded-tr rounded-br
rounded-b: rounded-br rounded-bl
rounded-l: rounded-tl rounded-bl
shadow: edge-focus edge-ring edge-s edge-e edge-t edge-b
edge-focus edge-ring edge-s edge-e edge-t edge-b: shadow`.split('\n')) {
  const [ids, others] = line.split(': ') as [string, string]
  for (const id of ids.split(' ')) CONFLICTS[id] = others.split(' ')
}
/** `p` covers every side; `px` the inline sides; `py` the block sides. */
for (const key of ['p', 'm', 'border-w-', 'border-color-']) {
  CONFLICTS[key.replace(/-$/, '')] = SIDES.map((s) => key + s)
  CONFLICTS[key + 'x'] = [key + 's', key + 'e', key + 'r', key + 'l']
  CONFLICTS[key + 'y'] = [key + 'bs', key + 'be', key + 't', key + 'b']
}

// ── lookup ─────────────────────────────────────────────────────────────────
const listed = (spec: Spec, value: string) => typeof spec === 'string' && `|${spec}|`.includes(`|${value}|`)

/**
 * The longest key wins, as tailwind-merge's part tree does: `border-x-2` is
 * `border-x` + `2` before it is `border` + `x-2`. Within a key, any keyword
 * beats any validator (the tree checks exact parts first), and validators run
 * in group order.
 */
function groupOf(base: string): string | undefined {
  if (base.startsWith('[') && base.endsWith(']')) {
    const colon = base.indexOf(':')
    return colon > 1 ? 'arbitrary..' + base.slice(1, colon) : undefined
  }
  const name = base.length > 1 && base.startsWith('-') ? base.slice(1) : base
  if (WHOLE[name]) return WHOLE[name]
  const parts = name.split('-')
  for (let i = parts.length; i > 0; i--) {
    const groups = TABLE[parts.slice(0, i).join('-')]
    if (groups === ALONE) return undefined
    if (!groups) continue
    const value = parts.slice(i).join('-')
    for (const [id, specs] of groups) if (specs.some((s) => listed(s, value))) return id
    // A bare key (`shadow`) is only ever a keyword; validators see a value.
    if (value) for (const [id, specs] of groups) if (specs.some((s) => typeof s !== 'string' && s(value))) return id
  }
  return undefined
}

/** Variants whose order changes the selector; the rest are sorted. */
const ORDERED = new Set(['*', '**', 'after', 'backdrop', 'before', 'details-content', 'file', 'first-letter', 'first-line', 'marker', 'placeholder', 'selection'])

function sortVariants(variants: string[]) {
  const out: string[] = []
  let run: string[] = []
  for (const v of variants) {
    if (v.startsWith('[') || ORDERED.has(v)) {
      out.push(...run.sort(), v)
      run = []
    } else run.push(v)
  }
  return [...out, ...run.sort()].join(':')
}

/** What a class claims: its scope (sorted variants and `!`) and its group. */
function claim(className: string): [scope: string, group: string] | undefined {
  const variants: string[] = []
  let depth = 0
  let start = 0
  let slash = -1
  for (let i = 0; i < className.length; i++) {
    const c = className[i]
    if (depth === 0 && c === ':') {
      variants.push(className.slice(start, i))
      start = i + 1
    } else if (depth === 0 && c === '/') slash = i
    else if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth--
  }
  let base = className.slice(start)
  let important = false
  if (base.endsWith('!')) {
    base = base.slice(0, -1)
    important = true
  } else if (base.startsWith('!')) {
    base = base.slice(1)
    important = true
  }
  // A `/` before the base belongs to a variant (`group-hover/item:`), not the
  // utility. After it, it is a modifier (`bg-rojo/50`, `text-sm/6`) or part of
  // the value (`w-1/2`): the group is looked up without it first, then with it.
  const cut = slash > start ? slash - start - (className[start] === '!' ? 1 : 0) : -1
  let group = cut > 0 ? groupOf(base.slice(0, cut)) : groupOf(base)
  // `@container/sidebar` names a container: its own group, which conflicts with the type.
  if (group === 'container-type' && cut > 0 && /^@container(-size|-normal)?\/./.test(base)) group = 'container-named'
  if (!group && cut > 0) group = groupOf(base)
  return group ? [sortVariants(variants) + (important ? '!' : ''), group] : undefined
}

/**
 * What each class claims, worked out once: its own id first, then the ids of
 * the groups it overrides. `cn()` runs on every render of every component, and
 * the same few hundred classes come round again and again.
 */
const claims = new Map<string, string[] | null>()
const lists = new Map<string, string>()

function claimsOf(className: string) {
  let ids = claims.get(className)
  if (ids === undefined) {
    const claimed = claim(className)
    ids = claimed && [claimed[1], ...(CONFLICTS[claimed[1]] ?? [])].map((group) => `${claimed[0]} ${group}`)
    if (claims.size > 4999) claims.clear()
    claims.set(className, ids ?? null)
  }
  return ids
}

/** Join a class list, letting a later utility override an earlier one that sets the same thing. */
export function merge(classList: string): string {
  const hit = lists.get(classList)
  if (hit !== undefined) return hit
  const taken = new Set<string>()
  let result = ''
  const classes = classList.trim().split(/\s+/)
  for (let i = classes.length - 1; i >= 0; i--) {
    const className = classes[i]!
    if (!className) continue
    const ids = claimsOf(className)
    if (ids) {
      if (taken.has(ids[0]!)) continue
      for (const id of ids) taken.add(id)
    }
    result = result ? `${className} ${result}` : className
  }
  if (lists.size > 999) lists.clear()
  lists.set(classList, result)
  return result
}
