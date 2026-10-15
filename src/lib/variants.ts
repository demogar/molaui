import { type VariantProps } from 'class-variance-authority'

/**
 * A component's cva variants as props, without `null`.
 *
 * cva's own `VariantProps` types every variant as `… | null | undefined`,
 * because the cva function accepts `null` to mean "use the default". Spread
 * into a props interface, that `null` became part of the public API: the
 * Storybook props table, the API report and every agent reading the manifest
 * were told `<IconButton size={null}>` is a legal call. It is not something
 * we want to promise, so props take this instead, and the `*Variants`
 * functions keep cva's signature. `variant-props.test.ts` fails if a
 * component goes back to the raw `VariantProps` for its props.
 */
export type Variants<T extends (...args: never[]) => unknown> = {
  [K in keyof VariantProps<T>]?: NonNullable<VariantProps<T>[K]>
}
