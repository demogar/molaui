/**
 * Which of an element's classes are this system's vocabulary: the cloth
 * utilities (cut, cut-band, band-*, relleno, diente, rotulo, …), the shadows,
 * the colour roles, the type roles and the density metrics.
 *
 * The lists are parsed from cloth.css and theme.css rather than typed here, so
 * a utility added there is recognised without touching this file. The CSS is
 * passed in rather than imported: the docs block imports it with `?raw`, but
 * the unit tests run with `css: false`, where a `?raw` stylesheet is empty, so
 * the test reads the files itself.
 *
 * Layout classes (flex, gap-2, px-3) are left out: they are how the part is
 * placed, not what it is made of, and listing them would bury the four that
 * matter. Classes are shown as written, variants included (`hover:cut-band` is
 * not `cut-band`), except right-to-left and forced-colours variants, which
 * repeat a class already listed for a different reader.
 */
const SKIPPED_VARIANTS = /^(rtl|ltr|forced-colors|print|motion-safe|motion-reduce)$/

/** Splits `hover:data-x:[&_td]:bg-ink` into variants and the utility, ignoring colons inside brackets. */
function splitVariants(cls: string): { variants: string[]; utility: string } {
  const parts: string[] = []
  let depth = 0
  let start = 0
  for (let i = 0; i < cls.length; i++) {
    const c = cls[i]
    if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth--
    else if (c === ':' && depth === 0) {
      parts.push(cls.slice(start, i))
      start = i + 1
    }
  }
  return { variants: parts, utility: cls.slice(start) }
}

export interface UtilityReader {
  isSystemUtility: (utility: string) => boolean
  systemClasses: (classes: Iterable<string>) => string[]
  /**
   * The system classes a part is made of: its own, and with `deep`, those of
   * its descendants up to the next part or component, which are listed under
   * their own name. A root is read shallow: whatever in it is not a part is
   * usually the caller's content (a page header's breadcrumb), not the
   * component's.
   */
  partUtilities: (el: Element, deep?: boolean) => string[]
}

export function utilityReader(clothCss: string, themeCss: string): UtilityReader {
  const names = (css: string, pattern: RegExp) => new Set([...css.matchAll(pattern)].map((m) => m[1]!))
  const cloth = new Set(
    [...names(clothCss, /@utility\s+([\w-]+)/g)].filter(
      (n) => !/^(forced-|wdth-)/.test(n) && n !== 'scroll-cloth' && n !== 'shadow-none',
    ),
  )
  const colors = names(themeCss, /--color-([\w-]+)\s*:/g)
  const shadows = names(themeCss, /--shadow-([\w-]+)\s*:/g)
  const fonts = names(themeCss, /--font-([\w-]+)\s*:/g)

  const isSystemUtility = (utility: string) => {
    const u = utility.replace(/^!/, '').replace(/\/\d+$/, '')
    if (cloth.has(u)) return true
    const color = /^(?:bg|text|fill|stroke|border|outline|ring|decoration)-([\w-]+)$/.exec(u)
    if (color && colors.has(color[1]!)) return true
    const shadow = /^shadow-(.+)$/.exec(u)
    if (shadow && (shadows.has(shadow[1]!) || (shadow[1]!.startsWith('[') && shadow[1]!.includes('var(--')))) return true
    const font = /^font-([\w-]+)$/.exec(u)
    if (font && fonts.has(font[1]!)) return true
    return /\(--(control-|row-h|band\b)/.test(u)
  }

  const systemClasses = (classes: Iterable<string>) => {
    const out: string[] = []
    for (const cls of classes) {
      const { variants, utility } = splitVariants(cls)
      if (variants.some((v) => SKIPPED_VARIANTS.test(v))) continue
      if (isSystemUtility(utility) && !out.includes(cls)) out.push(cls)
    }
    return out
  }

  const partUtilities = (el: Element, deep = true) => {
    const classes: string[] = []
    const visit = (node: Element) => {
      classes.push(...(node.getAttribute('class') ?? '').split(/\s+/).filter(Boolean))
      if (!deep) return
      for (const child of node.children) {
        if (child.hasAttribute('data-part') || child.hasAttribute('data-slot')) continue
        visit(child)
      }
    }
    visit(el)
    return systemClasses(classes)
  }

  return { isSystemUtility, systemClasses, partUtilities }
}
