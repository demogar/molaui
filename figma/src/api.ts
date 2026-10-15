/**
 * The part of the Figma plugin API the kit calls, typed narrowly.
 *
 * Figma publishes full typings as @figma/plugin-typings, but its package
 * declares its licence as the string "MIT License" rather than the SPDX id
 * "MIT", which the licence gate (scripts/deps.mjs) rightly refuses to guess
 * at, and its main entry declares globals that collide with the DOM lib the
 * rest of the repo compiles against. So the names and signatures below were
 * copied from plugin-typings 1.141.0's plugin-api.d.ts, cut down to what
 * plugin.ts uses. Keeping the surface this small is also what lets
 * plugin.test.ts drive the plugin with a fake `figma` that is short enough to
 * read.
 *
 * Types only: plugin.ts is transpiled alone into code.js.
 */

export type VariableResolvedDataType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

export interface VariableAlias {
  type: 'VARIABLE_ALIAS'
  id: string
}

export type VariableValue = number | string | boolean | RGBA | VariableAlias

export interface Variable {
  readonly id: string
  name: string
  description: string
  hiddenFromPublishing: boolean
  readonly variableCollectionId: string
  readonly resolvedType: VariableResolvedDataType
  readonly valuesByMode: { [modeId: string]: VariableValue }
  scopes: string[]
  readonly codeSyntax: { WEB?: string }
  setValueForMode(modeId: string, value: VariableValue): void
  setVariableCodeSyntax(platform: 'WEB' | 'ANDROID' | 'iOS', value: string): void
  remove(): void
}

export interface VariableCollection {
  readonly id: string
  name: string
  hiddenFromPublishing: boolean
  readonly modes: { modeId: string; name: string }[]
  readonly defaultModeId: string
  readonly variableIds: string[]
  addMode(name: string): string
  renameMode(modeId: string, name: string): void
}

export interface SolidPaint {
  type: 'SOLID'
  color: { r: number; g: number; b: number }
  opacity?: number
  visible?: boolean
  boundVariables?: { color?: VariableAlias }
}

export interface ShadowEffect {
  type: 'DROP_SHADOW' | 'INNER_SHADOW'
  color: RGBA
  offset: { x: number; y: number }
  radius: number
  spread?: number
  visible: boolean
  blendMode: 'NORMAL'
  showShadowBehindNode?: boolean
  boundVariables?: { [field: string]: VariableAlias }
}

export interface EffectStyle {
  readonly id: string
  name: string
  description: string
  effects: ShadowEffect[]
}

export interface FontName {
  family: string
  style: string
  variationSettings?: { [axis: string]: number }
}

export type ComponentPropertyType = 'BOOLEAN' | 'TEXT' | 'INSTANCE_SWAP' | 'VARIANT'

export interface InstanceSwapPreferredValue {
  type: 'COMPONENT' | 'COMPONENT_SET'
  key: string
}

export interface ComponentPropertyDefinitions {
  [propertyName: string]: {
    type: ComponentPropertyType
    defaultValue: string | boolean
    preferredValues?: InstanceSwapPreferredValue[]
    variantOptions?: string[]
  }
}

export interface BaseNode {
  readonly id: string
  readonly type: string
  name: string
  readonly parent: ParentNode | null
  remove(): void
}

export interface ParentNode {
  readonly children: readonly SceneNode[]
  appendChild(child: SceneNode): void
  findAll(callback?: (node: SceneNode) => boolean): SceneNode[]
}

export interface SceneNode extends BaseNode {
  x: number
  y: number
  readonly width: number
  readonly height: number
  visible: boolean
  componentPropertyReferences: { visible?: string; characters?: string; mainComponent?: string } | null
  layoutSizingHorizontal: 'FIXED' | 'HUG' | 'FILL'
  layoutSizingVertical: 'FIXED' | 'HUG' | 'FILL'
  layoutPositioning: 'AUTO' | 'ABSOLUTE'
  resize(width: number, height: number): void
  setBoundVariable(field: string, variable: Variable | null): void
}

export interface FrameNode extends SceneNode, ParentNode {
  layoutMode: 'NONE' | 'HORIZONTAL' | 'VERTICAL'
  primaryAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
  counterAxisAlignItems: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
  paddingTop: number
  paddingRight: number
  paddingBottom: number
  paddingLeft: number
  itemSpacing: number
  fills: SolidPaint[]
  strokes: SolidPaint[]
  effects: ShadowEffect[]
  clipsContent: boolean
  cornerRadius: number
  resizeWithoutConstraints(width: number, height: number): void
}

export interface ComponentNode extends FrameNode {
  readonly key: string
  description: string
  documentationLinks: { uri: string }[]
  readonly componentPropertyDefinitions: ComponentPropertyDefinitions
  createInstance(): InstanceNode
  addComponentProperty(name: string, type: ComponentPropertyType, defaultValue: string | boolean, options?: { preferredValues?: InstanceSwapPreferredValue[] }): string
  editComponentProperty(name: string, value: { defaultValue?: string | boolean; preferredValues?: InstanceSwapPreferredValue[] }): string
}

export interface ComponentSetNode extends FrameNode {
  readonly key: string
  description: string
  documentationLinks: { uri: string }[]
  readonly defaultVariant: ComponentNode
  readonly componentPropertyDefinitions: ComponentPropertyDefinitions
  addComponentProperty(name: string, type: ComponentPropertyType, defaultValue: string | boolean, options?: { preferredValues?: InstanceSwapPreferredValue[] }): string
  editComponentProperty(name: string, value: { defaultValue?: string | boolean; preferredValues?: InstanceSwapPreferredValue[] }): string
}

export interface InstanceNode extends FrameNode {
  rescale(scale: number): void
}

export interface VectorNode extends SceneNode {
  strokes: SolidPaint[]
  constraints: { horizontal: string; vertical: string }
}

export interface TextNode extends SceneNode {
  characters: string
  fontName: FontName
  fontSize: number
  lineHeight: { unit: 'PERCENT' | 'PIXELS'; value: number } | { unit: 'AUTO' }
  letterSpacing: { unit: 'PERCENT' | 'PIXELS'; value: number }
  textCase: 'ORIGINAL' | 'UPPER'
  textAutoResize: 'NONE' | 'WIDTH_AND_HEIGHT' | 'HEIGHT'
  fills: SolidPaint[]
}

export interface PageNode extends BaseNode, ParentNode {
  loadAsync(): Promise<void>
}

export interface FigmaApi {
  readonly root: { readonly children: readonly PageNode[] }
  readonly variables: {
    getLocalVariableCollectionsAsync(): Promise<VariableCollection[]>
    getLocalVariablesAsync(): Promise<Variable[]>
    createVariableCollection(name: string): VariableCollection
    createVariable(name: string, collection: VariableCollection, type: VariableResolvedDataType): Variable
    createVariableAlias(variable: Variable): VariableAlias
    setBoundVariableForPaint(paint: SolidPaint, field: 'color', variable: Variable | null): SolidPaint
    setBoundVariableForEffect(effect: ShadowEffect, field: 'color' | 'spread', variable: Variable | null): ShadowEffect
  }
  getLocalEffectStylesAsync(): Promise<EffectStyle[]>
  createEffectStyle(): EffectStyle
  createPage(): PageNode
  setCurrentPageAsync(page: PageNode): Promise<void>
  loadFontAsync(font: FontName): Promise<void>
  createFrame(): FrameNode
  createText(): TextNode
  createComponent(): ComponentNode
  createNodeFromSvg(svg: string): FrameNode
  combineAsVariants(nodes: readonly ComponentNode[], parent: PageNode): ComponentSetNode
  notify(message: string, options?: { error?: boolean; timeout?: number }): void
  closePlugin(message?: string): void
}
