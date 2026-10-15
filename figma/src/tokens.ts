/**
 * tokens/mola.tokens.json -> the kit's variable collections and effect styles.
 *
 * Four collections, because Figma modes are per collection and the tokens vary
 * along two independent axes:
 *
 *   _Primitives   every distinct colour each theme paints, one mode, hidden
 *                 from publishing and from every picker. Designers never pick
 *                 a primitive; the semantic colours alias them.
 *   Color         the semantic colours (`--ink`, `--danger`), modes `light`
 *                 and `dark`, each mode an alias into _Primitives.
 *   Density       everything `[data-density]` re-scales, modes `comfortable`,
 *                 `compact`, `spacious`, plus the spacing steps and padding
 *                 multiples the components use, derived from `--spacing` and
 *                 `--control-px` so they follow density too.
 *   Scale         the rest: one mode.
 *
 * Mode names are the code's attribute values (`data-theme="dark"`,
 * `data-density="compact"`), not prettified labels, for the same reason a
 * component's variant values are the prop's strings: a designer and an
 * engineer then say the same word.
 *
 * A primitive is named after the first token that paints it in that theme, so
 * `--danger` (which is `var(--rojo)` in tokens.css) aliases `light/rojo`, and
 * the alias graph recovers most of the `var()` structure the JSON flattens.
 *
 * Shadows become effect styles: Figma has no shadow variable type. Their
 * colours are bound to Color variables where a token matches, so the cut
 * follows the theme; elevation shadows are translucent ink with no token of
 * their own, and keep the light theme's literal colour.
 */
import type { CollectionSpec, EffectLayer, EffectStyleSpec, RGBA, VariableSpec } from './spec'

type Json = Record<string, unknown>
interface DtcgColor {
  components: number[]
  alpha?: number
  hex: string
}
interface DtcgToken {
  $type: string
  $value: unknown
  $description?: string
  $extensions?: Json
}

export interface Tokens {
  color: { light: Record<string, DtcgToken>; dark: Record<string, DtcgToken> }
  shadow: { light: Record<string, DtcgToken>; dark: Record<string, DtcgToken> }
  density: Record<string, Record<string, DtcgToken> | string>
  [group: string]: unknown
}

const isToken = (value: unknown): value is DtcgToken =>
  typeof value === 'object' && value !== null && '$value' in value && '$type' in value

/** Every token in the file with its dotted path, in file order. */
export function tokenPaths(tokens: Json): [string, DtcgToken][] {
  const out: [string, DtcgToken][] = []
  const walk = (node: Json, path: string[]) => {
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('$')) continue
      if (isToken(value)) out.push([[...path, key].join('.'), value])
      else if (typeof value === 'object' && value !== null) walk(value as Json, [...path, key])
    }
  }
  walk(tokens, [])
  return out
}

const entries = (group: unknown) =>
  Object.entries((group ?? {}) as Record<string, unknown>).filter((e): e is [string, DtcgToken] => !e[0].startsWith('$') && isToken(e[1]))

const rgba = (c: DtcgColor): RGBA => ({ r: c.components[0]!, g: c.components[1]!, b: c.components[2]!, a: c.alpha ?? 1 })
const colorKey = (c: DtcgColor) => `${c.hex}/${c.alpha ?? 1}`

/** A DTCG dimension in px; rem is taken at the 16px root the CSS assumes. */
export function px(value: unknown): number {
  const { value: n, unit } = value as { value: number; unit: string }
  return Math.round((unit === 'rem' ? n * 16 : n) * 10000) / 10000
}

const CODE_ONLY = 'Hidden from pickers: Figma cannot apply it as written.'

/** Spacing steps the components use (`p-2`, `gap-1.5`), as `space/<step>`; Figma names may not contain a dot. */
export const SPACE_STEPS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 8, 9] as const
export const spaceName = (step: number) => `space/${String(step).replace('.', '_')}`

/** `--control-px` multiples written in place in the components (`px-[calc(var(--control-px)*0.75)]`). */
export const CONTROL_PX_MULTIPLES = [0.75, 0.85, 1.15, 1.4] as const
export const controlPxName = (m: number) => `control-px-${Math.round(m * 100)}`

function densityScopes(name: string): string[] {
  if (name === 'spacing' || name === 'control-px') return ['GAP']
  if (name.startsWith('text-')) return ['FONT_SIZE']
  return ['WIDTH_HEIGHT']
}

export interface TokenBuild {
  collections: CollectionSpec[]
  effectStyles: EffectStyleSpec[]
}

export function buildTokens(tokens: Tokens): TokenBuild {
  const themes = ['light', 'dark'] as const

  /* ── _Primitives and Color ─────────────────────────────────────────── */
  const primitives: VariableSpec[] = []
  const primitiveOf = { light: new Map<string, string>(), dark: new Map<string, string>() }
  for (const theme of themes) {
    for (const [name, token] of entries(tokens.color[theme])) {
      const c = token.$value as DtcgColor
      if (primitiveOf[theme].has(colorKey(c))) continue
      const pname = `${theme}/${name}`
      primitiveOf[theme].set(colorKey(c), pname)
      primitives.push({
        name: pname,
        type: 'COLOR',
        values: [rgba(c)],
        scopes: [],
        codeSyntax: `var(--${name})`,
        description: `The ${theme} theme's value of --${name}${c.alpha !== undefined ? ` at ${Math.round(c.alpha * 100)}% alpha` : ''}. A primitive: reach it through the Color collection.`,
        tokens: [],
      })
    }
  }
  const colors: VariableSpec[] = entries(tokens.color.light).map(([name, token]) => {
    const ext = (token.$extensions ?? {}) as { 'com.figma.scopes'?: string[]; 'com.figma.codeSyntax'?: { WEB?: string } }
    return {
      name,
      type: 'COLOR',
      values: themes.map((theme) => {
        const c = tokens.color[theme][name]!.$value as DtcgColor
        return { alias: `_Primitives/${primitiveOf[theme].get(colorKey(c))!}` }
      }),
      scopes: ext['com.figma.scopes'] ?? [],
      codeSyntax: ext['com.figma.codeSyntax']?.WEB ?? '',
      description: token.$description ?? '',
      tokens: themes.map((theme) => `color.${theme}.${name}`),
    }
  })

  /* ── Density ───────────────────────────────────────────────────────── */
  const modes = Object.keys(tokens.density).filter((k) => !k.startsWith('$'))
  const modeTokens = (mode: string) => tokens.density[mode] as Record<string, DtcgToken>
  const first = modeTokens(modes[0]!)
  const density: VariableSpec[] = entries(first).map(([name, token]) => ({
    name,
    type: 'FLOAT',
    values: modes.map((mode) => px(modeTokens(mode)[name]!.$value)),
    scopes: densityScopes(name),
    codeSyntax: `var(--${name})`,
    description: token.$description ? `${token.$description[0]!.toUpperCase()}${token.$description.slice(1)} Re-scaled by data-density.` : 'Re-scaled by data-density.',
    tokens: [...modes.map((mode) => `density.${mode}.${name}`), ...(name.startsWith('text-') && (tokens.text as Json)?.[name.slice(5)] ? [`text.${name.slice(5)}`] : [])],
  }))
  // The display end of the type scale is shared by every density, but lives
  // beside the small end so a text style binds one collection.
  for (const [step, token] of entries(tokens.text)) {
    if (density.some((v) => v.name === `text-${step}`)) continue
    density.push({
      name: `text-${step}`,
      type: 'FLOAT',
      values: modes.map(() => px(token.$value)),
      scopes: ['FONT_SIZE'],
      codeSyntax: `var(--text-${step})`,
      description: 'Type scale: the display end, the same at every density.',
      tokens: [`text.${step}`],
    })
  }
  const spacing = density.find((v) => v.name === 'spacing')!.values as number[]
  for (const step of SPACE_STEPS) {
    density.push({
      name: spaceName(step),
      type: 'FLOAT',
      values: spacing.map((s) => Math.round(s * step * 10000) / 10000),
      scopes: ['GAP'],
      codeSyntax: `calc(var(--spacing) * ${step})`,
      description: `Step ${step} of the spacing scale (p-${step}, gap-${step}): ${step} × --spacing, so it follows density.`,
      tokens: [],
    })
  }
  const controlPx = density.find((v) => v.name === 'control-px')!.values as number[]
  for (const m of CONTROL_PX_MULTIPLES) {
    density.push({
      name: controlPxName(m),
      type: 'FLOAT',
      values: controlPx.map((p) => Math.round(p * m * 10000) / 10000),
      scopes: ['GAP'],
      codeSyntax: `calc(var(--control-px) * ${m})`,
      description: `A control's inline padding at ${m} × --control-px, as the components write it in place.`,
      tokens: [],
    })
  }

  /* ── Scale ─────────────────────────────────────────────────────────── */
  const scale: VariableSpec[] = []
  const add = (path: string, v: Omit<VariableSpec, 'tokens' | 'type' | 'description'> & { type?: VariableSpec['type']; description?: string; token: DtcgToken }) => {
    const codeOnly = v.scopes.length === 0
    const base = v.description ?? v.token.$description ?? ''
    scale.push({
      name: v.name,
      type: v.type ?? 'FLOAT',
      values: v.values,
      scopes: v.scopes,
      codeSyntax: v.codeSyntax,
      description: codeOnly ? `${base} ${CODE_ONLY}`.trim() : base,
      tokens: [path],
    })
  }
  for (const [name, token] of entries(tokens.font)) {
    const family = (token.$value as string[]).find((f) => !f.endsWith(' Variable')) ?? (token.$value as string[])[0]!
    add(`font.${name}`, { name: `font-${name}`, type: 'STRING', values: [family], scopes: ['FONT_FAMILY'], codeSyntax: `var(--font-${name})`, token })
  }
  for (const [name, token] of entries(tokens['text-line-height'])) {
    add(`text-line-height.${name}`, {
      name: `text-${name}--line-height`,
      values: [token.$value as number],
      scopes: [],
      codeSyntax: `var(--text-${name}--line-height)`,
      description: `The line height a bare text-${name} sets, as a ratio of the size. Figma reads a number on line height as pixels, so the kit's text applies it as a percentage instead.`,
      token,
    })
  }
  for (const [group, why] of [
    ['leading', 'A line height by job, as a ratio of the size. Figma reads a number on line height as pixels, so the kit applies it as a percentage instead.'],
    ['tracking', 'Letter spacing in em. Figma reads a number on letter spacing as pixels, so the kit applies it as a percentage instead.'],
    ['wdth', "A value on Archivo's width axis. Figma has no variable scope for a font axis; the kit sets it on the font where the installed Archivo has the axis."],
  ] as const) {
    for (const [name, token] of entries(tokens[group])) {
      add(`${group}.${name}`, { name: `${group}-${name}`, values: [token.$value as number], scopes: [], codeSyntax: `var(--${group}-${name})`, description: why, token })
    }
  }
  for (const [name, token] of entries(tokens.radius)) {
    const css = name === 'default' ? 'radius' : `radius-${name}`
    add(`radius.${name}`, { name: css, values: [px(token.$value)], scopes: ['CORNER_RADIUS'], codeSyntax: `var(--${css})`, description: 'Zero, everywhere: a mola is cut with a blade.', token })
  }
  const SIZE_SCOPES: Record<string, string[]> = {
    'cut-w': ['STROKE_FLOAT', 'EFFECT_FLOAT'],
    'cut-reveal': ['EFFECT_FLOAT'],
    'rule-w': ['STROKE_FLOAT'],
    'bar-w': ['WIDTH_HEIGHT', 'STROKE_FLOAT', 'EFFECT_FLOAT'],
    'focus-gap': ['EFFECT_FLOAT'],
  }
  for (const [name, token] of entries(tokens.size)) {
    add(`size.${name}`, { name, values: [px(token.$value)], scopes: SIZE_SCOPES[name] ?? ['WIDTH_HEIGHT'], codeSyntax: `var(--${name})`, token })
  }
  for (const [name, token] of entries(tokens.z)) {
    add(`z.${name}`, { name: `z-${name}`, values: [token.$value as number], scopes: [], codeSyntax: `var(--z-${name})`, description: 'A stacking order (z-index); Figma stacks by layer order.', token })
  }
  for (const [name, token] of entries(tokens.motion)) {
    if (token.$type === 'cubicBezier') {
      const [a, b, c, d] = token.$value as number[]
      add(`motion.${name}`, { name, type: 'STRING', values: [`cubic-bezier(${a}, ${b}, ${c}, ${d})`], scopes: [], codeSyntax: `var(--${name})`, description: 'An easing curve for transitions.', token })
    } else {
      const { value, unit } = token.$value as { value: number; unit: string }
      add(`motion.${name}`, { name: `motion-${name}`, values: [unit === 's' ? value * 1000 : value], scopes: [], codeSyntax: `var(--motion-${name})`, description: 'A transition duration in ms.', token })
    }
  }
  for (const [name, token] of entries(tokens.container)) {
    const isLength = token.$type === 'dimension'
    add(`container.${name}`, {
      name: `container-${name}`,
      values: [isLength ? px(token.$value) : (token.$value as number)],
      scopes: isLength ? ['WIDTH_HEIGHT'] : [],
      codeSyntax: `var(--container-${name})`,
      token,
    })
  }
  for (const [name, token] of entries(tokens.breakpoint)) {
    add(`breakpoint.${name}`, { name: `breakpoint-${name}`, values: [px(token.$value)], scopes: ['WIDTH_HEIGHT'], codeSyntax: `var(--breakpoint-${name})`, description: `${token.$description ?? ''} A frame width to design at.`.trim(), token })
  }

  /* ── Effect styles ─────────────────────────────────────────────────── */
  const colorVar = new Map<string, string>()
  for (const [name, token] of entries(tokens.color.light)) {
    const key = colorKey(token.$value as DtcgColor)
    if (!colorVar.has(key)) colorVar.set(key, `Color/${name}`)
  }
  const effectStyles: EffectStyleSpec[] = entries(tokens.shadow.light).map(([name, token]) => {
    const layers = (Array.isArray(token.$value) ? token.$value : [token.$value]) as {
      color: DtcgColor
      offsetX: unknown
      offsetY: unknown
      blur: unknown
      spread: unknown
      inset?: boolean
    }[]
    const effects: EffectLayer[] = layers
      .map((l) => {
        const bound = colorVar.get(colorKey(l.color))
        return {
          type: l.inset ? ('INNER_SHADOW' as const) : ('DROP_SHADOW' as const),
          x: px(l.offsetX),
          y: px(l.offsetY),
          blur: px(l.blur),
          spread: px(l.spread),
          color: bound ? { var: bound } : rgba(l.color),
        }
      })
      .reverse()
    return {
      name,
      description: `${token.$description ?? ''} var(--${name}). Effect styles have no modes: bound colours follow the theme, literal ones are the light theme's.`.trim(),
      effects,
      tokens: [`shadow.light.${name}`, `shadow.dark.${name}`],
    }
  })

  return {
    collections: [
      { name: '_Primitives', hidden: true, modes: ['value'], variables: primitives },
      { name: 'Color', hidden: false, modes: [...themes], variables: colors },
      { name: 'Density', hidden: false, modes, variables: density },
      { name: 'Scale', hidden: false, modes: ['value'], variables: scale },
    ],
    effectStyles,
  }
}
