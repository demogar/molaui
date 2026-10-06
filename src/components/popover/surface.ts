/**
 * The one class list every floating surface in the system shares: popovers,
 * menus, tooltips' larger cousins, the command palette, toasts.
 *
 * A floating surface is raised cloth bounded by the ink keyline, plus the
 * system's only blur. Both shadows are declared together because Tailwind
 * keeps one `box-shadow` per element — a `shadow-cut` and a `shadow-raised`
 * on the same node is one of them silently winning, which is exactly the
 * conflict `cn` exists to resolve in the other direction. In the dark theme
 * the blur all but vanishes against a near-black ground, which is why the
 * keyline is never optional here: it is what still says "this floats".
 *
 * It is the `shadow-floating` theme utility rather than the same value as an
 * arbitrary shadow, which this used to be: the named utility also carries the
 * forced-colours outline (cloth.css), and the arbitrary one left every menu
 * and popover without an edge in High Contrast.
 *
 * Enter and exit come from Base UI's `data-starting-style` /
 * `data-ending-style`: a 4px settle and a fade on `--motion-base`, from the
 * transform origin the positioner computes so a menu grows out of its trigger
 * rather than out of its own centre. Reduced motion collapses the duration
 * globally; the surface still appears, it just does not travel.
 */
export const floatingSurface = [
  'bg-cloth-pale text-ink rounded-none outline-none',
  'shadow-floating',
  'origin-(--transform-origin)',
  'transition-[opacity,transform] duration-(--motion-base) ease-cut',
  'data-starting-style:opacity-0 data-starting-style:scale-[0.98]',
  'data-ending-style:opacity-0 data-ending-style:scale-[0.98] data-ending-style:duration-(--motion-cut)',
] as const
