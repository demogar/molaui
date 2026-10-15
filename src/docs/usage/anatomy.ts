/**
 * Anatomy: the named parts of a component, drawn from the live DOM.
 *
 * A component that has anatomy marks each part in its own markup with
 * `data-part="…"` (kebab-case, stable: it is shipped DOM, and consumers may
 * select on it). This file only names the parts and says what each one does.
 * Where the part sits is never written down: the Anatomy block on the docs page
 * renders `story`, measures every `[data-part]` it owns, and pins it there, so
 * the diagram cannot drift from the code. Which tokens and utilities a part
 * uses is read from its class list at the same moment, for the same reason.
 *
 * Ownership. A part belongs to the nearest ancestor that is the root of a
 * component with anatomy (its `data-slot` is one of the slots below). So the
 * Run status inside a Tool call is the Tool call's `status` part, and the
 * glyph and label inside that Run status belong to Run status, not to the
 * Tool call.
 *
 * `root` is reserved: it names the component's own root element (the one
 * carrying `slot`), which needs no `data-part`.
 *
 * anatomy.test.tsx renders every story of every component named here and
 * fails if a declared part is missing from the story that is meant to show it,
 * or if a `data-part` the component owns in any of its stories is not in the
 * legend.
 *
 * Only components with real, separately styled parts have an entry. A Badge
 * or a Divider is one shape; a diagram of it would be a pin on a pill.
 */
export const ROOT_PART = 'root'

export interface AnatomyPart {
  /** The `data-part` value, or `root` for the component's root element. */
  part: string
  /** What the legend calls it. */
  name: string
  /** What it does, in one sentence. */
  does: string
  /**
   * The story that shows this part, when the diagram's story does not (an
   * error, a running state). The part is listed under the diagram without a
   * pin, with a link to that example.
   */
  story?: string
  /**
   * Which instance carries the pin, counting from 0, when the first one would
   * mislead (the first table row is the header's).
   */
  nth?: number
}

export interface Anatomy {
  /** The export name of the story the diagram measures. */
  story: string
  /** The root's `data-slot`. The first element with it in the story is the one pinned. */
  slot: string
  parts: AnatomyPart[]
}

export const ANATOMY: Record<string, Anatomy> = {
  'Components/Forms/Field': {
    story: 'HintAndError',
    slot: 'field',
    parts: [
      { part: 'label', name: 'Label', does: 'Names the control, in the label register, and is wired to it with htmlFor.' },
      { part: 'label-aside', name: 'Label aside', does: 'A count or a default beside the label; never a second label.' },
      { part: 'hint', name: 'Hint', does: 'States the rule. It stays when an error arrives, and is read first.' },
      { part: 'error', name: 'Error', does: 'Says how this value broke the rule. Announced on insertion, and marked with a cut square so it is not colour alone.' },
    ],
  },
  'Components/Feedback/Callout': {
    story: 'WithActions',
    slot: 'callout',
    parts: [
      { part: 'root', name: 'Container', does: 'The tone’s wash, bounded by the ink keyline like every cut shape.' },
      { part: 'seam', name: 'Seam', does: 'The relleno along the top edge: the tone as a cut-back layer, not a coloured side bar.' },
      { part: 'icon', name: 'Icon', does: 'The tone’s glyph, so the tone is never colour alone.' },
      { part: 'title', name: 'Title', does: 'A real heading; it also names the region.' },
      { part: 'body', name: 'Body', does: 'The message. Never coloured: the tone owns the region, not the reading column.' },
      { part: 'actions', name: 'Actions', does: 'Usually one secondary button at the small size.' },
      { part: 'dismiss', name: 'Dismiss', does: 'Present only with onDismiss; the caller decides whether it comes back.' },
    ],
  },
  'Components/Navigation/Tabs': {
    story: 'Underline',
    slot: 'tabs',
    parts: [
      { part: 'list', name: 'List', does: 'The row of tabs, on a keyline. Scrolls sideways rather than wrapping.' },
      { part: 'tab', name: 'Tab', does: 'One tab. Roving focus and arrow keys come from Base UI.' },
      { part: 'count', name: 'Count', does: 'An optional figure; it turns to ink on the active tab.' },
      { part: 'indicator', name: 'Indicator', does: 'The ink bar under the active tab. It slides; the tab text never moves.' },
      { part: 'panel', name: 'Panel', does: 'The content of the active tab.' },
    ],
  },
  'Components/Data display/Table': {
    story: 'Primitives',
    slot: 'table-frame',
    parts: [
      { part: 'root', name: 'Frame', does: 'Scrolls the table in both directions, and joins the tab order when it overflows or has a sticky header.' },
      { part: 'head', name: 'Column header', does: 'The label register on an ink rule; a sort control when sortable.' },
      { part: 'row', name: 'Row', does: 'A row at the density’s row height, with a soft keyline under it.', nth: 1 },
      { part: 'footer', name: 'Footer', does: 'Totals, on a shaded ground under an ink rule.' },
      { part: 'caption', name: 'Caption', does: 'What the table shows, under it, read by screen readers as its name.' },
    ],
  },
  'Components/Data display/Stat': {
    story: 'Default',
    slot: 'stat',
    parts: [
      { part: 'root', name: 'Tile', does: 'A raised cloth tile with a keyline; inside a Stat group, the group draws it.' },
      { part: 'label', name: 'Label', does: 'What is measured, in the label register.' },
      { part: 'value', name: 'Value', does: 'The figure, in the display face with tabular numerals.' },
      { part: 'trend', name: 'Trend', does: 'A decorative sparkline; the last point is a cut square.' },
      { part: 'delta', name: 'Delta', does: 'Direction as a glyph, sentiment as a colour, and both in a sentence for screen readers.' },
      { part: 'unit', name: 'Unit', does: 'The unit, muted, kept on the figure’s line in either direction.', story: 'WithoutTrend' },
      { part: 'hint', name: 'Hint', does: 'One line of context: a budget, when it was last synced.', story: 'WithoutTrend' },
    ],
  },
  'Components/Feedback/Empty state': {
    story: 'LoadError',
    slot: 'empty-state',
    parts: [
      { part: 'root', name: 'Slot', does: 'A shaded panel packed with relleno: a slot cut and waiting, not a blank rectangle.' },
      { part: 'seam', name: 'Seam', does: 'The tone’s relleno along the top, on error and no-permission only.' },
      { part: 'plate', name: 'Plate', does: 'A raised cloth plate, so the copy never reads across the slits.' },
      { part: 'icon', name: 'Icon', does: 'A small ink square with the variant’s glyph. Not an illustration.' },
      { part: 'title', name: 'Title', does: 'What state this is, as a heading.' },
      { part: 'description', name: 'Description', does: 'Why, and what will happen next.' },
      { part: 'actions', name: 'Actions', does: 'One or two buttons; the first is the way forward.' },
    ],
  },
  'Components/Layout/Page header': {
    story: 'Default',
    slot: 'page-header',
    parts: [
      { part: 'root', name: 'Header', does: 'Closes on a keyline, unless tabs sit at its foot.' },
      { part: 'title', name: 'Title', does: 'The page’s one h1.' },
      { part: 'description', name: 'Description', does: 'One sentence on what the page is for.' },
      { part: 'actions', name: 'Actions', does: 'The page’s actions. They wrap below the title on a narrow screen rather than hide in a menu.' },
      { part: 'meta', name: 'Meta', does: 'Status, owner and dates, as a list divided by keylines.' },
    ],
  },
  'AI/Tool call': {
    story: 'NeedsApproval',
    slot: 'tool-call',
    parts: [
      { part: 'root', name: 'Container', does: 'A keylined card. While it waits for a person it wears the gold band, revealed by the cut.' },
      { part: 'header', name: 'Header', does: 'The disclosure trigger. A waiting or failed call is held open, so its trigger is inert.' },
      { part: 'name', name: 'Tool name', does: 'The identifier exactly as the model called it, as a machine literal.' },
      { part: 'title', name: 'Title', does: 'What the call is for, in words.' },
      { part: 'status', name: 'Status', does: 'A Run status: glyph, word and colour, and the elapsed time when known.' },
      { part: 'body', name: 'Body', does: 'The approval or the error first, then the arguments and the result.' },
      { part: 'approval', name: 'Approval', does: 'Why a person has to decide, and two buttons of equal weight.' },
      { part: 'progress', name: 'Progress', does: 'Working relleno along the top edge while the call runs.', story: 'Running' },
      { part: 'error', name: 'Error', does: 'What failed, the error verbatim, and Retry. A failed call is held open.', story: 'Failed' },
    ],
  },
  'AI/Prompt input': {
    story: 'WithAttachments',
    slot: 'prompt-input',
    parts: [
      { part: 'root', name: 'Container', does: 'The form, keylined. The focus ring goes on the whole box, not the textarea.' },
      { part: 'attachments', name: 'Attachments', does: 'Attachment chips, above the text, each with its own remove button.' },
      { part: 'input', name: 'Input', does: 'A textarea that grows to maxRows, labelled by a visually hidden label.' },
      { part: 'toolbar', name: 'Toolbar', does: 'The caller’s controls: attach, model picker.' },
      { part: 'hint', name: 'Hint', does: 'The send shortcut and the token estimate. It describes the textarea.' },
      { part: 'send', name: 'Send', does: 'Disabled until there is something to send. Becomes Stop while generating.' },
      { part: 'stop', name: 'Stop', does: 'Replaces Send while the model is generating.', story: 'Generating' },
    ],
  },
  'AI/Run status': {
    story: 'WithElapsedTime',
    slot: 'run-status',
    parts: [
      { part: 'glyph', name: 'Glyph', does: 'A cut square whose fill and mark differ per status, so status survives greyscale.' },
      { part: 'label', name: 'Label', does: 'The status in words. The colour repeats it, never replaces it.' },
      { part: 'duration', name: 'Duration', does: 'Elapsed time, ticking while the run is open, fixed once it ends.' },
    ],
  },
  'AI/Message': {
    story: 'Failed',
    slot: 'message',
    parts: [
      { part: 'root', name: 'Turn', does: 'One turn of the ledger, separated from the last by a keyline.' },
      { part: 'author', name: 'Author', does: 'Who spoke, cut short by the role’s band.' },
      { part: 'model', name: 'Model', does: 'Which model answered, as a machine literal.' },
      { part: 'body', name: 'Body', does: 'The content. The model’s words are set in Alegreya; the operator’s in Archivo.' },
      { part: 'error', name: 'Error', does: 'The failure in a sentence, the error verbatim, and Retry beside it.' },
      { part: 'time', name: 'Time', does: 'When, as a machine-readable time element.', story: 'Conversation' },
      { part: 'actions', name: 'Actions', does: 'Copy, regenerate and rating. Shown on hover or focus, always on touch, and never while streaming.', story: 'Conversation' },
    ],
  },
  'Components/Forms/Listbox': {
    story: 'Multiple',
    slot: 'listbox',
    parts: [
      { part: 'root', name: 'List', does: 'The cut box the options sit in. It scrolls when given a height, and holds one tab stop.' },
      { part: 'option', name: 'Option', does: 'One choice. A chosen one takes the ink fill; focus is a ring drawn inside it.' },
      { part: 'mark', name: 'Mark', does: 'In a multiple list, a square that fills when chosen, so the state is never the colour alone.' },
      { part: 'label', name: 'Label', does: 'The option’s name, and what type-ahead matches.' },
      { part: 'description', name: 'Description', does: 'An optional second line, read as the option’s description.' },
    ],
  },
  'Components/Forms/Tag group': {
    story: 'SelectAndRemove',
    slot: 'tag-group',
    parts: [
      { part: 'tag', name: 'Tag', does: 'One value: a focusable row, cut like a chip. Selected, it takes the ink fill.' },
      { part: 'check', name: 'Check', does: 'Marks a selected tag, beside the ink fill.' },
      { part: 'label', name: 'Label', does: 'The tag’s text, and its accessible name.' },
      { part: 'remove', name: 'Remove', does: 'The ×: a button named “Remove <label>”, out of the tab order because the tag answers Delete.' },
      { part: 'empty', name: 'Empty text', does: 'What the group says when it has no tags.', story: 'Empty' },
    ],
  },
  'Components/Navigation/Tree': {
    story: 'Default',
    slot: 'tree',
    parts: [
      { part: 'item', name: 'Item', does: 'One treeitem, indented by its level. The selected one is a shade with an ink bar.' },
      { part: 'marker', name: 'Marker', does: 'The plus on a branch, which turns into a cross when it is open.' },
      { part: 'icon', name: 'Icon', does: 'An optional leading icon, hidden from assistive technology.' },
      { part: 'label', name: 'Label', does: 'The item’s name, and what type-ahead matches.' },
    ],
  },
}

/** The slots that own parts, so a nested component’s parts stay its own. */
export const ANATOMY_SLOTS: ReadonlySet<string> = new Set(Object.values(ANATOMY).map((a) => a.slot))

const ownerSelector = () => [...ANATOMY_SLOTS].map((slot) => `[data-slot="${slot}"]`).join(',')

/** The first instance of the component in a rendered story. */
export function anatomyRoot(container: ParentNode, anatomy: Anatomy): HTMLElement | null {
  return container.querySelector<HTMLElement>(`[data-slot="${anatomy.slot}"]`)
}

/** The parts the diagram pins: those its own story shows. */
export const pinnedParts = (anatomy: Anatomy) => anatomy.parts.filter((p) => !p.story || p.story === anatomy.story)

/** Every `[data-part]` element the root owns, in document order. */
export function ownedParts(root: Element): HTMLElement[] {
  const owners = ownerSelector()
  return [...root.querySelectorAll<HTMLElement>('[data-part]')].filter(
    (el) => el.parentElement?.closest(owners) === root,
  )
}

/** The element for a declared part: the root itself, or the `nth` owned element with that `data-part`. */
export function partElement(root: HTMLElement, part: string, nth = 0): HTMLElement | null {
  if (part === ROOT_PART) return root
  return ownedParts(root).filter((el) => el.dataset.part === part)[nth] ?? null
}
