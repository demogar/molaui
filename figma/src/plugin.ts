/**
 * The plugin: materialises KitData in the open Figma file.
 *
 * Every write is find-or-create by name, so running it again updates the kit
 * in place instead of drawing a second one. That matters beyond tidiness:
 * a variable, a style or a component variant keeps its id when it is updated,
 * so every design already bound to it or using an instance of it follows the
 * change. For the same reason nothing is deleted. A variable or variant that
 * is no longer in the data is reported in the closing message for a person to
 * remove, because deleting it would silently detach whatever used it. The one
 * exception is the Starter alternates (`Color · dark`), merged into modes and
 * removed once the plan allows modes: their values then live in the base.
 *
 * Each variant's insides are rebuilt on every run. What a designer sets
 * through a component property (a label, a shown icon, a swapped instance)
 * survives that, because it lives on the instance; a direct override on an
 * inner layer does not, which is why everything meant to be changed is
 * exposed as a property.
 *
 * Errors are collected per component rather than thrown, so one API surprise
 * in one component still leaves the variables and the other components done,
 * and the closing message names what failed.
 *
 * This file is transpiled on its own into figma/plugin/code.js by
 * scripts/export-figma.ts: it may import types, nothing else.
 */
import type {
  ComponentNode,
  ComponentSetNode,
  FigmaApi,
  FrameNode,
  InstanceSwapPreferredValue,
  PageNode,
  SceneNode,
  ShadowEffect,
  SolidPaint,
  TextNode,
  Variable,
  VariableCollection,
  VariableValue as FigmaValue,
  VectorNode,
} from './api'
import type { ComponentSpec, EffectLayer, FrameNodeSpec, KitData, NodeSpec, Num, Paint, PropRef, RGBA, VariableValue } from './spec'

export interface Report {
  /**
   * Which path ran. `modes`: every collection holds all its modes (a paid
   * plan). `single-mode`: Figma refused a second mode (the Starter plan), so
   * each collection holds one mode and the others sit in alternates.
   */
  plan: 'modes' | 'single-mode'
  /** What `addMode` said when it refused, verbatim. */
  modeLimit?: string
  /** Single-mode path: the mode each multi-mode collection shows, by collection. */
  fronts: Record<string, string>
  /** Alternate collections merged into modes and removed, after an upgrade. */
  merged: string[]
  collections: { created: number; updated: number }
  variables: { created: number; updated: number }
  effectStyles: { created: number; updated: number }
  icons: { created: number; updated: number }
  components: { created: number; updated: number }
  variants: { created: number; updated: number }
  /** Variables and variants in the file that the data no longer has. */
  stale: string[]
  missingFonts: string[]
  errors: string[]
  notes: string[]
}

const isPaint = (c: Paint | RGBA): c is Paint => 'var' in c
const isAlias = (v: VariableValue): v is { alias: string } => typeof v === 'object' && 'alias' in v
const numOf = (n: Num) => (typeof n === 'number' ? n : n.px)
const variantName = (props: Record<string, string>) =>
  Object.entries(props)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ')

export function emptyReport(): Report {
  const pair = () => ({ created: 0, updated: 0 })
  return {
    plan: 'modes',
    fronts: {},
    merged: [],
    collections: pair(),
    variables: pair(),
    effectStyles: pair(),
    icons: pair(),
    components: pair(),
    variants: pair(),
    stale: [],
    missingFonts: [],
    errors: [],
    notes: [],
  }
}

/* ── variables ─────────────────────────────────────────────────────── */

/**
 * The collection that holds one mode of a multi-mode collection when the
 * plan allows only one mode per collection: `Color · dark`, with the same
 * variable names as the base collection.
 */
export const alternateName = (collection: string, mode: string) => `${collection} · ${mode}`

/**
 * Writes every variable of `spec` into `col`, each mode taking the value of
 * the spec's mode with the same name. Only base collections are registered
 * in `byKey`: components, effect styles and aliases bind the base, never an
 * alternate.
 */
function writeVariables(
  figma: FigmaApi,
  col: VariableCollection,
  spec: KitData['collections'][number],
  existing: Variable[],
  byKey: Map<string, Variable>,
  report: Report,
  register: boolean,
) {
  const modes = col.modes.flatMap((m) => {
    const i = spec.modes.indexOf(m.name)
    return i < 0 ? [] : [{ modeId: m.modeId, i }]
  })
  for (const v of spec.variables) {
    let variable = existing.find((x) => x.variableCollectionId === col.id && x.name === v.name)
    if (variable && variable.resolvedType !== v.type) {
      // A type cannot be changed in place; this only happens when a token changes kind.
      variable.remove()
      variable = undefined
    }
    if (variable) report.variables.updated++
    else {
      variable = figma.variables.createVariable(v.name, col, v.type)
      report.variables.created++
    }
    variable.description = v.description
    variable.scopes = v.scopes
    variable.hiddenFromPublishing = spec.hidden
    variable.setVariableCodeSyntax('WEB', v.codeSyntax)
    if (register) byKey.set(`${spec.name}/${v.name}`, variable)
    for (const { modeId, i } of modes) {
      const value = v.values[i]!
      let out: FigmaValue
      if (isAlias(value)) {
        const target = byKey.get(value.alias)
        if (!target) throw new Error(`${spec.name}/${v.name} aliases ${value.alias}, which is not built yet`)
        out = figma.variables.createVariableAlias(target)
      } else out = value
      variable.setValueForMode(modeId, out)
    }
  }
}

/**
 * Collections, by name, with every mode the plan allows.
 *
 * The plan is not guessed. The first time a collection needs a second mode,
 * `addMode` is called; if Figma refuses (the Starter plan allows one mode per
 * collection), the run takes the single-mode path for every collection.
 * There the base collection (`Color`, `Density`) holds one mode, the front,
 * and each other mode is an alternate collection (`Color · dark`) with the
 * same variable names. Components and effect styles bind the base, so the
 * kit shows the front. The `dark`, `compact`… menu commands make another mode
 * the front by renaming the base's one mode and rewriting its values: that
 * recolours everything bound to it on Starter without touching a binding,
 * which swapping to library variables could not (it needs a published
 * library, a paid feature).
 *
 * A file that started on Starter and moves to a paid plan upgrades on its
 * next run: `addMode` succeeds, the base gains its other modes with the
 * values from the data, and the alternates are merged, which means removed,
 * because their values now live in the modes. Base variables keep their ids
 * throughout, so nothing bound to them is lost.
 */
export async function syncVariables(figma: FigmaApi, data: KitData, report: Report, command = ''): Promise<Map<string, Variable>> {
  const byKey = new Map<string, Variable>()
  const collections = await figma.variables.getLocalVariableCollectionsAsync()
  const existing = await figma.variables.getLocalVariablesAsync()
  const upsert = (name: string) => {
    let col = collections.find((c) => c.name === name)
    if (col) report.collections.updated++
    else {
      col = figma.variables.createVariableCollection(name)
      collections.push(col)
      report.collections.created++
    }
    return col
  }
  for (const spec of data.collections) {
    const base = upsert(spec.name)
    base.hiddenFromPublishing = spec.hidden
    const asked = spec.modes.includes(command) ? command : undefined
    // A new collection (or one a stopped run left) has one mode called "Mode 1". It takes the first mode, and the single-mode path below may then make another the front.
    const first = base.modes[0]
    if (first && base.modes.length === 1 && !spec.modes.includes(first.name)) base.renameMode(first.modeId, spec.modes[0]!)
    if (spec.modes.length > 1 && report.modeLimit === undefined) {
      for (const name of spec.modes) {
        if (base.modes.some((m) => m.name === name)) continue
        try {
          base.addMode(name)
        } catch (error) {
          report.modeLimit = error instanceof Error ? error.message : String(error)
          report.plan = 'single-mode'
          break
        }
      }
    }
    let missing = spec.modes.filter((name) => !base.modes.some((m) => m.name === name))
    const only = base.modes[0]
    if (missing.length && asked && base.modes.length === 1 && only && only.name !== asked) {
      base.renameMode(only.modeId, asked)
      missing = spec.modes.filter((name) => !base.modes.some((m) => m.name === name))
    } else if (asked && !missing.length) {
      report.notes.push(`${spec.name} has every mode, so pick ${asked} in a frame's variable modes (Appearance); the command changes nothing`)
    }
    writeVariables(figma, base, spec, existing, byKey, report, true)
    const wanted = new Set(spec.variables.map((v) => v.name))
    for (const x of existing) {
      if (x.variableCollectionId === base.id && !wanted.has(x.name)) report.stale.push(`variable ${spec.name}/${x.name}`)
    }
    if (spec.modes.length < 2) continue
    if (!missing.length) {
      for (const mode of spec.modes) {
        const alt = collections.find((c) => c.name === alternateName(spec.name, mode))
        if (!alt) continue
        alt.remove()
        collections.splice(collections.indexOf(alt), 1)
        report.merged.push(alt.name)
      }
      continue
    }
    const present = spec.modes.filter((name) => !missing.includes(name))
    report.fronts[spec.name] = present.join(', ')
    for (const mode of spec.modes) {
      const name = alternateName(spec.name, mode)
      // An alternate is needed for every mode the base lacks. One left over
      // from an earlier front is kept up to date rather than deleted.
      if (present.includes(mode) && !collections.some((c) => c.name === name)) continue
      const alt = upsert(name)
      alt.hiddenFromPublishing = spec.hidden
      const m = alt.modes[0]!
      if (alt.modes.length === 1 && m.name !== mode) alt.renameMode(m.modeId, mode)
      writeVariables(figma, alt, spec, existing, byKey, report, false)
    }
  }
  return byKey
}

/* ── paints and effects ────────────────────────────────────────────── */

interface Ctx {
  figma: FigmaApi
  vars: Map<string, Variable>
  report: Report
  /** Built components by name; a component set maps to its set. */
  built: Map<string, ComponentNode | ComponentSetNode>
  /** The component each instance was made from (an instance's own getter is async under dynamic-page). */
  mainOf: Map<SceneNode, string>
}

function variable(ctx: Ctx, key: string): Variable {
  const v = ctx.vars.get(key)
  if (!v) throw new Error(`No variable ${key}`)
  return v
}

function paint(ctx: Ctx, p: Paint): SolidPaint {
  const base: SolidPaint = { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: p.opacity ?? 1, visible: true }
  return ctx.figma.variables.setBoundVariableForPaint(base, 'color', variable(ctx, p.var))
}

function effect(ctx: Ctx, layer: EffectLayer): ShadowEffect {
  const literal = isPaint(layer.color) ? { r: 0, g: 0, b: 0, a: 1 } : layer.color
  let e: ShadowEffect = {
    type: layer.type,
    color: literal,
    offset: { x: layer.x, y: layer.y },
    radius: layer.blur,
    spread: numOf(layer.spread),
    visible: true,
    blendMode: 'NORMAL',
    ...(layer.type === 'DROP_SHADOW' ? { showShadowBehindNode: false } : {}),
  }
  if (isPaint(layer.color)) e = ctx.figma.variables.setBoundVariableForEffect(e, 'color', variable(ctx, layer.color.var))
  if (typeof layer.spread !== 'number') e = ctx.figma.variables.setBoundVariableForEffect(e, 'spread', variable(ctx, layer.spread.var))
  return e
}

/** Sets a numeric field and binds it to its variable, or unbinds it for a literal (a rebuilt node may carry an old binding). */
function setNum(ctx: Ctx, node: SceneNode, field: string, n: Num) {
  ;(node as unknown as Record<string, number>)[field] = numOf(n)
  node.setBoundVariable(field, typeof n === 'number' ? null : variable(ctx, n.var))
}

export async function syncEffectStyles(figma: FigmaApi, data: KitData, vars: Map<string, Variable>, report: Report) {
  const ctx: Ctx = { figma, vars, report, built: new Map(), mainOf: new Map() }
  const styles = await figma.getLocalEffectStylesAsync()
  for (const spec of data.effectStyles) {
    let style = styles.find((s) => s.name === spec.name)
    if (style) report.effectStyles.updated++
    else {
      style = figma.createEffectStyle()
      style.name = spec.name
      report.effectStyles.created++
    }
    style.description = spec.description
    style.effects = spec.effects.map((layer) => effect(ctx, layer))
  }
}

/* ── nodes ─────────────────────────────────────────────────────────── */

type Refs = [SceneNode, PropRef][]

function applyFrame(ctx: Ctx, f: FrameNode, s: FrameNodeSpec) {
  f.name = s.name
  f.layoutMode = s.layout
  f.cornerRadius = 0
  f.strokes = []
  f.fills = s.fill ? [paint(ctx, s.fill)] : []
  // Spread is only drawn on a node with a visible fill and clipped content.
  f.clipsContent = Boolean(s.effects && s.effects.length)
  f.effects = (s.effects ?? []).map((e) => effect(ctx, e))
  const p = s.padding ?? { top: 0, right: 0, bottom: 0, left: 0 }
  setNum(ctx, f, 'paddingTop', p.top)
  setNum(ctx, f, 'paddingRight', p.right)
  setNum(ctx, f, 'paddingBottom', p.bottom)
  setNum(ctx, f, 'paddingLeft', p.left)
  setNum(ctx, f, 'itemSpacing', s.gap ?? 0)
  if (s.align) {
    f.primaryAxisAlignItems = s.align.main
    f.counterAxisAlignItems = s.align.cross
  }
  f.resize(s.width !== undefined ? numOf(s.width) : Math.max(f.width, 1), s.height !== undefined ? numOf(s.height) : Math.max(f.height, 1))
  if (s.width !== undefined && typeof s.width !== 'number') f.setBoundVariable('width', variable(ctx, s.width.var))
  if (s.height !== undefined && typeof s.height !== 'number') f.setBoundVariable('height', variable(ctx, s.height.var))
  if (s.layout !== 'NONE') {
    const h = s.sizing?.h ?? 'HUG'
    const v = s.sizing?.v ?? 'HUG'
    if (h !== 'FILL') f.layoutSizingHorizontal = h
    if (v !== 'FILL') f.layoutSizingVertical = v
  }
}

async function buildChildren(ctx: Ctx, parent: FrameNode, s: FrameNodeSpec, refs: Refs) {
  for (const child of s.children) {
    const node = await buildNode(ctx, child, refs)
    parent.appendChild(node)
    if (child.kind === 'frame' && parent.layoutMode !== 'NONE') {
      if (child.sizing?.h === 'FILL') node.layoutSizingHorizontal = 'FILL'
      if (child.sizing?.v === 'FILL') node.layoutSizingVertical = 'FILL'
    }
    if ((child.kind === 'text' || child.kind === 'instance') && child.fill) node.layoutSizingHorizontal = 'FILL'
    if (child.prop) refs.push([node, child.prop])
  }
}

function setFont(t: TextNode, family: string, style: string, wdth: number | undefined) {
  if (wdth !== undefined) {
    try {
      t.fontName = { family, style, variationSettings: { wdth } }
      return
    } catch {
      // The installed family has no width axis: the static face is the closest.
    }
  }
  t.fontName = { family, style }
}

async function buildNode(ctx: Ctx, s: NodeSpec, refs: Refs): Promise<SceneNode> {
  if (s.kind === 'frame') {
    const f = ctx.figma.createFrame()
    applyFrame(ctx, f, s)
    await buildChildren(ctx, f, s, refs)
    return f
  }
  if (s.kind === 'text') {
    const t = ctx.figma.createText()
    t.name = s.name
    setFont(t, s.text.family.name, s.text.style, s.text.wdth)
    t.characters = s.characters
    setNum(ctx, t, 'fontSize', s.text.size)
    try {
      t.setBoundVariable('fontFamily', variable(ctx, s.text.family.var))
    } catch {
      // Binding a family variable needs a recent Figma; the literal family is already set.
    }
    t.lineHeight = { unit: 'PERCENT', value: s.text.lineHeight }
    t.letterSpacing = { unit: 'PERCENT', value: s.text.letterSpacing }
    t.textCase = s.text.upper ? 'UPPER' : 'ORIGINAL'
    t.fills = [paint(ctx, s.text.fill)]
    t.textAutoResize = s.fill ? 'HEIGHT' : 'WIDTH_AND_HEIGHT'
    return t
  }
  const target = ctx.built.get(s.of)
  if (!target) throw new Error(`${s.of} is used before it is built`)
  const main = target.type === 'COMPONENT_SET' ? findVariant(target as ComponentSetNode, s.variant) : (target as ComponentNode)
  const inst = main.createInstance()
  ctx.mainOf.set(inst, main.id)
  inst.name = s.name
  if (s.size !== undefined) {
    const px = numOf(s.size)
    // rescale, not resize: it scales the stroke with the paths, as an SVG
    // drawn at a smaller size does in the browser.
    if (inst.width > 0 && inst.width !== px) inst.rescale(px / inst.width)
    if (typeof s.size !== 'number') {
      inst.setBoundVariable('width', variable(ctx, s.size.var))
      inst.setBoundVariable('height', variable(ctx, s.size.var))
    }
  }
  if (s.color) {
    const color = s.color
    for (const v of inst.findAll((n) => n.type === 'VECTOR')) (v as VectorNode).strokes = [paint(ctx, color)]
  }
  return inst
}

function findVariant(set: ComponentSetNode, props: Record<string, string> | undefined): ComponentNode {
  if (!props) return set.defaultVariant
  const name = variantName(props)
  const hit = set.children.find((c) => c.name === name)
  if (!hit) throw new Error(`${set.name} has no variant ${name}`)
  return hit as ComponentNode
}

/* ── components ────────────────────────────────────────────────────── */

async function findPage(figma: FigmaApi, name: string): Promise<PageNode> {
  let page = figma.root.children.find((p) => p.name === name)
  if (!page) {
    page = figma.createPage()
    page.name = name
  }
  await page.loadAsync()
  return page
}

export async function syncIcons(ctx: Ctx, page: PageNode, data: KitData) {
  let x = 0
  for (const spec of data.icons) {
    let comp = page.children.find((n) => n.type === 'COMPONENT' && n.name === spec.name) as ComponentNode | undefined
    if (comp) {
      for (const child of [...comp.children]) child.remove()
      ctx.report.icons.updated++
    } else {
      comp = ctx.figma.createComponent()
      page.appendChild(comp)
      ctx.report.icons.created++
    }
    comp.name = spec.name
    comp.description = spec.description
    comp.fills = []
    comp.resize(24, 24)
    const svg = ctx.figma.createNodeFromSvg(spec.svg)
    for (const child of [...svg.children]) comp.appendChild(child)
    svg.remove()
    for (const v of comp.findAll((n) => n.type === 'VECTOR')) {
      const vector = v as VectorNode
      vector.strokes = [paint(ctx, { var: 'Color/ink' })]
      vector.constraints = { horizontal: 'SCALE', vertical: 'SCALE' }
    }
    comp.x = x
    comp.y = 0
    x += 48
    ctx.built.set(spec.name, comp)
  }
}

function preferred(ctx: Ctx, names: string[] | undefined): InstanceSwapPreferredValue[] {
  return (names ?? []).flatMap((name) => {
    const node = ctx.built.get(name)
    return node ? [{ type: node.type === 'COMPONENT_SET' ? ('COMPONENT_SET' as const) : ('COMPONENT' as const), key: node.key }] : []
  })
}

function swapDefault(ctx: Ctx, name: string): string {
  const node = ctx.built.get(name)
  if (!node) throw new Error(`${name} is used before it is built`)
  return node.type === 'COMPONENT_SET' ? (node as ComponentSetNode).defaultVariant.id : node.id
}

/**
 * A swap property's default is the component its instances were drawn from,
 * so the property and the variant agree (Field's control is the md Input, not
 * whichever variant the set lists first).
 */
function syncProperties(ctx: Ctx, owner: ComponentNode | ComponentSetNode, spec: ComponentSpec, refs: Refs): Map<string, string> {
  const keys = new Map<string, string>()
  for (const prop of spec.properties) {
    const defs = owner.componentPropertyDefinitions
    const existing = Object.keys(defs).find((k) => k.split('#')[0] === prop.name && defs[k]!.type === prop.type)
    const drawn = refs.find(([, ref]) => ref.swap === prop.name)
    const def = prop.type === 'INSTANCE_SWAP' ? ((drawn && ctx.mainOf.get(drawn[0])) ?? swapDefault(ctx, String(prop.default))) : prop.default
    const prefs = prop.type === 'INSTANCE_SWAP' ? preferred(ctx, prop.preferred) : undefined
    const key = existing
      ? owner.editComponentProperty(existing, { defaultValue: def, ...(prefs ? { preferredValues: prefs } : {}) })
      : owner.addComponentProperty(prop.name, prop.type, def, prefs ? { preferredValues: prefs } : undefined)
    keys.set(prop.name, key)
  }
  return keys
}

function bindRefs(refs: Refs, keys: Map<string, string>, component: string) {
  for (const [node, ref] of refs) {
    const out: { visible?: string; characters?: string; mainComponent?: string } = {}
    const key = (name: string) => {
      const k = keys.get(name)
      if (!k) throw new Error(`${component} has no property ${name}`)
      return k
    }
    if (ref.characters) out.characters = key(ref.characters)
    if (ref.visible) out.visible = key(ref.visible)
    if (ref.swap) out.mainComponent = key(ref.swap)
    node.componentPropertyReferences = out
  }
}

/** Lays variants out in rows: one row per combination of every axis but the last. */
function arrange(set: ComponentSetNode, spec: ComponentSpec) {
  const GAP = 24
  const rows = new Map<string, SceneNode[]>()
  const last = spec.axes[spec.axes.length - 1]?.name
  for (const v of spec.variants) {
    const node = set.children.find((c) => c.name === variantName(v.props))
    if (!node) continue
    const rowKey = Object.entries(v.props)
      .filter(([k]) => k !== last)
      .map(([k, val]) => `${k}=${val}`)
      .join(',')
    rows.set(rowKey, [...(rows.get(rowKey) ?? []), node])
  }
  let y = GAP
  let width = 0
  for (const row of rows.values()) {
    let x = GAP
    let height = 0
    for (const node of row) {
      node.x = x
      node.y = y
      x += node.width + GAP
      height = Math.max(height, node.height)
    }
    width = Math.max(width, x)
    y += height + GAP
  }
  set.resizeWithoutConstraints(Math.max(width, 1), Math.max(y, 1))
}

export async function syncComponent(ctx: Ctx, page: PageNode, spec: ComponentSpec): Promise<ComponentNode | ComponentSetNode> {
  const isSet = spec.axes.length > 0
  const refs: Refs = []
  let owner: ComponentNode | ComponentSetNode
  if (!isSet) {
    let comp = page.children.find((n) => n.type === 'COMPONENT' && n.name === spec.name) as ComponentNode | undefined
    if (comp) {
      for (const child of [...comp.children]) child.remove()
      ctx.report.components.updated++
    } else {
      comp = ctx.figma.createComponent()
      page.appendChild(comp)
      ctx.report.components.created++
    }
    const root = spec.variants[0]!.root
    applyFrame(ctx, comp, root)
    comp.name = spec.name
    await buildChildren(ctx, comp, root, refs)
    owner = comp
  } else {
    let set = page.children.find((n) => n.type === 'COMPONENT_SET' && n.name === spec.name) as ComponentSetNode | undefined
    if (set) ctx.report.components.updated++
    else ctx.report.components.created++
    const comps: ComponentNode[] = []
    const wanted = new Set<string>()
    for (const v of spec.variants) {
      const name = variantName(v.props)
      wanted.add(name)
      let comp = set?.children.find((c) => c.name === name) as ComponentNode | undefined
      if (comp) {
        for (const child of [...comp.children]) child.remove()
        ctx.report.variants.updated++
      } else {
        comp = ctx.figma.createComponent()
        if (set) set.appendChild(comp)
        else page.appendChild(comp)
        ctx.report.variants.created++
      }
      applyFrame(ctx, comp, v.root)
      comp.name = name
      await buildChildren(ctx, comp, v.root, refs)
      comps.push(comp)
    }
    if (!set) {
      set = ctx.figma.combineAsVariants(comps, page)
      set.name = spec.name
    } else {
      for (const c of set.children) if (!wanted.has(c.name)) ctx.report.stale.push(`variant ${spec.name} / ${c.name}`)
    }
    arrange(set, spec)
    owner = set
  }
  owner.description = spec.description
  owner.documentationLinks = spec.docs ? [{ uri: spec.docs }] : []
  ctx.built.set(spec.name, owner)
  bindRefs(refs, syncProperties(ctx, owner, spec, refs), spec.name)
  return owner
}

/* ── fonts and the run ─────────────────────────────────────────────── */

export async function loadFonts(figma: FigmaApi, data: KitData, report: Report): Promise<boolean> {
  let ok = true
  for (const font of data.fonts) {
    try {
      await figma.loadFontAsync({ family: font.family, style: font.style })
    } catch {
      report.missingFonts.push(`${font.family} ${font.style}`)
      if (font.required) ok = false
    }
  }
  return ok
}

export function summary(report: Report, data: KitData): string {
  const n = (p: { created: number; updated: number }) => `${p.created} created, ${p.updated} updated`
  const multi = data.collections.filter((c) => c.modes.length > 1)
  let plan: string
  if (report.plan === 'modes') {
    plan = `Paid-plan path: each collection holds its modes (${multi.map((c) => `${c.name}: ${c.modes.join(', ')}`).join('; ')}).`
  } else {
    const shown = multi.map((c) => report.fronts[c.name] ?? c.modes[0]!)
    const elsewhere = multi.flatMap((c) =>
      c.modes.filter((m) => !(report.fronts[c.name] ?? c.modes[0]!).split(', ').includes(m)).map((m) => alternateName(c.name, m)),
    )
    plan =
      `Starter path: your plan allows one mode per collection, so the kit switched to single-mode collections (Figma said: "${report.modeLimit ?? ''}"). ` +
      `The kit shows ${shown.join(' and ')}; the other modes are in ${elsewhere.join(', ')}. ` +
      `To show another, run Plugins → Development → Mola UI kit → Show dark (or light, compact, spacious, comfortable), which rewrites the shown values in place.`
  }
  const parts = [
    `Mola UI kit. ${plan}`,
    `Variables ${n(report.variables)}; effect styles ${n(report.effectStyles)}; components ${n(report.components)} (variants ${n(report.variants)}).`,
  ]
  if (report.merged.length) parts.push(`Upgraded: merged ${report.merged.join(', ')} into modes and removed them.`)
  if (report.notes.length) parts.push(`${report.notes.join('; ')}.`)
  if (report.missingFonts.length) {
    const families = [...new Set(data.fonts.map((f) => f.family))].join(', ')
    parts.push(`Missing fonts: ${report.missingFonts.join(', ')}. Install ${families} (Google Fonts), restart Figma and run the plugin again.`)
  }
  if (report.stale.length) parts.push(`No longer in the code, left in place for you to delete: ${report.stale.join('; ')}.`)
  if (report.errors.length) parts.push(`Failed: ${report.errors.join('; ')}.`)
  return parts.join(' ')
}

/** `command` is the menu item (figma.command): `run`, or a mode name to show on the single-mode path. */
export async function run(figma: FigmaApi, data: KitData, command = figma.command ?? ''): Promise<{ report: Report; message: string }> {
  const report = emptyReport()
  const vars = await syncVariables(figma, data, report, command)
  await syncEffectStyles(figma, data, vars, report)
  const page = await findPage(figma, data.page)
  const ctx: Ctx = { figma, vars, report, built: new Map(), mainOf: new Map() }
  await syncIcons(ctx, page, data)
  const fontsOk = await loadFonts(figma, data, report)
  if (fontsOk) {
    let y = 96
    for (const spec of data.components) {
      try {
        const node = await syncComponent(ctx, page, spec)
        node.x = 0
        node.y = y
        y += node.height + 96
      } catch (error) {
        report.errors.push(`${spec.name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    await figma.setCurrentPageAsync(page)
  } else {
    report.errors.push('components skipped: a font they use is missing')
  }
  return { report, message: summary(report, data) }
}

/**
 * The message for a run that threw. A mode limit is handled on the
 * single-mode path and should never get here, but the first version of the
 * plugin stopped on it with Figma's raw text, so it is named in words if it
 * ever does, with what to do.
 */
export function stopped(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error)
  if (/mode/i.test(text) && /limit/i.test(text)) {
    return `Mola UI kit stopped: your plan allows one mode per collection (Figma said: "${text}"). Run the plugin again: it switches to single-mode collections and adopts what this run created.`
  }
  return `Mola UI kit stopped: ${text}. Nothing is lost: run it again and it picks up what it already created.`
}

/** The entry code.js calls: run, then close with the summary (or the failure). */
export function main(figma: FigmaApi, data: KitData) {
  run(figma, data).then(
    ({ report, message }) => {
      if (report.errors.length || report.missingFonts.length) figma.notify(message, { error: true, timeout: 20000 })
      figma.closePlugin(message)
    },
    (error: unknown) => figma.closePlugin(stopped(error)),
  )
}
