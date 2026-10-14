/**
 * A validator for the Design Tokens Format Module (DTCG), 2025.10 — the first
 * stable version of the format — for the token types Mola exports.
 *
 * Why a hand-written one: the export used to write values no importer
 * accepts (`"100"` for a number, `"0.2, 0, 0, 1"` for a cubic Bézier, a whole
 * quoted font stack as one family name, `"11px"` where the format wants
 * `{ value, unit }`) and nothing noticed, because the only check was that the
 * file matched the script's own output. There is no official schema package
 * to depend on, and Style Dictionary or Tokens Studio would test their own
 * tolerance rather than the format. So this encodes the spec's rules for each
 * type directly, and `npm run tokens:check` refuses a file that breaks one.
 *
 * It is strict on purpose: a type it does not know is an error, not a pass,
 * so a new kind of token cannot be exported unchecked.
 *
 * https://www.designtokens.org/tr/2025.10/format/
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json }
type Obj = { [key: string]: Json }

const TOKEN_KEYS = new Set(['$value', '$type', '$description', '$extensions', '$deprecated'])
const GROUP_KEYS = new Set(['$type', '$description', '$extensions', '$deprecated'])
const COLOR_SPACES = new Set([
  'srgb', 'srgb-linear', 'hsl', 'hwb', 'lab', 'lch', 'oklab', 'oklch',
  'display-p3', 'a98-rgb', 'prophoto-rgb', 'rec2020', 'xyz-d65', 'xyz-d50',
])
const FONT_WEIGHTS = new Set([
  'thin', 'hairline', 'extra-light', 'ultra-light', 'light', 'normal', 'regular', 'book', 'medium',
  'semi-bold', 'demi-bold', 'bold', 'extra-bold', 'ultra-bold', 'black', 'heavy', 'extra-black', 'ultra-black',
])
const ALIAS = /^\{([^{}]+)\}$/

const isObj = (v: Json | undefined): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isNum = (v: Json | undefined): v is number => typeof v === 'number' && Number.isFinite(v)

function exactKeys(v: Obj, required: string[], optional: string[] = []): string | null {
  const allowed = new Set([...required, ...optional])
  const missing = required.filter((k) => !(k in v))
  const extra = Object.keys(v).filter((k) => !allowed.has(k))
  if (missing.length) return `is missing ${missing.join(', ')}`
  if (extra.length) return `has unknown member ${extra.join(', ')}`
  return null
}

function unitValue(v: Json | undefined, units: string[], what: string): string | null {
  if (!isObj(v)) return `a ${what} is { value, unit }, not ${JSON.stringify(v)}`
  const keys = exactKeys(v, ['value', 'unit'])
  if (keys) return `a ${what} ${keys}`
  if (!isNum(v.value)) return `a ${what}'s value is a number, not ${JSON.stringify(v.value)}`
  if (typeof v.unit !== 'string' || !units.includes(v.unit)) return `a ${what}'s unit is one of ${units.join(', ')}, not ${JSON.stringify(v.unit)}`
  return null
}

function color(v: Json | undefined): string | null {
  if (!isObj(v)) return `a color is { colorSpace, components, alpha?, hex? }, not ${JSON.stringify(v)}`
  const keys = exactKeys(v, ['colorSpace', 'components'], ['alpha', 'hex'])
  if (keys) return `a color ${keys}`
  if (typeof v.colorSpace !== 'string' || !COLOR_SPACES.has(v.colorSpace)) return `unknown colorSpace ${JSON.stringify(v.colorSpace)}`
  const c = v.components
  if (!Array.isArray(c) || c.length !== 3 || !c.every((x) => isNum(x) || x === 'none')) return 'components are three numbers (or "none")'
  if (v.colorSpace === 'srgb' && !c.every((x) => x === 'none' || ((x as number) >= 0 && (x as number) <= 1))) return 'srgb components are in [0, 1]'
  if ('alpha' in v && !(isNum(v.alpha) && v.alpha >= 0 && v.alpha <= 1)) return 'alpha is a number in [0, 1]'
  if ('hex' in v && !(typeof v.hex === 'string' && /^#[0-9a-f]{6}$/i.test(v.hex))) return 'hex is a six-digit #rrggbb fallback'
  return null
}

const dimension = (v: Json | undefined) => unitValue(v, ['px', 'rem'], 'dimension')
const duration = (v: Json | undefined) => unitValue(v, ['ms', 's'], 'duration')

function shadowLayer(v: Json, resolveAlias: (ref: string, type: string) => string | null): string | null {
  if (!isObj(v)) return 'a shadow is an object, or an array of them'
  const keys = exactKeys(v, ['color', 'offsetX', 'offsetY', 'blur', 'spread'], ['inset'])
  if (keys) return `a shadow ${keys}`
  const sub = (val: Json | undefined, type: string, check: (x: Json | undefined) => string | null) =>
    typeof val === 'string' && ALIAS.test(val) ? resolveAlias(val, type) : check(val)
  const problems = [
    sub(v.color, 'color', color),
    ...(['offsetX', 'offsetY', 'blur', 'spread'] as const).map((k) => sub(v[k], 'dimension', dimension)),
  ].filter(Boolean)
  if (problems.length) return problems[0]!
  if (isObj(v.blur) && isNum(v.blur.value) && v.blur.value < 0) return 'a shadow blur is not negative'
  if ('inset' in v && typeof v.inset !== 'boolean') return 'inset is a boolean'
  return null
}

const VALIDATORS: Record<string, (v: Json | undefined, resolveAlias: (ref: string, type: string) => string | null) => string | null> = {
  color,
  dimension,
  duration,
  number: (v) => (isNum(v) ? null : `a number is a JSON number, not ${JSON.stringify(v)}`),
  fontFamily: (v) => {
    const names = typeof v === 'string' ? [v] : Array.isArray(v) && v.length > 0 ? v : null
    if (!names || !names.every((n) => typeof n === 'string' && n.length > 0)) return 'a fontFamily is a name or an array of names'
    // A string names ONE family. A whole CSS stack in one string is read as a
    // single family called "'Archivo Variable', 'Archivo', system-ui".
    const bad = (names as string[]).find((n) => /[,'"]/.test(n))
    return bad ? `a fontFamily name is one unquoted family, not ${JSON.stringify(bad)}; a stack is an array` : null
  },
  fontWeight: (v) =>
    (isNum(v) && v >= 1 && v <= 1000) || (typeof v === 'string' && FONT_WEIGHTS.has(v)) ? null : `not a fontWeight: ${JSON.stringify(v)}`,
  cubicBezier: (v) => {
    if (!Array.isArray(v) || v.length !== 4 || !v.every(isNum)) return `a cubicBezier is an array of four numbers, not ${JSON.stringify(v)}`
    const [x1, , x2] = v as number[]
    return x1! < 0 || x1! > 1 || x2! < 0 || x2! > 1 ? 'cubicBezier x coordinates are in [0, 1]' : null
  },
  shadow: (v, resolveAlias) => {
    const layers = Array.isArray(v) ? v : [v as Json]
    if (layers.length === 0) return 'a shadow array is not empty'
    for (const layer of layers) {
      const problem = shadowLayer(layer, resolveAlias)
      if (problem) return problem
    }
    return null
  },
}

/** Every rule of the format the document breaks, as `path: problem`. Empty means valid. */
export function validateDtcg(doc: unknown): string[] {
  const errors: string[] = []
  if (!isObj(doc as Json)) return ['the document is a JSON object']
  const root = doc as Obj

  // Every token's path and type, for checking aliases.
  const tokens = new Map<string, string | undefined>()
  const collect = (node: Obj, path: string[], inherited: string | undefined) => {
    const type = typeof node.$type === 'string' ? node.$type : inherited
    if ('$value' in node) return void tokens.set(path.join('.'), type)
    for (const [k, child] of Object.entries(node)) if (!k.startsWith('$') && isObj(child)) collect(child, [...path, k], type)
  }
  collect(root, [], undefined)

  const resolveAlias = (ref: string, type: string): string | null => {
    const target = ALIAS.exec(ref)![1]!
    if (!tokens.has(target)) return `the alias ${ref} points at no token`
    const targetType = tokens.get(target)
    return targetType === type ? null : `the alias ${ref} is a ${targetType}, not a ${type}`
  }

  const visit = (node: Obj, path: string[], inherited: string | undefined) => {
    const where = path.join('.') || '(root)'
    if (typeof node.$description !== 'undefined' && typeof node.$description !== 'string') errors.push(`${where}: $description is a string`)
    if (typeof node.$extensions !== 'undefined' && !isObj(node.$extensions)) errors.push(`${where}: $extensions is an object`)
    if ('$type' in node && typeof node.$type !== 'string') errors.push(`${where}: $type is a string`)
    const type = typeof node.$type === 'string' ? node.$type : inherited

    if ('$value' in node) {
      const extra = Object.keys(node).filter((k) => !TOKEN_KEYS.has(k))
      if (extra.length) errors.push(`${where}: a token has no members other than $-properties, found ${extra.join(', ')}`)
      if (!type) return void errors.push(`${where}: no $type, on the token or a parent group`)
      const check = VALIDATORS[type]
      if (!check) return void errors.push(`${where}: $type ${JSON.stringify(type)} is not one this validator knows`)
      const value = node.$value
      const problem = typeof value === 'string' && ALIAS.test(value) ? resolveAlias(value, type) : check(value, resolveAlias)
      if (problem) errors.push(`${where}: ${problem}`)
      return
    }

    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$')) {
        if (!GROUP_KEYS.has(key)) errors.push(`${where}: unknown group property ${key}`)
        continue
      }
      if (/[{}.]/.test(key)) errors.push(`${where}: the name ${JSON.stringify(key)} contains {, } or .`)
      if (!isObj(child)) {
        errors.push(`${[...path, key].join('.')}: a token or group is an object`)
        continue
      }
      visit(child, [...path, key], type)
    }
  }
  visit(root, [], undefined)
  return errors
}
