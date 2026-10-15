/**
 * `data-slot` for a part that is usually rendered as another component.
 *
 * Triggers and close buttons are mostly written as
 * `<DialogTrigger render={<Button />}>`. Base UI merges the trigger's props
 * onto the Button, and Button spreads them after its own `data-slot="button"`,
 * so a trigger that always set its own slot would rename every Button used as
 * a trigger — and `[data-slot=button]` is a public hook. The part's own slot
 * is set only when it renders its default element.
 */
export function slotUnlessRendered(name: string, render: unknown): { 'data-slot'?: string } {
  return render ? {} : { 'data-slot': name }
}
