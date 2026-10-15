/**
 * The hard-states convention: every interactive component page has one story,
 * exported as `HardStates` (id `…--hard-states`, tagged `hard-states`), that
 * shows the component where it most often breaks, side by side:
 *
 *   long-label  a label or value far longer than the happy path, at a phone's
 *               width: it has to wrap or truncate on purpose, never overflow
 *   rtl         the component in a right-to-left subtree (`dir="rtl"`), with
 *               Arabic text: bars, chevrons, padding and order mirror
 *   disabled    the component, or the part of it that can be, disabled
 *   error       its invalid or failed state
 *
 * Long labels and errors were inconsistent from one page to the next, and
 * there was no right-to-left story anywhere in the corpus: the visual tests
 * flip the first story of each component, which is its happy path. One story
 * per page, built from `HardStates` / `HardState` (src/docs/blocks/
 * hard-states.tsx), means a reviewer knows where to look and the visual
 * tests hold all four in one picture.
 *
 * Which pages are interactive is not decided here: it is every page with a
 * keyboard table in accessibility.ts (everything outside NON_INTERACTIVE), so
 * a new interactive component cannot skip its hard states. hard-states.test.tsx
 * renders each story and checks every state is there, the right-to-left one
 * really is right to left, and the disabled one really holds a disabled
 * control.
 *
 * A component that genuinely has no disabled or no error state says why here,
 * and the test fails if a state named here turns up in its story after all.
 * Long label and right to left have no exemptions: everything with text has a
 * longest text, and everything has a direction.
 */
export const HARD_STATES = ['long-label', 'rtl', 'disabled', 'error'] as const
export type HardStateName = (typeof HARD_STATES)[number]
export type ExemptState = Exclude<HardStateName, 'long-label' | 'rtl'>

export const HARD_STATE_LABELS: Record<HardStateName, string> = {
  'long-label': 'Long label',
  rtl: 'Right to left',
  disabled: 'Disabled',
  error: 'Error',
}

export const HARD_STATE_EXEMPT: Record<string, Partial<Record<ExemptState, string>>> = {
  'AI/Change review': {
    disabled: 'The three decisions are always available to the reviewer; nothing in a review is switched off.',
    error: 'Its one error, a no without a reason, appears only after someone presses Reject; the Try it story shows it.',
  },
  'AI/Markdown': { disabled: 'Markdown renders text; nothing in it can be switched off.' },
  'AI/Message': { disabled: 'Its actions are hidden while it streams, not disabled, so they never sit greyed out on a turn.' },
  'AI/Reasoning': {
    disabled: 'Reasoning is evidence that arrived; there is nothing to switch off.',
    error: 'A failed run is shown by the run and its message, not by the thinking that led to it.',
  },
  'AI/Side-by-side diff': {
    disabled: 'A diff shows two texts; nothing in it can be switched off.',
    error: 'An unparseable diff is the failure of the tool that returned it, shown by that tool call.',
  },
  'AI/Sources': { disabled: 'A source that was read cannot be switched off, only left out of the list.' },
  'Components/Data display/Code': { disabled: 'Code is text to read and copy; nothing in it can be switched off.' },
  'Components/Feedback/Callout': {
    disabled: 'Its one control, dismiss, is always available; an action inside it is a Button with its own disabled state.',
  },
  'Components/Feedback/Toast': { disabled: 'A notice that cannot be acted on is not raised; a toast is never shown disabled.' },
  'Components/Forms/Chip': {
    error: 'A chip filters a view and is never submitted, so there is nothing for it to fail.',
  },
  'Components/Forms/Segmented control': {
    error: 'A segmented control always holds one of its options, so it has no invalid value to show.',
  },
  'Components/Forms/Slider': {
    error: 'A slider can only hold a value inside its own bounds, so there is no invalid value for it to show.',
  },
  'Components/Forms/Switch': {
    error: 'A switch takes effect the moment it is pressed; there is nothing to submit and nothing to validate.',
  },
  'Components/Layout/App shell': {
    disabled: 'A destination a person cannot use is left out of the navigation, not shown disabled.',
    error: 'An error belongs to the page in <main>, not to the shell around it.',
  },
  'Components/Navigation/Accordion': {
    error: 'A section whose content failed shows that failure inside its panel; the accordion has no error state.',
  },
  'Components/Navigation/Breadcrumb': {
    disabled: 'Every crumb is a place you can go, and the current page is text, not a disabled link.',
    error: 'A breadcrumb only names where you are; it has nothing that can fail or be invalid.',
  },
  'Components/Navigation/Pagination': {
    error: 'A page that fails to load is the table’s error, not the pagination control’s.',
  },
  'Components/Navigation/Stepper': {
    disabled: 'Steps not yet reached are text, not disabled buttons, because skipping ahead would skip the checks.',
  },
  'Components/Navigation/Tabs': {
    error: 'A view that fails to load shows its failure in its panel; a tab has no error state.',
  },
  'Components/Navigation/Tree': {
    error: 'A branch whose children fail to load says so in what it shows; the tree has no error state.',
  },
  'Components/Overlays/Command palette': {
    error: 'A command that fails reports where its result appears, and no matches is the empty state, not an error.',
  },
  'Components/Overlays/Drawer': {
    error: 'A form inside a drawer shows its own errors, as Filters does; the drawer has none of its own.',
  },
  'Components/Overlays/Menu': {
    error: 'An action chosen from a menu reports its failure where its result would appear, not in the menu.',
  },
  'Components/Overlays/Popover': {
    error: 'A form inside a popover shows its own errors; the popover itself has no error state.',
  },
  'Components/Overlays/Tooltip': {
    error: 'A tooltip is a label, and an error is never left to something that does not exist on touch.',
  },
}
