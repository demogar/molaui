/**
 * The data the Figma plugin is built from, shared by the Node side that writes
 * it (build.ts) and the plugin that reads it inside Figma (plugin.ts).
 *
 * Everything a designer sees is decided here, on the Node side, from
 * tokens/mola.tokens.json and docs/ai/components.json. The plugin only
 * materialises it. That split is what makes the kit testable without Figma:
 * the drift gate compares this data, and the plugin's own tests drive the
 * materialiser against a fake `figma` global.
 *
 * Types only: plugin.ts is transpiled on its own into code.js, so nothing it
 * imports may carry runtime code.
 */

/** A Figma variable value type. */
export type VariableType = 'COLOR' | 'FLOAT' | 'STRING'

export interface RGBA {
  r: number
  g: number
  b: number
  a: number
}

/** A value in one mode: a literal, or an alias to another variable by its `Collection/name` key. */
export type VariableValue = number | string | RGBA | { alias: string }

export interface VariableSpec {
  /** The variable's name inside its collection. Figma groups on `/`. */
  name: string
  type: VariableType
  /** One value per mode, in the collection's mode order. */
  values: VariableValue[]
  /**
   * Figma VariableScopes. An empty list hides the variable from every picker,
   * which is deliberate for primitives and for values Figma cannot apply
   * (a z-index, a duration, a unitless line-height ratio).
   */
  scopes: string[]
  /** Dev Mode's WEB code syntax: the CSS the variable stands for. */
  codeSyntax: string
  description: string
  /** The token paths in tokens/mola.tokens.json this variable carries. Empty for a derived variable. */
  tokens: string[]
}

export interface CollectionSpec {
  name: string
  /** Kept out of the published library: true for `_Primitives`. */
  hidden: boolean
  modes: string[]
  variables: VariableSpec[]
}

export interface EffectLayer {
  type: 'DROP_SHADOW' | 'INNER_SHADOW'
  x: number
  y: number
  blur: number
  spread: Num
  /** A variable everywhere in the components; an effect style may keep a literal (see tokens.ts). */
  color: Paint | RGBA
}

export interface EffectStyleSpec {
  /** The CSS custom property's name without `--`, as the style's name. */
  name: string
  description: string
  /** Bottom layer first: Figma draws the last effect on top, CSS the first. */
  effects: EffectLayer[]
  tokens: string[]
}

/** A length: a literal in px, or a variable with its default-mode value (used to size the node before binding). */
export type Num = number | { var: string; px: number }

/** A colour is always a variable, so no component can carry a raw hex. `opacity: 0` keeps a fill present but invisible. */
export interface Paint {
  var: string
  opacity?: number
}

export interface TextStyle {
  /** The font family variable key (`Scale/font-ui`) and its literal family for loading. */
  family: { var: string; name: string }
  style: string
  size: Num
  /** Percent of the font size, from the leading tokens. */
  lineHeight: number
  /** Percent of the font size, from the tracking tokens. */
  letterSpacing: number
  upper: boolean
  /** Archivo's width axis (`--wdth-*`), applied when the installed font has it. */
  wdth?: number
  fill: Paint
}

export interface PropRef {
  /** A TEXT property that sets this text's characters. */
  characters?: string
  /** A BOOLEAN property that shows or hides this node. */
  visible?: string
  /** An INSTANCE_SWAP property that swaps this instance. */
  swap?: string
}

export type Sizing = 'HUG' | 'FIXED' | 'FILL'

export interface FrameNodeSpec {
  kind: 'frame'
  name: string
  layout: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
  width?: Num
  height?: Num
  sizing?: { h: Sizing; v: Sizing }
  padding?: { top: Num; right: Num; bottom: Num; left: Num }
  gap?: Num
  align?: { main: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'; cross: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE' }
  fill?: Paint
  effects?: EffectLayer[]
  /** Pinned to the parent's bottom edge, out of the auto layout flow. */
  pinBottom?: boolean
  prop?: PropRef
  children: NodeSpec[]
}

export interface TextNodeSpec {
  kind: 'text'
  name: string
  characters: string
  text: TextStyle
  /** Grow to fill the parent's main axis (a label beside a box). */
  fill?: boolean
  prop?: PropRef
}

export interface InstanceNodeSpec {
  kind: 'instance'
  name: string
  /** The component (or component set) name. */
  of: string
  /** Variant properties, when `of` is a component set. */
  variant?: Record<string, string>
  /** Square size for an icon, bound to an icon-size variable. */
  size?: Num
  /** Recolours an icon's vectors, as `currentColor` does in code. */
  color?: Paint
  /** Stretch across the parent's main axis (a control inside a Field). */
  fill?: boolean
  prop?: PropRef
}

export type NodeSpec = FrameNodeSpec | TextNodeSpec | InstanceNodeSpec

export interface PropertySpec {
  name: string
  type: 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP'
  /** TEXT: the text; BOOLEAN: shown or not; INSTANCE_SWAP: the default component's name. */
  default: string | boolean
  /** INSTANCE_SWAP: component or component set names offered first. */
  preferred?: string[]
  /** True when the property is a Figma-only convenience, not a prop in code. */
  nonApi?: boolean
}

export interface VariantSpec {
  /** `axis=value` pairs in axis order. */
  props: Record<string, string>
  root: FrameNodeSpec
}

export interface ComponentSpec {
  /** The code export's name: the Figma component's name. */
  name: string
  description: string
  docs: string
  /** Variant axes (empty for a single component). */
  axes: { name: string; values: string[] }[]
  variants: VariantSpec[]
  properties: PropertySpec[]
  /** Kept out of the published library (helpers such as the slot placeholder). */
  hidden?: boolean
}

export interface IconSpec {
  /** `Icon/<lucide export name>`. */
  name: string
  svg: string
  description: string
}

export interface KitData {
  /** The page the components are drawn on. */
  page: string
  /** Every font the kit loads; `required` ones are drawn by a component, so missing one stops the components. */
  fonts: { family: string; style: string; required: boolean }[]
  collections: CollectionSpec[]
  effectStyles: EffectStyleSpec[]
  icons: IconSpec[]
  /** In dependency order: anything a component instances is built before it. */
  components: ComponentSpec[]
}
