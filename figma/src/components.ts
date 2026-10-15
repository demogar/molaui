/**
 * docs/ai/components.json + the variables -> the kit's components and the
 * component map.
 *
 * Name identity, from the owner's research notes (Jason Arnold, "Creating
 * design systems in Figma for AI", and figma-code-sync): a Figma component is
 * named after its code export, its variant axes are the prop names, and their
 * values are the code's exact strings (`danger`, `sm`), read from the manifest
 * so a value added in code reaches the kit or fails the build. An axis that is
 * not a prop of this export says where it comes from (`inherited`), and a
 * Figma-only state (hover, focus) is marked `nonApi`, so nobody goes looking
 * for a `state` prop.
 *
 * ── the cut is an effect, not a stroke ──
 * In code the cut is `box-shadow: 0 0 0 var(--cut-w) var(--ink)`: outside the
 * box, taking no layout space, and the hover band and the focus ring are more
 * rings stacked on it. A Figma drop shadow with spread is the same primitive,
 * so the inspector shows the cut as what it is, its spread binds to `cut-w`
 * and its colour to `ink`, and every state is the same mechanism with more
 * layers. An inside stroke was the other candidate and was rejected: it eats
 * 1.5px of the control's interior, so the edge sits where the code does not
 * draw it, and a stroke cannot stack the three rings of `cut-band`. The cost
 * is Figma's rule that spread needs a visible fill and clipped content, which
 * the plugin sets on every node with effects (a ghost button gets a fill at
 * zero opacity, as its CSS background is transparent).
 *
 * Effect layers are listed bottom first, because Figma draws the last effect
 * on top while CSS draws the first shadow on top.
 */
import { CONTROL_PX_MULTIPLES, controlPxName, SPACE_STEPS, spaceName } from './tokens'
import type {
  CollectionSpec,
  ComponentSpec,
  EffectLayer,
  FrameNodeSpec,
  InstanceNodeSpec,
  Num,
  Paint,
  PropertySpec,
  TextNodeSpec,
  TextStyle,
  VariantSpec,
} from './spec'

/* ── the manifest ──────────────────────────────────────────────────── */

interface ManifestProp {
  name: string
  type: string
  required: boolean
  description?: string
  /** The literal values, when the type is an alias the manifest resolved. */
  values?: string[]
}
interface ManifestExport {
  name: string
  kind: string
  variants?: Record<string, { values: string[]; default: string }>
  props?: ManifestProp[]
}
interface ManifestComponent {
  title: string
  name: string
  docs: string
  phase: string
  summary: string
  usage?: { practices?: { do: string; dont: string }[] }
  exports: ManifestExport[]
}
export interface Manifest {
  install?: { package?: string }
  components: ManifestComponent[]
}

/* ── the map ───────────────────────────────────────────────────────── */

export interface MapAxis {
  values: string[]
  /** Not a prop of this export: where the value comes from in code. */
  inherited?: string
}

export interface MapEntry {
  status: 'built' | 'pending'
  /** The docs page the export is documented on. */
  page: string
  docs: string
  /** Built only. */
  figma?: string
  variants?: Record<string, MapAxis>
  properties?: Record<string, 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP'>
  /** Figma-only axes and properties: states a designer needs that are not props. */
  nonApi?: Record<string, string[] | 'BOOLEAN'>
  /** Props of the export the kit does not draw, each with why. */
  notDrawn?: Record<string, string>
}

export interface ComponentMap {
  $comment: string
  package: string
  /** Code export name -> Figma. Every component export in docs/ai/components.json. */
  components: Record<string, MapEntry>
  /** Figma components with no export of ours: the icons are lucide-react's, the slot is a placeholder. */
  figmaOnly: Record<string, string>
}

/* ── variables, by key ─────────────────────────────────────────────── */

export function variableIndex(collections: CollectionSpec[]) {
  const values = new Map<string, unknown>()
  for (const c of collections) for (const v of c.variables) values.set(`${c.name}/${v.name}`, v.values[0])
  const num = (key: string): Num => {
    const value = values.get(key)
    if (typeof value !== 'number') throw new Error(`No number variable ${key}`)
    return { var: key, px: value }
  }
  return { values, num }
}

/* ── the kit ───────────────────────────────────────────────────────── */

const STATES = ['rest', 'hover', 'focus-visible'] as const
type State = (typeof STATES)[number] | 'disabled'
const BOOL = ['false', 'true']

/** Every combination of the axes, in axis order, minus the ones `keep` rejects. */
function grid(axes: { name: string; values: string[] }[], keep: (p: Record<string, string>) => boolean = () => true) {
  let out: Record<string, string>[] = [{}]
  for (const axis of axes) out = out.flatMap((p) => axis.values.map((v) => ({ ...p, [axis.name]: v })))
  return out.filter(keep)
}

/** `disabled=true` has one look whatever the pointer does, so it is drawn at rest only. */
const restWhenDisabled = (p: Record<string, string>) => p.disabled !== 'true' || p.state === 'rest'
const stateOf = (p: Record<string, string>): State => (p.disabled === 'true' ? 'disabled' : (p.state as State))

/** The values of a string-literal union type as the manifest prints it: `"sm" | "md"`. */
export function unionValues(type: string): string[] | null {
  if (type === 'boolean') return BOOL
  const parts = type.split('|').map((p) => p.trim())
  if (!parts.every((p) => /^"[^"]*"$/.test(p) || /^\d+$/.test(p))) return null
  return parts.map((p) => p.replace(/^"|"$/g, ''))
}

export interface ComponentBuild {
  components: ComponentSpec[]
  map: ComponentMap
}

export function buildComponents(manifest: Manifest, collections: CollectionSpec[]): ComponentBuild {
  const { num, values } = variableIndex(collections)
  const pkg = manifest.install?.package ?? '@demogar/mola-ui'
  const C = (name: string, opacity?: number): Paint => {
    if (!values.has(`Color/${name}`)) throw new Error(`No colour variable ${name}`)
    return opacity === undefined ? { var: `Color/${name}` } : { var: `Color/${name}`, opacity }
  }
  const D = (name: string) => num(`Density/${name}`)
  const S = (name: string) => num(`Scale/${name}`)
  const space = (step: number) => {
    if (!(SPACE_STEPS as readonly number[]).includes(step)) throw new Error(`space/${step} is not a step in tokens.ts`)
    return D(spaceName(step))
  }
  const controlPx = (m: number) => {
    if (!(CONTROL_PX_MULTIPLES as readonly number[]).includes(m)) throw new Error(`control-px × ${m} is not in tokens.ts`)
    return D(controlPxName(m))
  }
  const ratio = (key: string) => Math.round((values.get(`Scale/${key}`) as number) * 10000) / 100
  const family = (role: 'ui' | 'text' | 'mono') => ({ var: `Scale/font-${role}`, name: values.get(`Scale/font-${role}`) as string })
  const LINE = {
    none: 100,
    snug: ratio('leading-snug'),
    body: ratio('leading-body'),
    size: (size: string) => (values.has(`Scale/text-${size}--line-height`) ? ratio(`text-${size}--line-height`) : 100),
  }

  /** Archivo at a size; `label` is the rótulo register: semibold caps, tracked, expanded. */
  const ui = (size: string, fill: Paint, o: { weight?: string; line?: number; label?: boolean } = {}): TextStyle => ({
    family: family('ui'),
    style: o.weight ?? (o.label ? 'SemiBold' : 'Regular'),
    size: D(`text-${size}`),
    lineHeight: o.line ?? (o.label ? LINE.none : LINE.size(size)),
    letterSpacing: o.label ? ratio('tracking-label') : 0,
    upper: Boolean(o.label),
    ...(o.label ? { wdth: values.get('Scale/wdth-label') as number } : {}),
    fill,
  })

  const pad = (y: Num, x: Num) => ({ top: y, right: x, bottom: y, left: x })
  const text = (name: string, characters: string, style: TextStyle, prop?: TextNodeSpec['prop'], fill?: boolean): TextNodeSpec => ({
    kind: 'text',
    name,
    characters,
    text: style,
    ...(fill ? { fill } : {}),
    ...(prop ? { prop } : {}),
  })
  const icon = (name: string, size: Num, color: Paint, prop?: InstanceNodeSpec['prop']): InstanceNodeSpec => ({
    kind: 'instance',
    name: 'icon',
    of: `Icon/${name}`,
    size,
    color,
    ...(prop ? { prop } : {}),
  })

  /* effects */
  const ring = (spread: Num, color: Paint, type: EffectLayer['type'] = 'DROP_SHADOW', x = 0, y = 0): EffectLayer => ({ type, x, y, blur: 0, spread, color })
  const cutW = () => S('cut-w')
  const cutWidth = (values.get('Scale/cut-w') as number) ?? 1.5
  const cut = (color = 'ink') => [ring(cutW(), C(color))]
  const cutBand = (band: string, reveal: number) => [
    ring(cutWidth * 2 + reveal, C('ink')),
    ring(cutWidth + reveal, C(band)),
    ring(cutW(), C('ink')),
  ]
  const focusRing = () => [ring(6.5, C('ink')), ring(3.5, C('cloth-pale')), ring(cutW(), C('ink'))]
  const focusInset = () => [ring(3.5, C('cloth-pale'), 'INNER_SHADOW'), ring(2, C('ink'), 'INNER_SHADOW')]

  const frame = (name: string, o: Omit<FrameNodeSpec, 'kind' | 'name' | 'children' | 'layout'> & { layout?: FrameNodeSpec['layout'] }, children: FrameNodeSpec['children']): FrameNodeSpec => ({
    kind: 'frame',
    name,
    layout: o.layout ?? 'HORIZONTAL',
    ...o,
    children,
  })

  /* manifest lookups */
  const pageOf = new Map<string, ManifestComponent>()
  const exportOf = new Map<string, ManifestExport>()
  for (const c of manifest.components) {
    for (const e of c.exports) {
      if (e.kind !== 'component') continue
      pageOf.set(e.name, c)
      exportOf.set(e.name, e)
    }
  }
  const axisValues = (exportName: string, prop: string): string[] => {
    const e = exportOf.get(exportName)
    const fromCva = e?.variants?.[prop]?.values
    const declared = e?.props?.find((p) => p.name === prop)
    const values = fromCva ?? declared?.values ?? (declared ? unionValues(declared.type) : null)
    if (!values) throw new Error(`${exportName} has no prop ${prop} with literal values in the manifest`)
    return values
  }

  function describe(exportName: string, extra: string[] = []): { description: string; docs: string } {
    const page = pageOf.get(exportName)
    const e = exportOf.get(exportName)
    if (!page || !e) throw new Error(`${exportName} is not a component export in the manifest`)
    const props = (e.props ?? [])
      .filter((p) => p.name !== 'className' && p.name !== 'ref')
      .map((p) => `${p.name}${p.required ? '' : '?'}: ${p.type}`)
    const lines = [
      `import { ${exportName} } from '${pkg}'`,
      '',
      page.summary,
      ...(props.length ? ['', `Props: ${props.join('; ')}`] : []),
      ...(page.usage?.practices?.length ? ['', ...page.usage.practices.map((p) => `Do: ${p.do} Don't: ${p.dont}`)] : []),
      ...(extra.length ? ['', ...extra] : []),
      '',
      `Storybook: ${page.docs}`,
    ]
    return { description: lines.join('\n'), docs: page.docs }
  }

  const components: ComponentSpec[] = []
  const entries: Record<string, MapEntry> = {}

  function add(
    spec: Omit<ComponentSpec, 'description' | 'docs'>,
    meta: { axes?: Record<string, MapAxis>; nonApi?: MapEntry['nonApi']; notDrawn?: Record<string, string>; extra?: string[] },
  ) {
    const { description, docs } = describe(spec.name, meta.extra)
    components.push({ ...spec, description, docs })
    const page = pageOf.get(spec.name)!
    const api = spec.properties.filter((p) => !p.nonApi)
    entries[spec.name] = {
      status: 'built',
      page: page.title,
      docs,
      figma: spec.name,
      variants: meta.axes ?? {},
      properties: Object.fromEntries(api.map((p) => [p.name, p.type])),
      nonApi: {
        ...(meta.nonApi ?? {}),
        ...Object.fromEntries(spec.properties.filter((p) => p.nonApi).map((p) => [p.name, 'BOOLEAN' as const])),
      },
      notDrawn: meta.notDrawn ?? {},
    }
  }

  /* ── helpers: _Slot ───────────────────────────────────────────────── */
  components.push({
    name: '_Slot',
    description: 'A placeholder for content a component wraps (its children). Swap it for an instance of your own; it is never published.',
    docs: '',
    axes: [],
    hidden: true,
    properties: [],
    variants: [
      {
        props: {},
        root: frame('_Slot', { layout: 'VERTICAL', width: 240, sizing: { h: 'FIXED', v: 'HUG' }, padding: pad(space(4), space(4)), fill: C('ink-soft') }, [
          text('hint', 'Slot: swap in your content', ui('sm', C('ink-2'))),
        ]),
      },
    ],
  })

  /* ── Button and IconButton ────────────────────────────────────────── */
  const BUTTON_FILL: Record<string, string> = { primary: 'ink', secondary: 'cloth-pale', danger: 'danger', ghost: 'cloth-pale' }
  const BUTTON_INK: Record<string, string> = { primary: 'on-ink', secondary: 'ink', danger: 'on-layer', ghost: 'ink' }
  const BUTTON_TEXT: Record<string, string> = { sm: '2xs', md: 'xs', lg: 'sm' }
  const BUTTON_H: Record<string, string> = { sm: 'control-h-sm', md: 'control-h', lg: 'control-h-lg' }
  const buttonSurface = (variant: string, state: State): Pick<FrameNodeSpec, 'fill' | 'effects'> => {
    if (state === 'disabled') return variant === 'ghost' ? { fill: C('cloth-pale', 0), effects: [] } : { fill: C('cloth-shade'), effects: cut() }
    if (variant === 'ghost') {
      if (state === 'hover') return { fill: C('ink-soft'), effects: [] }
      return { fill: C('cloth-pale', 0), effects: state === 'focus-visible' ? focusRing() : [] }
    }
    const fill = C(variant === 'danger' && state === 'hover' ? 'danger-strong' : BUTTON_FILL[variant]!)
    if (state === 'hover') return { fill, effects: cutBand(variant === 'danger' ? 'danger' : 'accent', 3) }
    return { fill, effects: state === 'focus-visible' ? focusRing() : cut() }
  }
  const buttonInk = (variant: string, state: State) => C(state === 'disabled' ? 'ink-muted' : BUTTON_INK[variant]!)

  const buttonAxes = [
    { name: 'variant', values: axisValues('Button', 'variant') },
    { name: 'size', values: axisValues('Button', 'size') },
    { name: 'disabled', values: BOOL },
    { name: 'state', values: [...STATES] },
  ]
  const DISABLED_NOTE = 'Base UI button prop; drawn stated, not faded: shade field, muted ink, keyline kept.'
  add(
    {
      name: 'Button',
      axes: buttonAxes,
      properties: [
        { name: 'children', type: 'TEXT', default: 'Start run' },
        { name: 'icon', type: 'INSTANCE_SWAP', default: 'Icon/Plus', preferred: ['Icon/Plus', 'Icon/Check', 'Icon/Search', 'Icon/X'] },
        { name: 'has icon', type: 'BOOLEAN', default: false, nonApi: true },
        { name: 'withArrow', type: 'BOOLEAN', default: false },
      ],
      variants: grid(buttonAxes, restWhenDisabled).map((p): VariantSpec => {
        const state = stateOf(p)
        const size = p.size!
        const ink = buttonInk(p.variant!, state)
        const iconSize = D(size === 'sm' ? 'icon-sm' : 'icon')
        const padX = size === 'sm' ? controlPx(0.75) : size === 'lg' ? controlPx(1.4) : D('control-px')
        return {
          props: p,
          root: frame('Button', {
            height: D(BUTTON_H[size]!),
            sizing: { h: 'HUG', v: 'FIXED' },
            padding: pad(0, padX),
            gap: space(2),
            align: { main: 'CENTER', cross: 'CENTER' },
            ...buttonSurface(p.variant!, state),
          }, [
            icon('Plus', iconSize, ink, { visible: 'has icon', swap: 'icon' }),
            text('children', 'Start run', ui(BUTTON_TEXT[size]!, ink, { label: true }), { characters: 'children' }),
            { ...icon('ArrowRight', iconSize, ink, { visible: 'withArrow' }), name: 'arrow' },
          ]),
        }
      }),
    },
    {
      axes: { variant: { values: buttonAxes[0]!.values }, size: { values: buttonAxes[1]!.values }, disabled: { values: BOOL, inherited: DISABLED_NOTE } },
      nonApi: { state: [...STATES] },
      notDrawn: { loading: 'A loading button is disabled plus a moving strip; draw disabled=true.', className: 'Code only.' },
    },
  )

  add(
    {
      name: 'IconButton',
      axes: buttonAxes,
      properties: [{ name: 'children', type: 'INSTANCE_SWAP', default: 'Icon/Plus', preferred: ['Icon/Plus', 'Icon/X', 'Icon/Search', 'Icon/Check'] }],
      variants: grid(buttonAxes, restWhenDisabled).map((p): VariantSpec => {
        const state = stateOf(p)
        const size = p.size!
        return {
          props: p,
          root: frame('IconButton', {
            width: D(BUTTON_H[size]!),
            height: D(BUTTON_H[size]!),
            sizing: { h: 'FIXED', v: 'FIXED' },
            align: { main: 'CENTER', cross: 'CENTER' },
            ...buttonSurface(p.variant!, state),
          }, [icon('Plus', D(size === 'sm' ? 'icon-sm' : 'icon'), buttonInk(p.variant!, state), { swap: 'children' })]),
        }
      }),
    },
    {
      axes: { variant: { values: buttonAxes[0]!.values }, size: { values: buttonAxes[1]!.values }, disabled: { values: BOOL, inherited: DISABLED_NOTE } },
      nonApi: { state: [...STATES] },
      notDrawn: { label: 'The accessible name and tooltip; never drawn. Required in code.', loading: 'Draw disabled=true.', className: 'Code only.' },
      extra: ['label is required in code: it is the accessible name and the tooltip.'],
    },
  )

  /* ── field controls: Input, SelectTrigger ─────────────────────────── */
  const FIELD_PX: Record<string, Num> = { sm: controlPx(0.75), md: D('control-px'), lg: controlPx(1.15) }
  const FIELD_TEXT: Record<string, string> = { sm: 'sm', md: 'base', lg: 'lg' }
  const fieldSurface = (state: State, invalid: boolean): Pick<FrameNodeSpec, 'fill' | 'effects'> => {
    if (state === 'disabled') return { fill: C('cloth-shade'), effects: cut() }
    if (invalid) return { fill: C('cloth-pale'), effects: state === 'focus-visible' ? [...cutBand('danger', 3), ...focusInset()] : cutBand('danger', 3) }
    if (state === 'hover') return { fill: C('cloth-pale'), effects: cutBand('accent', 3) }
    return { fill: C('cloth-pale'), effects: state === 'focus-visible' ? focusRing() : cut() }
  }

  const inputAxes = [
    { name: 'size', values: axisValues('Input', 'size') },
    { name: 'aria-invalid', values: BOOL },
    { name: 'disabled', values: BOOL },
    { name: 'state', values: [...STATES] },
  ]
  add(
    {
      name: 'Input',
      axes: inputAxes,
      properties: [
        { name: 'value', type: 'TEXT', default: 'run-2481' },
        { name: 'leading', type: 'INSTANCE_SWAP', default: 'Icon/Search', preferred: ['Icon/Search', 'Icon/Plus'] },
        { name: 'has leading', type: 'BOOLEAN', default: false, nonApi: true },
      ],
      variants: grid(inputAxes, restWhenDisabled).map((p): VariantSpec => {
        const state = stateOf(p)
        const size = p.size!
        const ink = C(state === 'disabled' ? 'ink-muted' : 'ink')
        return {
          props: p,
          root: frame('Input', {
            width: 240,
            height: D(BUTTON_H[size]!),
            sizing: { h: 'FIXED', v: 'FIXED' },
            padding: pad(0, FIELD_PX[size]!),
            gap: space(2),
            align: { main: 'MIN', cross: 'CENTER' },
            ...fieldSurface(state, p['aria-invalid'] === 'true'),
          }, [
            { ...icon('Search', D('icon'), C('ink-muted'), { visible: 'has leading', swap: 'leading' }), name: 'leading' },
            text('value', 'run-2481', ui(FIELD_TEXT[size]!, ink), { characters: 'value' }, true),
          ]),
        }
      }),
    },
    {
      axes: {
        size: { values: inputAxes[0]!.values },
        'aria-invalid': { values: BOOL, inherited: 'Set by Field when it has an error; the rojo band stays under focus.' },
        disabled: { values: BOOL, inherited: 'HTML input prop; drawn stated, not faded.' },
      },
      nonApi: { state: [...STATES] },
      notDrawn: { trailing: 'Draw it beside the value by hand for now.', placeholder: 'Set the value text in ink-muted.', className: 'Code only.' },
    },
  )

  const triggerAxes = [
    { name: 'size', values: axisValues('SelectTrigger', 'size') },
    { name: 'disabled', values: BOOL },
    { name: 'state', values: [...STATES] },
  ]
  add(
    {
      name: 'SelectTrigger',
      axes: triggerAxes,
      properties: [{ name: 'children', type: 'TEXT', default: 'Panamá Norte' }],
      variants: grid(triggerAxes, restWhenDisabled).map((p): VariantSpec => {
        const state = stateOf(p)
        const size = p.size!
        return {
          props: p,
          root: frame('SelectTrigger', {
            width: 240,
            height: D(BUTTON_H[size]!),
            sizing: { h: 'FIXED', v: 'FIXED' },
            padding: pad(0, FIELD_PX[size]!),
            gap: space(3),
            align: { main: 'SPACE_BETWEEN', cross: 'CENTER' },
            ...fieldSurface(state, false),
          }, [
            text('children', 'Panamá Norte', ui(FIELD_TEXT[size]!, C(state === 'disabled' ? 'ink-muted' : 'ink')), { characters: 'children' }, true),
            icon('ChevronsUpDown', D('icon'), C('ink-muted')),
          ]),
        }
      }),
    },
    {
      axes: { size: { values: triggerAxes[0]!.values }, disabled: { values: BOOL, inherited: 'Base UI Select.Trigger prop; drawn stated, not faded.' } },
      nonApi: { state: [...STATES] },
      notDrawn: { placeholder: 'Set the text in ink-muted.', className: 'Code only.' },
      extra: ['Inside a Select, the popup is not drawn yet: Select, SelectContent and SelectItem are pending in the component map.'],
    },
  )

  /* ── Field ────────────────────────────────────────────────────────── */
  const rotulo = (fill: Paint) => ui('2xs', fill, { label: true })
  add(
    {
      name: 'Field',
      axes: [],
      properties: [
        { name: 'label', type: 'TEXT', default: 'Run name' },
        { name: 'required', type: 'BOOLEAN', default: false },
        { name: 'optional', type: 'BOOLEAN', default: false },
        { name: 'children', type: 'INSTANCE_SWAP', default: 'Input', preferred: ['Input', 'SelectTrigger'] },
        { name: 'hint', type: 'TEXT', default: 'Shown on the runs list.' },
        { name: 'has hint', type: 'BOOLEAN', default: true, nonApi: true },
        { name: 'error', type: 'TEXT', default: 'Give the run a name.' },
        { name: 'has error', type: 'BOOLEAN', default: false, nonApi: true },
      ],
      variants: [
        {
          props: {},
          root: frame('Field', { layout: 'VERTICAL', width: 280, sizing: { h: 'FIXED', v: 'HUG' }, gap: space(2) }, [
            frame('header', { gap: space(0.5), sizing: { h: 'HUG', v: 'HUG' }, align: { main: 'MIN', cross: 'BASELINE' } }, [
              text('label', 'Run name', rotulo(C('ink-2')), { characters: 'label' }),
              text('required', '*', rotulo(C('ink')), { visible: 'required' }),
              text('optional', 'Optional', { ...rotulo(C('ink-muted')), style: 'Medium', upper: false, letterSpacing: ratio('tracking-figures') }, { visible: 'optional' }),
            ]),
            { kind: 'instance', name: 'control', of: 'Input', variant: { size: 'md', 'aria-invalid': 'false', disabled: 'false', state: 'rest' }, fill: true, prop: { swap: 'children' } },
            text('hint', 'Shown on the runs list.', ui('xs', C('ink-muted'), { line: LINE.snug }), { characters: 'hint', visible: 'has hint' }),
            frame('error', { gap: space(2), sizing: { h: 'HUG', v: 'HUG' }, align: { main: 'MIN', cross: 'CENTER' }, prop: { visible: 'has error' } }, [
              frame('marker', { width: space(2), height: space(2), sizing: { h: 'FIXED', v: 'FIXED' }, fill: C('danger'), effects: cut() }, []),
              text('error', 'Give the run a name.', ui('xs', C('ink-danger'), { weight: 'Medium', line: LINE.snug }), { characters: 'error' }),
            ]),
          ]),
        },
      ],
    },
    {
      notDrawn: { description: 'An alias of hint; use hint.', labelAside: 'Draw it at the header’s end by hand for now.' },
      extra: ['children is a render function in code that receives the control props; here it is an instance swap. Show an error with has error and set the control to aria-invalid=true.'],
    },
  )

  /* ── Checkbox, Radio, Switch ──────────────────────────────────────── */
  const choiceLabel = (state: State, labelProp = 'label'): FrameNodeSpec =>
    frame('text', { layout: 'VERTICAL', gap: space(0.5), sizing: { h: 'HUG', v: 'HUG' } }, [
      text('label', 'Stream partial output', ui('base', C(state === 'disabled' ? 'ink-muted' : 'ink'), { line: LINE.snug }), { characters: labelProp }),
      text('description', 'Tokens appear as the model writes them.', ui('xs', C('ink-muted')), { characters: 'description', visible: 'has description' }),
    ])
  const choiceProps: PropertySpec[] = [
    { name: 'label', type: 'TEXT', default: 'Stream partial output' },
    { name: 'description', type: 'TEXT', default: 'Tokens appear as the model writes them.' },
    { name: 'has description', type: 'BOOLEAN', default: false, nonApi: true },
  ]
  const boxEffects = (state: State, band = 'accent') => (state === 'hover' ? cutBand(band, 2) : state === 'focus-visible' ? focusRing() : cut())
  /** The box sits in a span one line of label tall, so it centres on the first line. */
  const firstLine = (child: FrameNodeSpec): FrameNodeSpec =>
    frame('control', { height: Math.round(((values.get('Density/text-base') as number) * LINE.snug) / 100 * 100) / 100, sizing: { h: 'HUG', v: 'FIXED' }, align: { main: 'MIN', cross: 'CENTER' } }, [child])

  const checkboxAxes = [
    { name: 'checked', values: BOOL },
    { name: 'indeterminate', values: BOOL },
    { name: 'disabled', values: BOOL },
    { name: 'state', values: [...STATES] },
  ]
  add(
    {
      name: 'Checkbox',
      axes: checkboxAxes,
      properties: choiceProps,
      variants: grid(checkboxAxes, (p) => restWhenDisabled(p) && !(p.checked === 'true' && p.indeterminate === 'true')).map((p): VariantSpec => {
        const state = stateOf(p)
        const on = p.checked === 'true' || p.indeterminate === 'true'
        const fill = state === 'disabled' ? C(on ? 'cloth-deep' : 'cloth-shade') : C(on ? 'ink' : 'cloth-pale')
        const mark = state === 'disabled' ? C('ink-2') : C('on-ink')
        return {
          props: p,
          root: frame('Checkbox', { gap: space(2.5), sizing: { h: 'HUG', v: 'HUG' }, align: { main: 'MIN', cross: 'MIN' } }, [
            firstLine(
              frame('box', { width: space(4), height: space(4), sizing: { h: 'FIXED', v: 'FIXED' }, align: { main: 'CENTER', cross: 'CENTER' }, fill, effects: boxEffects(state) },
                on ? [icon(p.indeterminate === 'true' ? 'Minus' : 'Check', D('icon-xs'), mark)] : []),
            ),
            choiceLabel(state),
          ]),
        }
      }),
    },
    {
      axes: {
        checked: { values: BOOL, inherited: 'Base UI Checkbox.Root prop.' },
        indeterminate: { values: BOOL, inherited: 'Base UI Checkbox.Root prop; wins over checked, so checked=true with it is not drawn.' },
        disabled: { values: BOOL, inherited: 'Base UI Checkbox.Root prop; drawn stated, not faded.' },
      },
      nonApi: { state: [...STATES] },
      notDrawn: { wrapperClassName: 'Code only.', className: 'Code only.' },
    },
  )

  const radioAxes = [
    { name: 'checked', values: BOOL },
    { name: 'disabled', values: BOOL },
    { name: 'state', values: [...STATES] },
  ]
  add(
    {
      name: 'Radio',
      axes: radioAxes,
      properties: choiceProps,
      variants: grid(radioAxes, restWhenDisabled).map((p): VariantSpec => {
        const state = stateOf(p)
        const dot = frame('indicator', { width: space(2), height: space(2), sizing: { h: 'FIXED', v: 'FIXED' }, fill: C(state === 'disabled' ? 'ink-muted' : 'ink') }, [])
        return {
          props: p,
          root: frame('Radio', { gap: space(2.5), sizing: { h: 'HUG', v: 'HUG' }, align: { main: 'MIN', cross: 'MIN' } }, [
            firstLine(
              frame('box', {
                width: space(4),
                height: space(4),
                sizing: { h: 'FIXED', v: 'FIXED' },
                align: { main: 'CENTER', cross: 'CENTER' },
                fill: C(state === 'disabled' ? 'cloth-shade' : 'cloth-pale'),
                effects: boxEffects(state),
              }, p.checked === 'true' ? [dot] : []),
            ),
            choiceLabel(state),
          ]),
        }
      }),
    },
    {
      axes: {
        checked: { values: BOOL, inherited: 'Set by RadioGroup’s value; the square is Mola’s radio, the dot is the state.' },
        disabled: { values: BOOL, inherited: 'Base UI Radio.Root prop; drawn stated, not faded.' },
      },
      nonApi: { state: [...STATES] },
      notDrawn: { value: 'Code only: what the group reports.', wrapperClassName: 'Code only.', className: 'Code only.' },
    },
  )

  const switchAxes = [
    { name: 'checked', values: BOOL },
    { name: 'labelPosition', values: axisValues('Switch', 'labelPosition') },
    { name: 'disabled', values: BOOL },
    { name: 'state', values: [...STATES] },
  ]
  add(
    {
      name: 'Switch',
      axes: switchAxes,
      properties: choiceProps,
      variants: grid(switchAxes, restWhenDisabled).map((p): VariantSpec => {
        const state = stateOf(p)
        const on = p.checked === 'true'
        const thumb = frame('thumb', {
          width: space(3.5),
          height: space(3.5),
          sizing: { h: 'FIXED', v: 'FIXED' },
          fill: C(state === 'disabled' ? 'ink-muted' : on ? 'on-layer' : 'ink'),
          ...(on && state !== 'disabled' ? { effects: cut() } : {}),
        }, [])
        const track = frame('track', {
          width: space(9),
          height: space(5),
          sizing: { h: 'FIXED', v: 'FIXED' },
          padding: pad(3, 3),
          align: { main: on ? 'MAX' : 'MIN', cross: 'CENTER' },
          fill: C(state === 'disabled' ? 'cloth-shade' : on ? 'verde' : 'cloth-shade'),
          effects: boxEffects(state),
        }, [thumb])
        const start = p.labelPosition === 'start'
        const label = choiceLabel(state)
        return {
          props: p,
          root: frame('Switch', { gap: start ? space(4) : space(2.5), sizing: { h: 'HUG', v: 'HUG' }, align: { main: 'MIN', cross: 'MIN' } },
            start ? [label, firstLine(track)] : [firstLine(track), label]),
        }
      }),
    },
    {
      axes: {
        checked: { values: BOOL, inherited: 'Base UI Switch.Root prop.' },
        labelPosition: { values: switchAxes[1]!.values },
        disabled: { values: BOOL, inherited: 'Base UI Switch.Root prop; drawn stated, not faded.' },
      },
      nonApi: { state: [...STATES] },
      notDrawn: { wrapperClassName: 'Code only.', className: 'Code only.' },
      extra: ['On is verde AND the thumb moves to the end: state is never colour alone.'],
    },
  )

  /* ── Badge ────────────────────────────────────────────────────────── */
  const BADGE: Record<string, Record<string, { fill?: string; ink: string; edge?: string; bar?: boolean }>> = {
    solid: {
      neutral: { fill: 'ink', ink: 'on-ink' },
      info: { fill: 'anil', ink: 'on-layer', edge: 'ink' },
      success: { fill: 'verde', ink: 'on-layer', edge: 'ink' },
      danger: { fill: 'danger', ink: 'on-layer', edge: 'ink' },
      warn: { fill: 'oro', ink: 'on-oro', edge: 'ink' },
      accent: { fill: 'accent', ink: 'on-accent', edge: 'ink' },
    },
    soft: {
      neutral: { fill: 'ink-soft', ink: 'ink' },
      info: { fill: 'anil-soft', ink: 'anil' },
      success: { fill: 'verde-soft', ink: 'verde' },
      danger: { fill: 'danger-soft', ink: 'ink-danger' },
      warn: { fill: 'oro-soft', ink: 'ink-2' },
      accent: { fill: 'accent-soft', ink: 'ink' },
    },
    outline: {
      neutral: { fill: 'cloth-pale', ink: 'ink-2', edge: 'ink-muted' },
      info: { fill: 'cloth-pale', ink: 'anil', edge: 'anil' },
      success: { fill: 'cloth-pale', ink: 'verde', edge: 'verde' },
      danger: { fill: 'cloth-pale', ink: 'ink-danger', edge: 'danger' },
      warn: { fill: 'cloth-pale', ink: 'ink-warn', edge: 'warn' },
      accent: { fill: 'cloth-pale', ink: 'ink', edge: 'ink', bar: true },
    },
  }
  const DOT: Record<string, string> = { neutral: 'ink-muted', info: 'anil', success: 'verde', warn: 'oro', danger: 'danger', accent: 'accent' }
  const badgeAxes = [
    { name: 'tone', values: axisValues('Badge', 'tone') },
    { name: 'variant', values: axisValues('Badge', 'variant') },
  ]
  add(
    {
      name: 'Badge',
      axes: badgeAxes,
      properties: [
        { name: 'children', type: 'TEXT', default: 'Running' },
        { name: 'dot', type: 'BOOLEAN', default: false },
      ],
      variants: grid(badgeAxes).map((p): VariantSpec => {
        const look = BADGE[p.variant!]?.[p.tone!]
        if (!look) throw new Error(`Badge has no look for ${p.variant}/${p.tone}: add it to figma/src/components.ts`)
        const effects = [...(look.bar ? [ring(0, C('accent'), 'INNER_SHADOW', 0, -(values.get('Scale/bar-w') as number))] : []), ...(look.edge ? cut(look.edge) : [])]
        const thin = p.tone === 'warn' || p.tone === 'accent'
        const dot = frame('dot', {
          width: 7,
          height: 7,
          sizing: { h: 'FIXED', v: 'FIXED' },
          fill: C(p.variant === 'solid' ? look.ink : DOT[p.tone!]!),
          ...(thin && p.variant !== 'solid' ? { effects: [ring(S('rule-w'), C('ink'))] } : {}),
          prop: { visible: 'dot' },
        }, [])
        return {
          props: p,
          root: frame('Badge', {
            sizing: { h: 'HUG', v: 'HUG' },
            padding: pad(5, space(2)),
            gap: space(1.5),
            align: { main: 'MIN', cross: 'CENTER' },
            fill: C(look.fill!),
            ...(effects.length ? { effects } : {}),
          }, [dot, text('children', 'Running', rotulo(C(look.ink)), { characters: 'children' })]),
        }
      }),
    },
    {
      axes: { tone: { values: badgeAxes[0]!.values }, variant: { values: badgeAxes[1]!.values } },
      notDrawn: { pulse: 'Motion: code only.' },
      extra: ['A tone names a state with a word as well as a colour; keep the word.'],
    },
  )

  /* ── Chip ─────────────────────────────────────────────────────────── */
  const chipSizes = axisValues('Chip', 'size')
  const DEPRECATED_CHIP = ['default', 'comfortable']
  const chipAxes = [
    { name: 'size', values: chipSizes.filter((s) => !DEPRECATED_CHIP.includes(s)) },
    { name: 'checked', values: BOOL },
    { name: 'disabled', values: BOOL },
    { name: 'state', values: [...STATES] },
  ]
  add(
    {
      name: 'Chip',
      axes: chipAxes,
      properties: [
        { name: 'children', type: 'TEXT', default: 'Failed' },
        { name: 'count', type: 'TEXT', default: '12' },
        { name: 'has count', type: 'BOOLEAN', default: false, nonApi: true },
      ],
      variants: grid(chipAxes, restWhenDisabled).map((p): VariantSpec => {
        const state = stateOf(p)
        const on = p.checked === 'true'
        const sm = p.size === 'sm'
        const fill = C(state === 'disabled' ? 'cloth-shade' : on ? 'ink' : 'cloth-pale')
        const ink = C(state === 'disabled' ? 'ink-muted' : on ? 'on-ink' : state === 'hover' ? 'ink' : 'ink-2')
        const effects = state === 'focus-visible' ? focusRing() : state === 'hover' && !on ? cutBand('accent', 3) : cut()
        return {
          props: p,
          root: frame('Chip', {
            ...(sm ? { height: D('control-h-sm'), sizing: { h: 'HUG', v: 'FIXED' } } : { sizing: { h: 'HUG', v: 'HUG' } }),
            padding: sm ? pad(0, controlPx(0.85)) : pad(space(2), D('control-px')),
            gap: space(1.5),
            align: { main: 'MIN', cross: 'CENTER' },
            fill,
            effects,
          }, [
            text('children', 'Failed', ui('sm', ink, { line: sm ? LINE.none : LINE.snug }), { characters: 'children' }),
            text('count', '12', ui('xs', C(state === 'disabled' ? 'ink-muted' : on ? 'on-ink-muted' : 'ink-muted')), { characters: 'count', visible: 'has count' }),
          ]),
        }
      }),
    },
    {
      axes: {
        size: { values: chipAxes[0]!.values },
        checked: { values: BOOL, inherited: 'HTML input prop (the chip is a checkbox or radio).' },
        disabled: { values: BOOL, inherited: 'HTML input prop; drawn stated, not faded.' },
      },
      nonApi: { state: [...STATES] },
      notDrawn: {
        type: 'checkbox or radio: behaviour only, the same look.',
        ...Object.fromEntries(DEPRECATED_CHIP.filter((s) => chipSizes.includes(s)).map((s) => [`size="${s}"`, 'Deprecated alias; not drawn.'])),
      },
    },
  )

  /* ── Callout ──────────────────────────────────────────────────────── */
  const CALLOUT: Record<string, { fill: string; band: string; icon: string; ink: string }> = {
    neutral: { fill: 'ink-soft', band: 'cloth', icon: 'Info', ink: 'ink-2' },
    info: { fill: 'anil-soft', band: 'anil', icon: 'Info', ink: 'anil' },
    success: { fill: 'verde-soft', band: 'verde', icon: 'CircleCheck', ink: 'verde' },
    warn: { fill: 'oro-soft', band: 'oro', icon: 'TriangleAlert', ink: 'ink-warn' },
    danger: { fill: 'danger-soft', band: 'danger', icon: 'CircleAlert', ink: 'ink-danger' },
  }
  const calloutAxes = [
    { name: 'tone', values: axisValues('Callout', 'tone') },
    { name: 'variant', values: axisValues('Callout', 'variant') },
  ]
  add(
    {
      name: 'Callout',
      axes: calloutAxes,
      properties: [
        { name: 'title', type: 'TEXT', default: 'Run paused' },
        { name: 'has title', type: 'BOOLEAN', default: true, nonApi: true },
        { name: 'children', type: 'TEXT', default: 'The agent is waiting for approval before it writes to the Cayuco ledger.' },
        { name: 'has icon', type: 'BOOLEAN', default: true, nonApi: true },
      ],
      variants: grid(calloutAxes).map((p): VariantSpec => {
        const look = CALLOUT[p.tone!]
        if (!look) throw new Error(`Callout has no look for tone ${p.tone}: add it to figma/src/components.ts`)
        const flat = p.variant === 'flat'
        return {
          props: p,
          root: frame('Callout', { layout: 'VERTICAL', width: 400, sizing: { h: 'FIXED', v: 'HUG' }, fill: C(look.fill), ...(flat ? {} : { effects: cut() }) }, [
            ...(flat ? [] : [frame('seam', { height: space(2), sizing: { h: 'FILL', v: 'FIXED' }, fill: C(look.band) }, [])]),
            frame('content', {
              sizing: { h: 'FILL', v: 'HUG' },
              padding: flat ? pad(space(3), space(4)) : { top: space(3.5), right: space(4), bottom: space(4), left: space(4) },
              gap: flat ? space(2.5) : space(3),
              align: { main: 'MIN', cross: 'MIN' },
            }, [
              icon(look.icon, D(flat ? 'icon-sm' : 'icon-lg'), C(look.ink), { visible: 'has icon' }),
              frame('text', { layout: 'VERTICAL', sizing: { h: 'FILL', v: 'HUG' }, gap: space(1) }, [
                text('title', 'Run paused', ui('sm', C('ink'), { weight: 'SemiBold', line: LINE.snug }), { characters: 'title', visible: 'has title' }),
                text('body', 'The agent is waiting for approval before it writes to the Cayuco ledger.', ui('sm', C('ink-2'), { line: LINE.body }), { characters: 'children' }, true),
              ]),
            ]),
          ]),
        }
      }),
    },
    {
      axes: { tone: { values: calloutAxes[0]!.values }, variant: { values: calloutAxes[1]!.values } },
      notDrawn: {
        actions: 'Place Buttons under the body by hand for now.',
        onDismiss: 'Place a ghost sm IconButton with Icon/X at the top end by hand for now.',
        icon: 'Each tone draws its own icon; has icon hides it, as icon={false} does.',
        headingLevel: 'Semantics only.',
      },
      extra: ['The seam is drawn as a solid band of the tone; in code it is the relleno strip.'],
    },
  )

  /* ── TabsTab ──────────────────────────────────────────────────────── */
  const tabVariants = axisValues('Tabs', 'variant')
  const tabAxes = [
    { name: 'variant', values: tabVariants },
    { name: 'selected', values: BOOL },
    { name: 'disabled', values: BOOL },
    { name: 'state', values: [...STATES] },
  ]
  const barW = values.get('Scale/bar-w') as number
  const reveal = values.get('Scale/cut-reveal') as number
  add(
    {
      name: 'TabsTab',
      axes: tabAxes,
      properties: [
        { name: 'children', type: 'TEXT', default: 'Steps' },
        { name: 'count', type: 'TEXT', default: '4' },
        { name: 'has count', type: 'BOOLEAN', default: false, nonApi: true },
      ],
      variants: grid(tabAxes, restWhenDisabled).map((p): VariantSpec => {
        const state = stateOf(p)
        const on = p.selected === 'true'
        const panel = p.variant === 'panel'
        const ink = C(state === 'disabled' ? 'ink-muted' : on || state === 'hover' ? 'ink' : 'ink-2')
        let fill: Paint = C('cloth-pale', 0)
        let effects: EffectLayer[] = []
        if (panel) {
          fill = C(on ? 'cloth-pale' : state === 'hover' ? 'cloth-deep' : 'cloth-shade')
          // cut-tab: keylines on three sides, and the band above the active
          // tab with its own keyline, drawn as offset copies of the tab.
          if (on) effects = [ring(0, C('ink'), 'DROP_SHADOW', 0, -(reveal + cutWidth * 2)), ring(0, C('accent'), 'DROP_SHADOW', 0, -(reveal + cutWidth)), ring(0, C('ink'), 'DROP_SHADOW', -cutWidth, 0), ring(0, C('ink'), 'DROP_SHADOW', cutWidth, 0), ring(0, C('ink'), 'DROP_SHADOW', 0, -cutWidth)]
        } else if (on) {
          effects = [ring(0, C('ink'), 'INNER_SHADOW', 0, -barW)]
        }
        if (state === 'focus-visible') effects = [...effects, ...focusInset()]
        return {
          props: p,
          root: frame('TabsTab', {
            height: D('control-h'),
            sizing: { h: 'HUG', v: 'FIXED' },
            padding: pad(0, D('control-px')),
            gap: space(2),
            align: { main: 'CENTER', cross: 'CENTER' },
            fill,
            effects,
          }, [
            text('children', 'Steps', ui('sm', ink, { weight: 'SemiBold' }), { characters: 'children' }),
            frame('count', {
              sizing: { h: 'HUG', v: 'HUG' },
              padding: pad(space(0.5), space(1.5)),
              align: { main: 'CENTER', cross: 'CENTER' },
              fill: C(on ? 'ink' : 'ink-soft'),
              prop: { visible: 'has count' },
            }, [text('count', '4', ui('2xs', C(on ? 'on-ink' : 'ink-2'), { line: LINE.none }), { characters: 'count' })]),
          ]),
        }
      }),
    },
    {
      axes: {
        variant: { values: tabVariants, inherited: 'Set on Tabs (variant), read by every tab.' },
        disabled: { values: BOOL, inherited: 'Base UI Tabs.Tab prop; drawn stated, not faded.' },
      },
      nonApi: { selected: BOOL, state: [...STATES] },
      notDrawn: { icon: 'Place an icon before the label by hand for now.', value: 'Code only: what Tabs selects.', className: 'Code only.' },
      extra: ['selected is decided by Tabs’ value, not a prop of the tab. TabsList and TabsPanel are pending in the component map.'],
    },
  )

  /* ── Panel ────────────────────────────────────────────────────────── */
  const LAYER: Record<string, string> = { pale: 'cloth-pale', cloth: 'cloth', shade: 'cloth-shade', ink: 'ink', rojo: 'rojo', anil: 'anil', verde: 'verde', oro: 'oro' }
  const PANEL_PAD: Record<string, number> = { none: 0, sm: 3, md: 5, lg: 8 }
  const BAND: Record<string, string> = { oro: 'oro', rojo: 'rojo', anil: 'anil', verde: 'verde', cloth: 'cloth' }
  const panelAxes = [
    { name: 'layer', values: axisValues('Panel', 'layer') },
    { name: 'edge', values: axisValues('Panel', 'edge') },
    { name: 'padding', values: axisValues('Panel', 'padding') },
    { name: 'band', values: axisValues('Panel', 'band') },
  ]
  add(
    {
      name: 'Panel',
      axes: panelAxes,
      properties: [{ name: 'children', type: 'INSTANCE_SWAP', default: '_Slot' }],
      // The band only shows on edge="band"; elsewhere it is drawn at its default.
      variants: grid(panelAxes, (p) => p.edge === 'band' || p.band === 'oro').map((p): VariantSpec => {
        const layer = LAYER[p.layer!]
        const step = PANEL_PAD[p.padding!]
        const band = BAND[p.band!]
        if (!layer || step === undefined || !band) throw new Error(`Panel has no look for ${JSON.stringify(p)}: add it to figma/src/components.ts`)
        const effects = p.edge === 'cut' ? cut(p.layer === 'ink' ? 'keyline-on-ink' : 'ink') : p.edge === 'band' ? cutBand(band, reveal) : []
        const inset = step === 0 ? 0 : space(step)
        return {
          props: p,
          root: frame('Panel', {
            layout: 'VERTICAL',
            width: 320,
            sizing: { h: 'FIXED', v: 'HUG' },
            padding: pad(inset, inset),
            fill: C(layer),
            ...(effects.length ? { effects } : {}),
          }, [{ kind: 'instance', name: 'children', of: '_Slot', fill: true, prop: { swap: 'children' } }]),
        }
      }),
    },
    {
      axes: {
        layer: { values: panelAxes[0]!.values },
        edge: { values: panelAxes[1]!.values },
        padding: { values: panelAxes[2]!.values },
        band: { values: panelAxes[3]!.values },
      },
      notDrawn: { as: 'Semantics only.', tone: 'Deprecated alias of layer; not drawn.' },
      extra: ['band only shows with edge="band"; with another edge it is drawn at its default, oro.'],
    },
  )

  /* ── the map ──────────────────────────────────────────────────────── */
  const all: Record<string, MapEntry> = {}
  for (const c of manifest.components) {
    for (const e of c.exports) {
      if (e.kind !== 'component') continue
      all[e.name] = entries[e.name] ?? { status: 'pending', page: c.title, docs: c.docs }
    }
  }
  const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)))
  return {
    components,
    map: {
      $comment: 'Generated by scripts/export-figma.ts from docs/ai/components.json. Do not edit: run `npm run figma`.',
      package: pkg,
      components: sorted,
      figmaOnly: {
        _Slot: 'A placeholder for children, swapped for your own instance; hidden from publishing.',
        'Icon/*': 'lucide-react icons, named by their export: import them from lucide-react.',
      },
    },
  }
}
