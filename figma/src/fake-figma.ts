/**
 * A small fake of the Figma plugin API for plugin.test.ts: enough of the
 * surface in api.ts to run the plugin end to end in Node.
 *
 * It is strict where Figma is strict and a mistake would only show up in the
 * owner's file: an auto-layout sizing that needs an auto-layout parent, text
 * edited before its font is loaded, a shadow spread on a node without a fill
 * and clipped content (Figma ignores it; here it throws), a property
 * reference to a property the component does not have, and variant names
 * that do not share one set of axes.
 */
import type {
  ComponentPropertyDefinitions,
  ComponentPropertyType,
  EffectStyle,
  FigmaApi,
  FontName,
  InstanceSwapPreferredValue,
  RGBA,
  ShadowEffect,
  SolidPaint,
  VariableAlias,
  VariableResolvedDataType,
  VariableValue,
} from './api'

let ids = 0
const nextId = (prefix: string) => `${prefix}:${++ids}`

export class FakeVariable {
  readonly id = nextId('VariableID')
  description = ''
  hiddenFromPublishing = false
  scopes: string[] = ['ALL_SCOPES']
  readonly valuesByMode: Record<string, VariableValue> = {}
  codeSyntax: { WEB?: string } = {}
  removed = false
  constructor(
    public name: string,
    readonly variableCollectionId: string,
    readonly resolvedType: VariableResolvedDataType,
    private readonly fake: FakeFigma,
  ) {}
  setValueForMode(modeId: string, value: VariableValue) {
    const collection = this.fake.collections.find((c) => c.id === this.variableCollectionId)!
    if (!collection.modes.some((m) => m.modeId === modeId)) throw new Error(`No mode ${modeId} in ${collection.name}`)
    if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
      const target = this.fake.variables.find((v) => v.id === value.id)
      if (!target || target.resolvedType !== this.resolvedType) throw new Error(`Alias ${value.id} does not match ${this.name}`)
    } else if ((this.resolvedType === 'COLOR') !== (typeof value === 'object')) throw new Error(`Value of the wrong type for ${this.name}`)
    this.valuesByMode[modeId] = value
  }
  setVariableCodeSyntax(platform: 'WEB' | 'ANDROID' | 'iOS', value: string) {
    if (platform === 'WEB') this.codeSyntax = { WEB: value }
  }
  remove() {
    this.removed = true
    this.fake.variables.splice(this.fake.variables.indexOf(this), 1)
  }
}

export class FakeCollection {
  readonly id = nextId('VariableCollectionId')
  hiddenFromPublishing = false
  modes: { modeId: string; name: string }[] = [{ modeId: nextId('mode'), name: 'Mode 1' }]
  constructor(
    public name: string,
    private readonly fake: FakeFigma,
  ) {}
  get defaultModeId() {
    return this.modes[0]!.modeId
  }
  get variableIds() {
    return this.fake.variables.filter((v) => v.variableCollectionId === this.id).map((v) => v.id)
  }
  addMode(name: string) {
    // Figma's Professional plan allows four modes per collection.
    if (this.modes.length >= 4) throw new Error('Too many modes')
    const mode = { modeId: nextId('mode'), name }
    this.modes = [...this.modes, mode]
    return mode.modeId
  }
  renameMode(modeId: string, name: string) {
    this.modes = this.modes.map((m) => (m.modeId === modeId ? { ...m, name } : m))
  }
}

const AUTO_LAYOUT_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET', 'INSTANCE'])

export class FakeNode {
  readonly id: string
  name = ''
  parent: FakeNode | null = null
  children: FakeNode[] = []
  x = 0
  y = 0
  width = 100
  height = 100
  visible = true
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL' = 'NONE'
  primaryAxisAlignItems = 'MIN'
  counterAxisAlignItems = 'MIN'
  paddingTop = 0
  paddingRight = 0
  paddingBottom = 0
  paddingLeft = 0
  itemSpacing = 0
  fills: SolidPaint[] = []
  strokes: SolidPaint[] = []
  private _effects: ShadowEffect[] = []
  clipsContent = false
  cornerRadius = 0
  layoutPositioning: 'AUTO' | 'ABSOLUTE' = 'AUTO'
  constraints = { horizontal: 'MIN', vertical: 'MIN' }
  readonly bound: Record<string, string | null> = {}
  private _refs: Record<string, string> | null = null
  private _sizingH: 'FIXED' | 'HUG' | 'FILL' = 'FIXED'
  private _sizingV: 'FIXED' | 'HUG' | 'FILL' = 'FIXED'
  // text
  private _characters = ''
  private _font: FontName = { family: 'Inter', style: 'Regular' }
  fontSize = 12
  lineHeight: unknown = { unit: 'AUTO' }
  letterSpacing: unknown = { unit: 'PERCENT', value: 0 }
  textCase = 'ORIGINAL'
  textAutoResize = 'WIDTH_AND_HEIGHT'
  // components
  description = ''
  documentationLinks: { uri: string }[] = []
  readonly definitions: ComponentPropertyDefinitions = {}
  mainComponent: FakeNode | null = null

  constructor(
    readonly type: string,
    protected readonly fake: FakeFigma,
  ) {
    this.id = nextId(type)
  }

  get key() {
    return `key-${this.id}`
  }

  appendChild(child: FakeNode) {
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1)
    this.children.push(child)
    child.parent = this
  }
  remove() {
    if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1)
    this.parent = null
  }
  findAll(callback: (node: FakeNode) => boolean = () => true): FakeNode[] {
    return this.children.flatMap((c) => [...(callback(c) ? [c] : []), ...c.findAll(callback)])
  }
  resize(width: number, height: number) {
    this.width = width
    this.height = height
    if (this._sizingH === 'HUG') this._sizingH = 'FIXED'
    if (this._sizingV === 'HUG') this._sizingV = 'FIXED'
  }
  resizeWithoutConstraints(width: number, height: number) {
    this.width = width
    this.height = height
  }
  rescale(scale: number) {
    if (scale < 0.01) throw new Error('Scale too small')
    this.width *= scale
    this.height *= scale
  }
  setBoundVariable(field: string, variable: FakeVariable | null) {
    if (variable && variable.resolvedType !== 'FLOAT' && variable.resolvedType !== 'STRING') throw new Error(`Cannot bind ${variable.resolvedType} to ${field}`)
    if (field === 'fontFamily' && variable?.resolvedType !== 'STRING') throw new Error('fontFamily needs a STRING variable')
    this.bound[field] = variable ? variable.id : null
  }

  get effects() {
    return this._effects
  }
  set effects(effects: ShadowEffect[]) {
    const spread = effects.some((e) => (e.spread ?? 0) !== 0)
    if (spread && !(this.clipsContent && this.fills.some((f) => f.visible !== false))) {
      throw new Error(`${this.name}: a shadow spread needs a visible fill and clipsContent`)
    }
    this._effects = effects
  }

  private checkSizing(value: 'FIXED' | 'HUG' | 'FILL') {
    if (value === 'FILL' && !(this.parent && this.parent.layoutMode !== 'NONE')) throw new Error(`${this.name}: FILL needs an auto-layout parent`)
    if (value === 'HUG' && this.type !== 'TEXT' && !(AUTO_LAYOUT_TYPES.has(this.type) && this.layoutMode !== 'NONE')) {
      throw new Error(`${this.name}: HUG needs auto layout`)
    }
  }
  get layoutSizingHorizontal() {
    return this._sizingH
  }
  set layoutSizingHorizontal(value) {
    this.checkSizing(value)
    this._sizingH = value
  }
  get layoutSizingVertical() {
    return this._sizingV
  }
  set layoutSizingVertical(value) {
    this.checkSizing(value)
    this._sizingV = value
  }

  get componentPropertyReferences() {
    return this._refs
  }
  set componentPropertyReferences(refs: Record<string, string> | null) {
    let owner = this.parent
    while (owner && owner.type !== 'COMPONENT' && owner.type !== 'COMPONENT_SET') owner = owner.parent
    if (owner?.type === 'COMPONENT' && owner.parent?.type === 'COMPONENT_SET') owner = owner.parent
    if (!owner) throw new Error(`${this.name} is not inside a component`)
    for (const key of Object.values(refs ?? {})) {
      if (!owner.definitions[key]) throw new Error(`${owner.name} has no property ${key}`)
    }
    this._refs = refs
  }

  get fontName() {
    return this._font
  }
  set fontName(font: FontName) {
    if (!this.fake.loaded.has(`${font.family}/${font.style}`)) throw new Error(`Font ${font.family} ${font.style} is not loaded`)
    if (font.variationSettings && !this.fake.variableFamilies.has(font.family)) throw new Error(`${font.family} has no axis wdth`)
    this._font = font
  }
  get characters() {
    return this._characters
  }
  set characters(value: string) {
    if (!this.fake.loaded.has(`${this._font.family}/${this._font.style}`)) throw new Error(`Font ${this._font.family} is not loaded`)
    this._characters = value
  }

  // component properties
  get componentPropertyDefinitions() {
    return this.definitions
  }
  addComponentProperty(name: string, type: ComponentPropertyType, defaultValue: string | boolean, options?: { preferredValues?: InstanceSwapPreferredValue[] }) {
    if (this.type === 'COMPONENT' && this.parent?.type === 'COMPONENT_SET') throw new Error('Add properties to the set, not a variant')
    if (type === 'INSTANCE_SWAP' && !this.fake.all().some((n) => n.id === defaultValue && n.type === 'COMPONENT')) throw new Error(`No component ${String(defaultValue)}`)
    const key = `${name}#${nextId('prop')}`
    this.definitions[key] = { type, defaultValue, ...(options?.preferredValues ? { preferredValues: options.preferredValues } : {}) }
    return key
  }
  editComponentProperty(name: string, value: { defaultValue?: string | boolean; preferredValues?: InstanceSwapPreferredValue[] }) {
    const def = this.definitions[name]
    if (!def) throw new Error(`No property ${name}`)
    if (value.defaultValue !== undefined) def.defaultValue = value.defaultValue
    if (value.preferredValues) def.preferredValues = value.preferredValues
    return name
  }
  get defaultVariant() {
    return this.children[0]!
  }
  createInstance(): FakeNode {
    if (this.type !== 'COMPONENT') throw new Error('Only a component can be instanced')
    const inst = this.fake.cloneAs(this, 'INSTANCE')
    inst.mainComponent = this
    return inst
  }
  async loadAsync() {}
}

/** Builds a fake `figma` with the given fonts installed (family -> styles). */
export class FakeFigma {
  collections: FakeCollection[] = []
  variables: FakeVariable[] = []
  effectStyles: EffectStyle[] = []
  pages: FakeNode[] = []
  loaded = new Set<string>()
  closed: string | undefined
  notices: string[] = []
  readonly variableFamilies: Set<string>

  constructor(
    readonly fonts: Record<string, string[]> = {
      Archivo: ['Regular', 'Medium', 'SemiBold', 'Bold'],
      Alegreya: ['Regular'],
      'Martian Mono': ['Regular'],
    },
    variableFamilies: string[] = ['Archivo'],
  ) {
    this.variableFamilies = new Set(variableFamilies)
    const page = new FakeNode('PAGE', this)
    page.name = 'Page 1'
    this.pages.push(page)
  }

  all(): FakeNode[] {
    return this.pages.flatMap((p) => p.findAll())
  }

  cloneAs(node: FakeNode, type: string): FakeNode {
    const copy = new FakeNode(type, this)
    Object.assign(copy, { name: node.name, width: node.width, height: node.height, layoutMode: node.layoutMode })
    for (const child of node.children) copy.appendChild(this.cloneAs(child, child.type))
    return copy
  }

  api(): FigmaApi {
    const bind = <T extends { boundVariables?: Record<string, VariableAlias> }>(thing: T, field: string, v: FakeVariable | null): T => ({
      ...thing,
      boundVariables: { ...(thing.boundVariables ?? {}), ...(v ? { [field]: { type: 'VARIABLE_ALIAS', id: v.id } } : {}) },
    })
    const api = {
      root: { children: this.pages },
      variables: {
        getLocalVariableCollectionsAsync: async () => [...this.collections],
        getLocalVariablesAsync: async () => [...this.variables],
        createVariableCollection: (name: string) => {
          const c = new FakeCollection(name, this)
          this.collections.push(c)
          return c
        },
        createVariable: (name: string, collection: FakeCollection, type: VariableResolvedDataType) => {
          if (!this.collections.includes(collection)) throw new Error('Pass a collection object')
          if (this.variables.some((v) => v.variableCollectionId === collection.id && v.name === name)) throw new Error(`Duplicate variable ${name}`)
          if (/[.{}]/.test(name)) throw new Error(`Invalid variable name ${name}`)
          const v = new FakeVariable(name, collection.id, type, this)
          this.variables.push(v)
          return v
        },
        createVariableAlias: (v: FakeVariable): VariableAlias => ({ type: 'VARIABLE_ALIAS', id: v.id }),
        setBoundVariableForPaint: (paint: SolidPaint, field: 'color', v: FakeVariable | null) => {
          if (v && v.resolvedType !== 'COLOR') throw new Error('Paint needs a COLOR variable')
          return bind(paint, field, v)
        },
        setBoundVariableForEffect: (effect: ShadowEffect, field: 'color' | 'spread', v: FakeVariable | null) => {
          if (v && (field === 'color') !== (v.resolvedType === 'COLOR')) throw new Error(`Wrong variable type for effect ${field}`)
          return bind(effect, field, v)
        },
      },
      getLocalEffectStylesAsync: async () => [...this.effectStyles],
      createEffectStyle: () => {
        const style: EffectStyle = { id: nextId('S'), name: '', description: '', effects: [] }
        this.effectStyles.push(style)
        return style
      },
      createPage: () => {
        const page = new FakeNode('PAGE', this)
        this.pages.push(page)
        return page
      },
      setCurrentPageAsync: async () => {},
      loadFontAsync: async (font: FontName) => {
        if (!this.fonts[font.family]?.includes(font.style)) throw new Error(`The font "${font.family} ${font.style}" could not be loaded`)
        this.loaded.add(`${font.family}/${font.style}`)
      },
      createFrame: () => this.orphan('FRAME'),
      createText: () => this.orphan('TEXT'),
      createComponent: () => this.orphan('COMPONENT'),
      createNodeFromSvg: (svg: string) => {
        const frame = this.orphan('FRAME')
        for (const _ of svg.matchAll(/<(path|circle|line|rect)\b/g)) frame.appendChild(new FakeNode('VECTOR', this))
        return frame
      },
      combineAsVariants: (nodes: FakeNode[], parent: FakeNode) => {
        if (!nodes.length || nodes.some((n) => n.type !== 'COMPONENT')) throw new Error('combineAsVariants needs components')
        const axes = (n: FakeNode) =>
          n.name
            .split(', ')
            .map((p) => p.split('=')[0])
            .join(',')
        if (new Set(nodes.map(axes)).size !== 1 || new Set(nodes.map((n) => n.name)).size !== nodes.length) throw new Error('Variants must share axes and be unique')
        const set = new FakeNode('COMPONENT_SET', this)
        for (const n of nodes) set.appendChild(n)
        parent.appendChild(set)
        return set
      },
      notify: (message: string) => {
        this.notices.push(message)
      },
      closePlugin: (message?: string) => {
        this.closed = message ?? ''
      },
    }
    return api as unknown as FigmaApi
  }

  /** A new node sits on the first page until it is appended elsewhere, as in Figma. */
  orphan(type: string) {
    const node = new FakeNode(type, this)
    if (type === 'FRAME' || type === 'COMPONENT') node.layoutMode = 'NONE'
    this.pages[0]!.appendChild(node)
    return node
  }
}

export type { RGBA }
