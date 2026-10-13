import type { Alternative } from './guidance'

/**
 * Guidance for every pattern page (`Patterns/*`): when to use the screen and
 * when not to, what each component in it is doing, where each of its states
 * can be seen, and what it does for accessibility.
 *
 * A pattern is a whole screen, so the questions differ from a component's.
 * Nobody asks "which variant"; they ask "what is this made of", "what does it
 * look like with nothing in it, while it loads, when it fails, and for
 * someone who may not see it". Those four states are named on every pattern
 * because they are the ones a screen designed only in its happy state is
 * missing, and a reader copying it inherits the gap.
 *
 * `parts` is keyed by the stories title of each component the screen
 * imports. Which components those are is not up to this file: it is read
 * from the imports (composition.ts), and composition.test.ts fails if a part
 * is described here that the screen does not import, or imported and not
 * described. The words are the only hand-written part.
 *
 * `states` points at a story by its export name where the state is shown.
 * Where it is not, the note says so and says what the screen would do, rather
 * than leaving the reader to assume it was handled.
 */
export type PatternStateId = 'empty' | 'loading' | 'error' | 'noPermission'

export const PATTERN_STATES: Record<PatternStateId, string> = {
  empty: 'Empty',
  loading: 'Loading',
  error: 'Error',
  noPermission: 'No permission',
}

export interface PatternState {
  /** The export name of the story that shows this state, when one does. */
  story?: string
  /** What the screen does in this state, or why it has none. */
  note: string
}

export interface PatternUsage {
  /** One sentence: what the screen is for. */
  summary: string
  use: string[]
  /** When another pattern or a component fits better. `use` is a stories title. */
  avoid: Alternative[]
  /** Each component the screen is built from, by stories title, and its job here. */
  parts: Record<string, string>
  states: Record<PatternStateId, PatternState>
  /** What the screen does for keyboard and screen-reader users, beyond what its parts do. */
  accessibility: string[]
}

export const PATTERNS: Record<string, PatternUsage> = {
  'Patterns/Agent hand-off': {
    summary:
      'An agent has done what it may and stopped at what it may not: the person approves its proposed action, or takes the task over and finishes it themselves.',
    use: [
      'An agent reaches an action above its authority, such as a refund over its limit, and a person must decide before anything reaches a customer.',
      'The person needs the agent’s reason, its confidence and the exact action side by side with the run that led there.',
      'Taking over must always be possible: stopping the agent and finishing the task by hand, from its draft.',
    ],
    avoid: [
      { when: 'An approval in the middle of a conversation the operator is already watching.', use: 'AI/Tool call' },
      { when: 'Reviewing a set of file or record changes the agent proposes.', use: 'AI/Change review' },
      { when: 'Confirming a destructive action the person started themselves.', use: 'Patterns/Confirmation' },
      { when: 'Watching a run that does not need anyone.', use: 'AI/Agent run' },
    ],
    parts: {
      'AI/Agent run': 'The run beside the decision, as a timeline: what the agent did before it stopped, and what it does after.',
      'AI/Confidence': 'How sure the agent is that the charge is a duplicate, as a level and a basis a person can check.',
      'AI/Message': 'The agent’s reason for stopping in its own words, and the conversation with the customer, draft included.',
      'AI/Run status': 'The hand-off’s state in the header: Needs approval, Running, Succeeded, Failed or Taken over.',
      'AI/Tool call':
        'The exact action proposed, with Approve refund and Deny of equal weight; later its failure, verbatim, with Retry call.',
      'Components/Actions/Button': 'Take over in the header, Reassign to billing, and Send reply.',
      'Components/Feedback/Badge': 'Whether the reply is a draft or sent, as a dot, a word and a tone.',
      'Components/Feedback/Callout': 'Who can approve, when the person cannot; and the result, once the refund is issued.',
      'Components/Feedback/Empty state': 'The queue with nothing waiting.',
      'Components/Forms/Field': 'The person’s reply after taking over, a labelled Textarea that starts from the agent’s draft.',
      'Components/Layout/Page header': 'The ticket’s subject, who handed it off, the status and Take over.',
      'Components/Navigation/Breadcrumb': 'Where the ticket sits: Support, Escalations, the ticket id.',
    },
    states: {
      empty: { story: 'NothingWaiting', note: 'Nothing needs the person: the empty state says what will appear and when.' },
      loading: {
        note: 'Not shown. While the refund runs, the hand-off says “Issuing the refund” and the call carries the working relleno; a hand-off still loading would use Skeleton in the panel’s shape, as the Empty states pattern does for a table.',
      },
      error: {
        story: 'RefundFails',
        note: 'The approved refund failed: the call shows the error verbatim with Retry call, nothing reaches the customer, and Take over stays.',
      },
      noPermission: {
        story: 'NoPermission',
        note: 'The person may not approve a refund this size: the proposal shows without Approve, the callout names who can and offers to reassign, and Take over stays.',
      },
    },
    accessibility: [
      'Approve, Deny and Take over each remove the button that was pressed, so focus moves to the hand-off’s heading, which says what happened.',
      'Outcomes that land later, such as the refund finishing, go to one polite status; a failed refund is the tool call’s own alert, not a second one.',
      'The agent’s words are in Alegreya, the action is in Martian Mono and the controls are in Archivo, so the voice can be told apart without colour.',
      'Approve and Deny are the same size and variant, so neither is nudged.',
    ],
  },
  'Patterns/Confirmation': {
    summary:
      'A destructive action that cannot be undone and takes a round trip: ask first, show it working, and say plainly whether it happened.',
    use: [
      'Deleting, revoking or cancelling something that cannot be restored, such as an API key or a workspace.',
      'The action takes a request that can be slow or fail, and the person must know which of the two it did.',
      'The friction should match the damage: type-to-confirm for what breaks other people, a plain confirm otherwise.',
    ],
    avoid: [
      { when: 'An action that can be undone; do it at once and offer Undo in a toast.', use: 'Components/Feedback/Toast' },
      { when: 'Leaving a page with unsaved changes, or a destructive action beside a long form.', use: 'Patterns/Settings page' },
      { when: 'Approving an action an agent proposes.', use: 'Patterns/Agent hand-off' },
    ],
    parts: {
      'Components/Actions/Button': 'Revoke on each active key’s row, gone once the key is revoked; Create key.',
      'Components/Data display/Code': 'The key’s hint, a machine literal, in the table and in the question.',
      'Components/Data display/Table': 'The keys, with who made them, when each was last used and its state.',
      'Components/Feedback/Badge': 'Live or Test, and Active or Revoked, in words as well as tone.',
      'Components/Feedback/Callout': 'Who can revoke, for a member who cannot.',
      'Components/Feedback/Empty state': 'No keys yet, and why to make one per service.',
      'Components/Feedback/Toast': 'What happened, after the dialog closes on success.',
      'Components/Layout/Page header': 'The page’s title, description and Create key.',
      'Components/Navigation/Breadcrumb': 'Settings, then API keys.',
      'Components/Overlays/Dialog':
        'AlertDialog: the question, the consequence by name, type-to-confirm for live keys, the pending strip, the failure in `error`, and where focus goes after in `finalFocus`.',
    },
    states: {
      empty: { story: 'NoKeys', note: 'No keys: the empty state makes the case for one per service.' },
      loading: {
        note: 'The list loading is not shown; it would be the table’s shape with skeleton rows, as in Empty states. The request in flight is shown by AlertDialog itself: the working strip on Revoke key, and neither button nor Escape answers.',
      },
      error: {
        story: 'RevokeFails',
        note: 'The revoke failed: the dialog stays open, says “Not revoked” with the reason and that the key still works, and Revoke key tries again.',
      },
      noPermission: {
        story: 'MemberView',
        note: 'A member sees the keys but no Revoke or Create to press and fail at; the callout names the admins.',
      },
    },
    accessibility: [
      'Cancel has focus when the dialog opens, so a reflexive Enter keeps the key.',
      'The failure is AlertDialog’s `error`: announced once as an alert, and the description of Revoke key, so it is read again with the verb.',
      'Cancel returns focus to the row’s Revoke button. After a revoke that button is gone, so focus moves to the nearest active key’s Revoke, or to the “0 active keys” heading; the state badge and the toast say it is done.',
      'Each Revoke is named for its key (“Revoke Support widget”), so a list of them is not five identical buttons.',
    ],
  },
  'Patterns/Empty states': {
    summary:
      'One screen, every way a list can have nothing to show: first run, no results, loading, error and no permission, each saying something different.',
    use: [
      'Designing any list or table screen: settle what each of these conditions says before the populated state.',
      'Telling “nothing exists yet” apart from “your search hides it” and from “you may not see it”.',
      'A load that can fail, where the reader needs to know what is still true and how to try again.',
    ],
    avoid: [
      { when: 'One panel that is empty, rather than a whole screen.', use: 'Components/Feedback/Empty state' },
      { when: 'A table that filters on several fields at once.', use: 'Patterns/Filtered table' },
      { when: 'A short loading moment inside a component that keeps its shape.', use: 'Components/Feedback/Skeleton' },
    ],
    parts: {
      'Components/Actions/Button': 'Connect source, Show all sources, Retry and Ask for access: one way forward per condition.',
      'Components/Data display/Table':
        'The list, which keeps its headers while it loads, over TableSkeletonRows.',
      'Components/Feedback/Badge': 'Each source’s sync state, as a dot, a word and a tone.',
      'Components/Feedback/Empty state': 'First run, no results, error and no permission, each its own variant with its own action.',
      'Components/Forms/Field': 'The labelled search field, a SearchInput, shown only when there is something to search.',
      'Components/Layout/Page header': 'The title, what sources are for, and Connect source unless the reader cannot use it.',
      'Components/Navigation/Breadcrumb': 'Support, then Knowledge sources.',
    },
    states: {
      empty: {
        story: 'FirstRun',
        note: 'Nothing connected: the empty state is the whole body and connects the first source. No results is its own story: the count and search stay, and Show all sources clears it.',
      },
      loading: {
        story: 'Loading',
        note: 'The table’s real headers over skeleton rows, `aria-busy`, and one polite “Loading knowledge sources”.',
      },
      error: {
        story: 'LoadError',
        note: 'An alert that says what is still true and offers Retry; once the rows are back, focus moves to their heading.',
      },
      noPermission: {
        story: 'NoPermission',
        note: 'Names the two admins who can grant access, and drops Connect source from the header.',
      },
    },
    accessibility: [
      'Show all sources returns focus to the search field; it is not called “Clear search” because the field’s own clear button already has that name.',
      'After Retry, focus moves to the heading of the list that loaded, since the Retry button has gone.',
      'The error is announced once, as an alert; loading is announced once, as a status, not row by row.',
      'Every empty state heading is a level 2 heading, so it is in the page outline where the table would be.',
    ],
  },
  'Patterns/Filtered table': {
    summary:
      'A table of many records narrowed by several filters at once, with bulk actions on a selection and each record opening in a drawer.',
    use: [
      'An admin list of hundreds of records that people narrow by text, owner, date and status, then act on in bulk.',
      'Filters that combine; each status toggle shows how many records it would leave under the other filters.',
      'Reading one record without losing the list, in a Drawer.',
    ],
    avoid: [
      { when: 'Under about twenty records, or one search box is enough.', use: 'Patterns/Empty states' },
      { when: 'Each record is worth a pane of its own, beside the list.', use: 'Patterns/List and detail' },
      { when: 'A small table with no filters or selection.', use: 'Components/Data display/Table' },
    ],
    parts: {
      'Components/Actions/Button': 'Export and New run in the header, and the bulk actions on a selection.',
      'Components/Data display/Description list': 'The chosen run’s details in the drawer.',
      'Components/Data display/Table':
        'DataTable: sorting, selection, the bulk-action bar, the Columns menu, pages, and the no-results state.',
      'Components/Feedback/Badge': 'Each run’s status, as a dot, a word and a tone.',
      'Components/Forms/Combobox': 'The agent filter.',
      'Components/Forms/Date picker': 'DateRangePicker with presets, for when runs started.',
      'Components/Forms/Field': 'A visible label on every filter, and the search box.',
      'Components/Layout/Page header': 'The title, what the list holds, Export and New run.',
      'Components/Layout/Toolbar': 'The status toggles with their counts, Clear filters and Refresh.',
      'Components/Overlays/Drawer': 'One run, opened from its id without leaving the list.',
    },
    states: {
      empty: {
        note: 'Not a story: filtering to nothing gives the no-results empty state inside the table, with Clear filters. It never offers to create a first run. A workspace with no runs at all is the first-run case in Empty states.',
      },
      loading: {
        note: 'Not a story: Refresh shows the table’s own loading rows in place, keeping the filters. A first load would do the same.',
      },
      error: { note: 'Not shown. A failed load would be an error empty state with Retry in the table’s place, as in Empty states.' },
      noPermission: {
        note: 'Not shown. Someone who may not cancel runs should see the selection without Cancel, not a Cancel that fails.',
      },
    },
    accessibility: [
      'The filters are a `search` landmark, and every filter has a visible label; a placeholder is a hint and disappears as soon as someone types.',
      'Changing a filter clears the selection, so a bulk action never lands on rows the filter now hides.',
      'The status toggles are one Toolbar, a single tab stop moved through with the arrow keys.',
      'A table wider than its frame scrolls sideways, and the frame then takes focus so the keyboard can scroll it.',
    ],
  },
  'Patterns/List and detail': {
    summary:
      'Every item on the start side and the chosen one on the end side, collapsing to one pane at a time when its container is narrow.',
    use: [
      'Browsing a set of items, such as agents, where each has enough detail to need its own pane.',
      'People compare items by moving down the list, with the detail beside it.',
      'The same screen must work in a narrow container, one pane at a time, with a visible way back.',
    ],
    avoid: [
      { when: 'Hundreds of records narrowed by several filters.', use: 'Patterns/Filtered table' },
      { when: 'A quick look at one record without leaving a table.', use: 'Components/Overlays/Drawer' },
      { when: 'A few items whose detail fits in a line each.', use: 'Components/Data display/Table' },
    ],
    parts: {
      'Components/Actions/Button': 'Each agent in the list, Back to agents, Create agent, and pause or start.',
      'Components/Data display/Description list': 'The chosen agent’s model, tools and owner.',
      'Components/Data display/Stat': 'Runs, success rate and cost for the chosen agent, as a StatGroup.',
      'Components/Data display/Table': 'The chosen agent’s recent runs.',
      'Components/Feedback/Badge': 'Each agent’s state and each run’s status, as a dot, a word and a tone.',
      'Components/Feedback/Callout': 'A failing agent’s problem, at the top of its detail.',
      'Components/Feedback/Empty state': 'No agents at all, and a draft agent with no runs yet.',
      'Components/Layout/Page header': 'The title, how many agents are failing, and Create agent.',
      'Components/Typography/Heading': 'The detail pane’s heading, which takes focus when an agent opens in one column.',
    },
    states: {
      empty: {
        story: 'Empty',
        note: 'No agents: the empty state alone, whose action creates the first. A draft agent’s detail has its own “No runs yet”.',
      },
      loading: { note: 'Not shown. The list and the detail would each keep their shape with Skeleton while they load.' },
      error: {
        note: 'Not shown as a load failure. A failing agent is a state of the data, shown as a danger Callout in its detail with the way to fix it.',
      },
      noPermission: { note: 'Not shown. An agent the reader may not open should not be in the list, rather than open to a refusal.' },
    },
    accessibility: [
      'Each agent is a button marked `aria-current` when it is the one shown, because choosing one is navigation; a listbox could not carry the badge and second line.',
      'In one column, opening an agent moves focus to the detail’s heading, and Back to agents returns it to the agent you came from.',
      'The split is a container query, so it responds to the space it is given, with or without the sidebar.',
      'The agent’s purpose is in Alegreya because a person wrote it; models, tools and ids are in Martian Mono.',
    ],
  },
  'Patterns/Settings page': {
    summary:
      'A long settings form saved as a whole, with errors on save, a guard on leaving with unsaved changes, and a danger zone outside the form.',
    use: [
      'Settings whose values are one decision together, such as a spend limit and what happens when it is reached.',
      'A form long enough that Save must stay in reach, with a count of what is unsaved.',
      'A page that also holds one immediate, destructive action that must not be part of Save.',
    ],
    avoid: [
      { when: 'A single setting that should take effect the moment it changes.', use: 'Components/Forms/Switch' },
      { when: 'A destructive action that is the subject of the page, and can fail.', use: 'Patterns/Confirmation' },
      { when: 'A short form in a dialog or a step of a flow.', use: 'Components/Forms/Field' },
    ],
    parts: {
      'Components/Actions/Button': 'Save changes and Discard in the sticky bar, and Delete workspace in the danger zone.',
      'Components/Feedback/Toast': 'Saved, and Discard with Undo, so neither needs a dialog.',
      'Components/Forms/Field': 'Every label, hint and error, around Input and Textarea.',
      'Components/Forms/Number input': 'Tokens per run and the monthly limit.',
      'Components/Forms/Radio': 'What happens when the limit is reached.',
      'Components/Forms/Select': 'The default model.',
      'Components/Forms/Switch': 'Each notification.',
      'Components/Layout/App shell': 'NavItem, for the settings pages beside the form.',
      'Components/Layout/Page header': 'The workspace’s name and what the page changes.',
      'Components/Overlays/Dialog': 'AlertDialog, for leaving with unsaved changes and for deleting the workspace.',
      'Components/Typography/Heading': 'Each section of the form.',
    },
    states: {
      empty: { note: 'Not applicable: a settings form always has values. A section with nothing to set would say why in its description.' },
      loading: {
        note: 'Not shown. Saving is shown: Save changes carries its working strip and stays focusable. A first load would keep the form’s shape with Skeleton.',
      },
      error: {
        story: 'WithValidationErrors',
        note: 'Save pressed with three problems: each says what is wrong and what to do, focus is on the first, and the bar counts what needs fixing.',
      },
      noPermission: {
        note: 'Not shown. Someone who may not change settings should see the values as read-only text with who can change them, not a form that refuses on Save.',
      },
    },
    accessibility: [
      'The bar at the foot is always mounted, and Save stays focusable while disabled, so saving never drops focus to the top of the page.',
      'Errors appear on Save, not while typing; focus goes to the first, and each clears as soon as its field is fixed.',
      'The unsaved count is a number in words, “3 unsaved changes”, not a dot, so it reads the same to a screen reader and in forced colours.',
      'Leaving with unsaved changes asks first, with Keep editing focused.',
    ],
  },
}
