/**
 * Names a popup listbox after the field that opens it.
 *
 * Base UI names the trigger (a `<label for>` reaches it) but leaves the
 * listbox it opens unnamed, so a screen reader moving into the options hears
 * "listbox" with nothing to say which one. The listbox is labelled by the
 * same `<label>` elements as its trigger, found through the trigger's
 * `labels` when the list mounts, so it works whoever rendered the label: the
 * component's own `label`, a `Field` around it, or a `<label for>` the caller
 * wrote. A trigger named by `aria-labelledby` or `aria-label` instead passes
 * that on. The labels Select, Combobox and Field render carry ids for this;
 * a hand-written label without one has its words copied.
 *
 * Referencing the trigger itself was tried first: `aria-labelledby` on the
 * trigger gives its text content, which for a select is the current value
 * ("Staging"), not the field's name.
 *
 * The attributes are set on the DOM node from a ref callback rather than
 * rendered, because the label is only findable once the trigger is in the
 * document, and the list mounts fresh each time the popup opens. React never
 * renders these attributes on the list, so it never overwrites them; a
 * caller's own `aria-label` or `aria-labelledby` on the list wins.
 */
export function nameListbox(list: HTMLElement | null, triggerId: string): void {
  if (!list || list.hasAttribute('aria-label') || list.hasAttribute('aria-labelledby')) return
  const trigger = list.ownerDocument.getElementById(triggerId)
  if (!trigger) return
  // The precedence the trigger's own name follows: aria-labelledby, then
  // aria-label, then its <label> elements.
  const labels = 'labels' in trigger ? Array.from((trigger as HTMLButtonElement).labels ?? []) : []
  const ids = labels.map((label) => label.id).filter(Boolean)
  const labelledBy =
    trigger.getAttribute('aria-labelledby') || (trigger.hasAttribute('aria-label') ? '' : ids.join(' '))
  if (labelledBy) {
    list.setAttribute('aria-labelledby', labelledBy)
    return
  }
  // A hand-written `<label for>` without an id: its words, copied.
  const label =
    trigger.getAttribute('aria-label') ||
    labels
      .map((l) => (l.textContent ?? '').trim())
      .filter(Boolean)
      .join(' ')
  if (label) list.setAttribute('aria-label', label)
}
