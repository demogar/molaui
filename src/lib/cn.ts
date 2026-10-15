import { clsx, type ClassValue } from 'clsx'

import { merge } from './merge'

/**
 * A class merger has to know this system's scale, or it silently deletes
 * utilities — or silently keeps two that contradict each other.
 *
 * tailwind-merge, which this used to call, maps each class to a conflict
 * group derived from Tailwind's DEFAULT theme; it cannot see `theme.css`. Both
 * failure modes shipped in the product this system was extracted from:
 *
 *   - A class is dropped. `cn('text-2xs', 'text-rojo')` is a size and a colour,
 *     but an unknown `text-*` falls into the font-size group, so the later one
 *     won and every label rendered at body size.
 *   - Two contradictory classes both survive. `cn('shadow-cut',
 *     'shadow-raised')` emitted both and left the winner to stylesheet order.
 *
 * Nothing warns about either: the class is emitted, the build passes, the
 * screen is simply wrong. `cn.test.ts` parses theme.css and asserts every
 * colour token survives beside a size, so a token whose name the merger would
 * misread fails a test instead of a review.
 *
 * The merging itself is merge.ts: tailwind-merge's rules for the families
 * Mola's components write, as data, at a fraction of the bytes; merge.test.ts
 * compares the two on every pair of utilities.
 */

/** Join class names, letting later Tailwind utilities override earlier conflicting ones. */
export function cn(...inputs: ClassValue[]) {
  return merge(clsx(inputs))
}
