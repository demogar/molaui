/**
 * The one class list every text control shares — Input, Textarea, the Select
 * trigger, and the wrapper an adorned Input draws instead of the input itself.
 *
 * A control is a cut shape like everything else: a raised cloth field bounded
 * by an ink keyline. The keyline is a `box-shadow` rather than a `border` so
 * hover can reveal the band beneath the shape without the control changing
 * size and shifting the rest of the form.
 *
 * ── which band ──
 * The editorial system revealed rojo on hover. In a product system rojo is
 * `danger`, and an invalid control already wears a permanent rojo band — so a
 * hover that revealed the same red would make every field the pointer crossed
 * look, for 120ms, like it had failed validation. Hover reveals gold, the
 * system's "about to be cut" layer, exactly as a button does; rojo is kept for
 * the one state that means it.
 *
 * `aria-invalid` drives the error styling rather than a class on an ancestor,
 * because `Field` already sets `aria-invalid` on the control for screen
 * readers — one source of truth instead of two that can disagree.
 *
 * Focus uses `:focus`, not `:focus-visible`, on purpose: a text control takes
 * the caret on click as well as on Tab, and the person typing needs to see
 * which field their keystrokes are landing in either way.
 */
export const fieldControlClasses = [
  'w-full min-w-0 rounded-none border-0 bg-cloth-pale',
  'font-ui text-ink',
  'shadow-cut band-oro [--cut-reveal:3px]',
  'placeholder:text-ink-muted',
  'transition-[box-shadow,background-color] duration-(--motion-cut) ease-cut',
  'hover:cut-band',
  'focus:outline-none focus:shadow-[var(--focus-ring)]',
  'aria-invalid:band-rojo aria-invalid:cut-band',
  // Focus still wins over invalid: when focus is sent to the first broken
  // field, the person has to see that the caret landed there. The invalid
  // state is still carried by the message under it.
  'aria-invalid:focus:shadow-[var(--focus-ring)]',
  // Stated, not faded: fading would take the keyline with it.
  'disabled:cursor-not-allowed disabled:bg-cloth-shade disabled:text-ink-muted disabled:hover:shadow-cut',
  // `:read-only` also matches every div and button, so it is scoped to the
  // two elements where it means "you cannot type here".
  '[&:is(input,textarea):read-only]:bg-cloth-shade',
] as const

/**
 * Height, padding and type per size. Every value is a density token, so the
 * same `md` input is 28px in a compact table filter and 48px in a spacious
 * form without a prop changing.
 */
export const fieldControlSizes = {
  sm: 'h-(--control-h-sm) px-[calc(var(--control-px)*0.75)] text-sm',
  md: 'h-(--control-h) px-(--control-px) text-base',
  lg: 'h-(--control-h-lg) px-[calc(var(--control-px)*1.15)] text-lg',
} as const

export type FieldControlSize = keyof typeof fieldControlSizes
