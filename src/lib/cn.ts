import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * `tailwind-merge` has to be told about this system's scale, or it silently
 * deletes utilities — or silently keeps two that contradict each other.
 *
 * It maps each class to a conflict group derived from Tailwind's DEFAULT
 * theme; it cannot see `theme.css`. Both failure modes shipped in the product
 * this system was extracted from:
 *
 *   - A class is dropped. `cn('text-2xs', 'text-rojo')` is a size and a colour,
 *     but an unknown `text-*` falls into the font-size group, so the later one
 *     won and every label rendered at body size.
 *   - Two contradictory classes both survive. `cn('shadow-cut',
 *     'shadow-raised')` emitted both and left the winner to stylesheet order.
 *
 * Nothing warns about either: the class is emitted, the build passes, the
 * screen is simply wrong. `cn.test.ts` parses theme.css and asserts every
 * colour token survives beside a size, so adding a token without adding it
 * here fails a test instead of a review.
 */

export const TEXT_SIZES = ['2xs', '5xl'] as const

/** Every `--color-*` in theme.css. */
export const COLORS = [
  'cloth', 'cloth-pale', 'cloth-shade', 'cloth-deep',
  'ink', 'ink-2', 'ink-muted', 'ink-soft', 'ink-on-tint',
  'keyline', 'keyline-soft',
  'rojo', 'rojo-deep', 'rojo-soft', 'rojo-rule', 'rojo-on-shade',
  'anil', 'anil-soft', 'verde', 'verde-soft', 'oro', 'oro-soft',
  'on-layer', 'on-oro',
  'danger', 'success', 'warn', 'info',
  'ink-danger', 'ink-success', 'ink-warn', 'ink-info',
  'on-ink', 'on-ink-muted', 'on-ink-accent', 'keyline-on-ink',
  'scrim', 'on-scrim', 'on-scrim-muted', 'backdrop',
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...TEXT_SIZES] }],
      'text-color': [{ text: [...COLORS] }],
      'bg-color': [{ bg: [...COLORS] }],
      'border-color': [{ border: [...COLORS] }],
      'ring-color': [{ ring: [...COLORS] }],
      'outline-color': [{ outline: [...COLORS] }],
      fill: [{ fill: [...COLORS] }],
      stroke: [{ stroke: [...COLORS] }],
      // `literal` is a custom utility that sets the mono family, so it has to
      // conflict with `font-*` or `cn('font-ui', 'literal')` keeps both.
      'font-family': [{ font: ['display', 'ui', 'text', 'mono'] }, 'literal'],
      leading: [{ leading: ['body', 'snug', 'tight'] }],
      tracking: [{ tracking: ['display', 'label'] }],
      shadow: [{ shadow: ['cut', 'raised', 'floating'] }],
      ease: [{ ease: ['cut'] }],
    },
  },
})

/** Join class names, letting later Tailwind utilities override earlier conflicting ones. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
