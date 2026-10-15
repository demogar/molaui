/**
 * For a slot whose buttons may carry a sentence-length label, such as an
 * empty state's or an uncertainty note's action: a button there takes a
 * second line instead of running past a phone's edge. "Open the guardrail
 * dashboard" ran 60px past 320px, and an empty state's plate was as wide as
 * its widest button.
 *
 * Not on Button itself. Making its height a minimum everywhere let a caller's
 * `size-6` lose to `min-h`, and grew compact buttons by a pixel across dozens
 * of screens; a toolbar relies on the fixed height. Here the height becomes a
 * minimum (`--button-h`, set by the size) and the label wraps.
 */
export const wrappingButtonSlot =
  '[&_[data-slot=button]]:h-auto [&_[data-slot=button]]:min-h-(--button-h) [&_[data-slot=button]]:max-w-full [&_[data-slot=button]]:py-1 [&_[data-slot=button]]:whitespace-normal [&_[data-slot=button]]:text-center'
