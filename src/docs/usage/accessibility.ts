import type { Accessibility } from './accessibility-types'

/**
 * The Accessibility section of every component page: the keys it answers to,
 * what Mola handles, and what is left to you.
 *
 * Every keyboard row was read from the component's source, its unit tests or
 * the Base UI primitive it wraps, not from what the WAI-ARIA pattern says a
 * component of that kind should do. Where the two differ, the page says what
 * the component does. Every key a table names must also be pressed by the
 * component's unit tests: keyboard-coverage.test.ts fails a page with a key
 * nobody presses, and docs/accessibility/evidence.json is generated from the
 * same reading.
 *
 * It is data beside guidance.ts, rather than inside it, because it answers a
 * different reader: guidance is "should I use this", this is "what do I owe
 * the people using it". The agent manifest carries both.
 */

/**
 * Pages whose component renders nothing to focus or operate, so they have no
 * keyboard table. Children a consumer passes in do not count: an EmptyState's
 * action is the consumer's Button, documented on its own page. Callout is
 * interactive because of its own dismiss button.
 *
 * contract.ts checks both directions: a page here must have no keyboard rows,
 * a page not here must have some, and a page here whose unit tests press keys
 * is a contradiction that fails.
 */
export const NON_INTERACTIVE: ReadonlySet<string> = new Set([
  'AI/Confidence',
  'AI/Run status',
  'AI/Streaming text',
  'AI/Token usage',
  'Components/Data display/Avatar',
  'Components/Data display/Description list',
  'Components/Data display/Stat',
  'Components/Data display/Relative time',
  'Components/Data display/Swatch',
  'Components/Data display/Timeline',
  'Components/Feedback/Badge',
  'Components/Feedback/Empty state',
  'Components/Feedback/Placeholder',
  'Components/Feedback/Progress',
  'Components/Feedback/Skeleton',
  'Components/Layout/Container',
  'Components/Layout/Divider',
  'Components/Layout/Grid',
  'Components/Layout/Page header',
  'Components/Layout/Panel',
  'Components/Layout/Stack',
  'Components/Typography/Display',
  'Components/Typography/Heading',
  'Components/Typography/Kbd',
  'Components/Typography/Lead',
  'Components/Typography/Meta',
  'Components/Typography/Prose',
  'Components/Typography/Pullquote',
  'Components/Typography/Rotulo',
  'Components/Typography/Text',
])

export const ACCESSIBILITY: Record<string, Accessibility> = {
  'AI/Agent run': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves through Cancel run or Retry run, Copy run id, and each step that has detail, including a step held open because it failed or waits for approval.' },
      { keys: ['Enter', 'Space'], action: 'Activates the focused button, or opens and closes the focused step.' },
      { keys: ['Shift+Tab'], action: 'Moves back through the same stops.' },
    ],
    handles: [
      'The run is a section named by its heading, and the steps are an ordered list named “Steps of” the run.',
      'Each change of run status is announced once through a polite status region; single steps are not announced, a failure the panel already alerts is not said twice, and a streamed answer inside the run leaves “Response complete.” to the run’s own “Run succeeded.”.',
      'When a retry removes the failure panel, focus moves to the run’s heading instead of falling to the page.',
      'Each step’s status is a glyph, a word and a colour, and a step that needs approval or has failed opens itself.',
    ],
    you: [
      'Give the run a `name` and each step a `title` in words; the tool’s literal name belongs in `detail`.',
      'Set `headingLevel` so the run’s heading fits the page outline.',
    ],
  },
  'AI/Change review': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves to the Reason field, then to Approve, Request changes and Reject.' },
      { keys: ['Enter', 'Space'], action: 'Decides with the focused button.' },
      { keys: ['Enter', 'Space'], action: 'On a hunk header in a diff, folds or unfolds that hunk.' },
    ],
    handles: [
      'Reject or Request changes with an empty reason states the error in words, marks the field invalid, moves focus to it and does not call `onDecide`.',
      'The outcome replaces the form and takes focus once, so it is heard once; a decision that arrives already made does not take focus.',
      'The three decisions sit in a group named “Decision”, each a glyph and a word of the same weight.',
      'Diff lines are list items that say “Added:” or “Removed:”, line numbers and +/− glyphs are hidden from screen readers, and counts are read as “12 lines added, 3 lines removed”.',
    ],
    you: [
      'Give the change a `title` that says what it does, and pass `reviewer` so the outcome says who decided.',
      'Set `headingLevel` on the review and its diffs so the headings fit the page outline.',
    ],
  },
  'AI/Confidence': {
    handles: [
      'The level is said in words, “High confidence”, and the three segments are hidden from screen readers.',
      'The segments differ in how many are filled, not only in colour, so the level reads in greyscale.',
      '`UncertaintyNote` is an `<aside>` named by its `title`, with its icon hidden from screen readers.',
    ],
    you: [
      'Pass `basis` so the reader hears what the confidence rests on.',
      'Give each `UncertaintyNote` a specific `title`; two notes with the default share one landmark name.',
    ],
  },
  'AI/Message': {
    keyboard: [
      { keys: ['Tab'], action: 'Reaches a message’s Copy, Regenerate and rating buttons, which stay in the tab order while hidden.' },
      { keys: ['Enter', 'Space'], action: 'Activates the focused action, Retry, or Jump to latest.' },
      { keys: ['Tab'], action: 'In a `Thread`, also stops on the transcript itself, so it can be scrolled.' },
      { keys: ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'], action: 'Scrolls the focused transcript.' },
    ],
    handles: [
      'Each message is an article named by its speaker and time, and a failed message states the failure in an alert with the error verbatim.',
      'The rating buttons are toggle buttons with `aria-pressed`, and a copy is confirmed in a status region.',
      'A `Thread` is a region named by `label`, not a live region, so a streaming answer is not read token by token.',
      'The thread follows new content only while the reader is at the bottom, and offers Jump to latest when they are not.',
    ],
    you: [
      'Give `Thread` a `label` that names the conversation.',
      'Pass `author` when the speaker is more specific than the role, so the article’s name says who.',
    ],
  },
  'AI/Prompt input': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves to each attachment’s remove button, then to the field, the toolbar, and Send or Stop.' },
      { keys: ['Enter'], action: 'Sends the prompt; with `submitOn="mod-enter"` it adds a new line instead.' },
      { keys: ['Shift+Enter'], action: 'Adds a new line when Enter sends.' },
      { keys: ['Control+Enter', 'Meta+Enter'], action: 'Sends the prompt when `submitOn` is `mod-enter`.' },
      { keys: ['Enter', 'Space'], action: 'Activates Send, Stop or Remove.' },
    ],
    handles: [
      'The field is labelled by `label` in a visually hidden `<label>`, and described by the hint line, which says why it cannot send while offline.',
      'Offline keeps the field editable and the draft kept; while generating, Send becomes Stop in the same place.',
      'Enter does not send while an input method is still composing.',
      'The token estimate is heard as “About 120 tokens”, and each attachment’s remove button is named “Remove” and the file name.',
    ],
    you: [
      'Pass a `label` that says who the message goes to, such as “Message Cayuco”.',
      'Give each control you put in `toolbar` its own accessible name.',
    ],
  },
  'AI/Reasoning': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the summary line.' },
      { keys: ['Enter', 'Space'], action: 'Opens or closes the reasoning.' },
    ],
    handles: [
      'The summary is a button with `aria-expanded`, named by its own words: “Thinking” or “Thought for 12.4s”.',
      'Opened while the model thinks, the text is `aria-busy` and says “Reasoning complete.” once when it ends.',
      'The working texture is hidden from screen readers; the word “Thinking” says the same thing.',
    ],
    you: [
      'Pass `startedAt` and `endedAt`, or `durationMs`, so the summary says how long the model thought.',
    ],
  },
  'AI/Run error': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves to Retry from step, Retry run and Copy error details, in that order.' },
      { keys: ['Enter', 'Space'], action: 'Activates the focused button.' },
    ],
    handles: [
      'The panel is a group named by its headline, and a failure, rate limit or timeout is an alert; a cancellation is not.',
      'A countdown is announced only with the error, at ten seconds and at zero, never every second.',
      'While a retry must wait, the buttons are disabled and a sentence says until when; Retry from step is described by the headline.',
      'Copy error details confirms the copy once in a status region.',
    ],
    you: [
      'Pass `step` and `stepNumber` so the headline and the retry button say where the run stopped.',
      'Used on its own rather than inside `AgentRun`, move focus somewhere sensible when a retry removes the panel.',
    ],
  },
  'AI/Run status': {
    handles: [
      'Every status is a glyph, a word and a colour; the glyphs differ in shape, and the glyph is hidden from screen readers.',
      'The elapsed clock is plain text, so it does not announce every tick.',
    ],
    you: [
      'Announce a change of status yourself where it matters; `RunStatus` is not a live region.',
      'Use `label` to change the word, such as “Thinking”, and keep it a word a person would say.',
    ],
  },
  'AI/Side-by-side diff': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the old pane, then the new one; a focused pane scrolls sideways with the arrow keys.' },
    ],
    handles: [
      'The diff is a section named by its title, and each pane a focusable region named by its label and the title, so a keyboard can scroll it and a screen reader can jump to it.',
      'Changed lines say “Removed:” or “Added:”, and carry a +/− glyph as well as the wash; line numbers and glyphs are hidden from screen readers and from a copy.',
      'The blank rows that keep the panes aligned are hidden from screen readers, so each pane reads as its version, in order.',
      'The panes scroll together and carry the scroll-edge cue while there is more to the side; below 48rem they become one column of wrapped lines.',
      'Code is pinned left to right, so a right-to-left page does not reorder a line of source.',
    ],
    you: [
      'Give it a `title` that says what is compared, and pane labels that say which version is which.',
      'Set `headingLevel` so the title fits the page outline.',
    ],
  },
  'AI/Sources': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves to a citation marker and opens its preview card, or to a source card in the list.' },
      { keys: ['Enter'], action: 'Follows the focused marker to its source card, or opens the focused source in a new tab.' },
      { keys: ['Escape'], action: 'Closes the preview card.' },
    ],
    handles: [
      'A marker is a link named “Source 2:” and the source’s title, not “2”.',
      'The preview card opens on keyboard focus as well as hover, and repeats the list card, so missing it loses nothing.',
      'Links that open a new tab say so to screen readers, and the arrow glyphs are hidden from them.',
    ],
    you: [
      'Pass `source` or `title` to each `Citation`, or the marker is named only by its number.',
      'Render the `SourceList` on the same page under a heading, so `#source-n` has somewhere to land.',
    ],
  },
  'AI/Markdown': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves through the answer’s links and citation markers in reading order, then a code block’s wrap and copy buttons and a table that scrolls.' },
    ],
    handles: [
      'Headings are real headings, from `headingLevel` down, so the answer joins the page outline; lists, quotes and tables are their own elements.',
      'The text is `aria-busy` while it streams, and a polite status says “Response complete.” once, when a running stream ends.',
      'Nothing from the model is rendered as HTML, and a link keeps its href only for http(s), mailto and relative paths.',
      'An absolute link opens in a new tab and says “(opens in a new tab)” to screen readers.',
      'Citation markers go through `renderCitation`, so with `citationRenderer` each is a link named “Source 2:” and the source’s title.',
    ],
    you: [
      'Set `headingLevel` so the answer’s headings sit under the heading above it.',
      'Render the `SourceList` on the same page, so each marker’s `#source-n` link has somewhere to land.',
    ],
  },
  'AI/Streaming text': {
    handles: [
      'The text is `aria-busy` while it streams, so it is not read token by token.',
      'A polite status says “Response complete.” or “Response stopped with an error.” once, when a running stream ends, and not on mount; inside an `AgentRun` the run announces the outcome instead.',
      'The caret is hidden from screen readers, and under reduced motion it stops blinking.',
    ],
    you: [
      'Set `doneAnnouncement` when “Response complete.” is not the right words for what finished.',
      'Name the citations you render through `renderCitation`; `Citation` does this from the source’s title.',
    ],
  },
  'AI/Token usage': {
    handles: [
      'The context bar is a `role="meter"` named “Context window used”, with a value text such as “84% of the context window, near the limit”.',
      'Near and at the limit are said in words as well as in gold and red.',
      'The full variant is a description list, so each figure is heard with its term.',
    ],
    you: [
      'Say whose usage it is, with a heading or the run it sits in; the component does not.',
    ],
  },
  'AI/Tool call': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves to the call’s header, then to Approve, Deny, Retry call and the payload’s buttons when open; the header is a stop even while the call is held open.' },
      { keys: ['Enter', 'Space'], action: 'Opens or closes the call from its header, or activates the focused button.' },
      { keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], action: 'Scrolls a focused arguments or result block.' },
    ],
    handles: [
      'The header is a button with `aria-expanded`, and a failed call or one waiting for approval opens itself; held open, the header stays focusable and is `aria-disabled`, so its name and status are still a stop.',
      'A failure is an alert with the error verbatim, except inside an `AgentRun` that has already raised it.',
      'Status is a glyph, a word and a colour, and Approve and Deny are buttons of the same weight.',
      '`ToolCallGroup` is a group named “N tools in parallel”, or by its `label`.',
    ],
    you: [
      'State in `approval.reason` why a person must approve, in words.',
      'Pass a `title` in words when the tool’s name alone does not say what the call is for.',
    ],
  },
  'Components/Actions/Button': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the button, including while it is loading.' },
      { keys: ['Enter', 'Space'], action: 'Activates it, unless it is disabled or loading.' },
    ],
    handles: [
      'Renders a native `<button>` through Base UI, so it is announced as a button with its label as the name.',
      'While `loading`, sets `aria-busy`, stops accepting presses and stays focusable, so focus is not thrown back to the top of the page.',
      'Hides the leading icon and the arrow from assistive tech, so the label alone is the name.',
      'Gives `IconButton` its `label` as both the `aria-label` and the native tooltip.',
    ],
    you: [
      'Write a label that names the action with a verb: Deploy, Save changes.',
      'Give every `IconButton` a `label`; the icon is not a name.',
      'Use `LinkButton` when the control goes somewhere rather than does something.',
    ],
  },
  'Components/Data display/Avatar': {
    handles: [
      'Gives the tile `role="img"` and the `name` as its accessible name and tooltip.',
      'Hides the initials or icon from assistive tech, and gives the image an empty `alt`, so the name is read once.',
      'Keeps the initials until the image has loaded, so a broken URL never shows a broken-image glyph.',
      'Makes `AvatarGroup` a named group, and reads the overflow tile as "3 more" rather than "+3".',
    ],
    you: [
      'Pass the full name, not initials, as `name`.',
      'Give `AvatarGroup` a `label` that says who the people are: Reviewers, On call.',
      'Wrap the avatar in a link or button yourself if it opens a profile; it is not interactive.',
    ],
  },
  'Components/Data display/Code': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the wrap toggle, the copy button, then the code itself.' },
      { keys: ['Enter', 'Space'], action: 'Toggles line wrapping, or copies the code, on the focused button.' },
      { keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], action: 'Scrolls the code while it has focus.' },
    ],
    handles: [
      'Makes the scrolling `<pre>` focusable and names it by the block label, so the overflow is reachable without a mouse.',
      'Reports the wrap toggle as pressed or not pressed with `aria-pressed`.',
      'Announces a copy through a polite status that is always mounted, as well as turning the icon into a check.',
      'Pins the code body left to right in a right-to-left page, while the header mirrors.',
    ],
    you: [
      'Give the block a `label` that says what the code is: arguments, result, query.sql.',
      'Set `copyable={false}` for content that must not leave the page.',
    ],
  },
  'Components/Data display/Description list': {
    handles: [
      'Renders a real `<dl>` with each `<dt>` and `<dd>` pair grouped in a `<div>`, so terms and values are read together.',
      'Sets values marked `literal` in the machine face, so an id is not mistaken for prose.',
    ],
    you: [
      'Write terms as short nouns, and keep each value to the fact it names.',
      'Put a heading above the list; it has no name of its own.',
    ],
  },
  'Components/Data display/Stat': {
    handles: [
      'Renders each tile as a `<dt>` and `<dd>` pair, inside one `<dl>` for a `StatGroup` or its own `<dl>` when alone.',
      'Reads the delta as one sentence, "Up 12%, vs last week, an improvement", and hides the arrow and the separate parts.',
      'Carries direction in the arrow and sentiment in the colour, so neither depends on colour alone.',
      'Hides the sparkline from assistive tech, because the figure and the delta already say what it shows.',
    ],
    you: [
      'Set `sentiment` on every delta; the tile does not guess that up is good.',
      'Give the comparison in `period` so the change has something to be measured against.',
    ],
  },
  'Components/Data display/Swatch': {
    handles: [
      'Is always `aria-hidden`, so it can never be the only carrier of a meaning.',
      'Paints itself in the system text colour in forced colours mode, so the key stays visible.',
    ],
    you: [
      'Put the word the colour stands for beside the swatch.',
    ],
  },
  'Components/Data display/Table': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the sort buttons, the row checkboxes and the other controls in turn.' },
      { keys: ['Enter', 'Space'], action: 'Sorts by the focused column header.' },
      { keys: ['Space'], action: 'Selects or clears the focused row checkbox, or every row on the page from the header box.' },
      { keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'], action: 'Scrolls the table frame when it overflows and has focus.' },
      { keys: ['Escape'], action: 'Closes the column menu and returns focus to the Columns button.' },
      { keys: ['Enter', 'Space'], action: 'Expands or collapses the focused row’s details, with `renderExpanded`.' },
      {
        keys: ['ArrowLeft', 'ArrowRight'],
        action: 'On a column resize handle, moves the column’s edge by 16px. In right-to-left the edge is on the left, and the arrow pointing away from the column widens it.',
      },
      { keys: ['Shift+ArrowLeft', 'Shift+ArrowRight'], action: 'On a column resize handle, moves the edge by 64px.' },
      { keys: ['Home', 'End'], action: 'On a column resize handle, makes the column its narrowest or its widest.' },
    ],
    handles: [
      'Puts the scrolling frame in the tab order only when the table overflows it, and then makes it a group named as the table is.',
      'Sets `aria-sort` on the sorted column only, and `aria-selected` on selected rows.',
      'Uses native checkboxes with a 24px hit area around the drawn square, and announces the selection count once through a polite status.',
      'Marks a loading `DataTable` with `aria-busy` and hides its skeleton rows from assistive tech.',
      'With `virtualize`, sets `aria-rowcount` and `aria-rowindex` so the full count is heard, and keeps the focused row rendered while it is scrolled away.',
      'Makes each column resize handle a focusable separator with its width as `aria-valuenow`, so it can be found and moved without a pointer.',
      'Gives each row’s disclosure button `aria-expanded`, and `aria-controls` pointing at its detail row while open.',
      'Keeps table semantics in the stacked phone layout, with explicit roles, and hides the repeated cell labels from assistive tech, which already hears the column header.',
    ],
    you: [
      'Name the table with `label` or `aria-label`, or a `caption`.',
      'Give `rowLabel` so each row checkbox says which row it selects, and `expandLabel` so each disclosure button says which row it opens.',
      'Mark figure columns `numeric`, on the header and the cells alike.',
      'Give a virtual table a filter or search: find-in-page and a screen reader’s browse mode reach only the rows in view.',
    ],
  },
  'Components/Data display/Relative time': {
    handles: [
      'Renders a `<time>` whose `dateTime` is the exact moment in ISO 8601, and whose `title` shows it to a pointer.',
      'Is not a live region, so a time that moves on every minute is never announced; the current text is read when it is reached.',
      'Takes the words from `Intl.RelativeTimeFormat` for the `locale`, so a screen reader hears them in the page’s language.',
    ],
    you: [
      'Show the exact moment in text, not only in `title`, wherever someone must act on it; a title is not reachable by keyboard or touch.',
      'Say what happened beside it: “Last sync 3 minutes ago”, not “3 minutes ago” alone.',
    ],
  },
  'Components/Data display/Timeline': {
    handles: [
      'Renders an `<ol>` named by `label`, so a screen reader says where an event sits in the sequence.',
      'Hides the spine and the toned nodes from assistive tech; the title and meta carry what happened.',
      'In `StepList`, hides positional numerals, which the list already announces, and reads authored labels.',
    ],
    you: [
      'Give the timeline a `label`.',
      'Say what happened in each title, because the node colour is not read.',
      'Set `titleAs` to a heading level that fits the page outline.',
    ],
  },
  'Components/Feedback/Badge': {
    handles: [
      'Hides `StatusDot` from assistive tech when it sits beside a word, and gives it `role="img"` and a name when `label` is set.',
      'Cuts each tone as its own shape — hollow, striped, filled, half, crossed, diamond — so a state never rests on colour alone, even on a solid badge.',
      'Stills the pulse under reduced motion, leaving the dot in place.',
      'Keeps dots visible in forced colours mode by painting their shapes in the system colours.',
    ],
    you: [
      'Put the state in words inside the badge: Failed, Running; pass `dot` so the word has its shape beside it.',
      'Give a `StatusDot` that stands alone a `label`.',
    ],
  },
  'Components/Feedback/Banner': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves to the action and the Dismiss button, after the skip link and before the top bar.' },
      { keys: ['Enter', 'Space'], action: 'Runs the action, or dismisses the banner.' },
    ],
    handles: [
      'Is a landmark named Announcement, or your `label`, so it can be found in a landmark list.',
      'Says its tone in hidden words before the message, Warning, Error or Success, and hides the icon.',
      'Says nothing on its own. With `announce`, says the message once, politely, from a status region that mounts empty and is filled a moment later.',
      'Names the dismiss button “Dismiss”.',
    ],
    you: [
      'Give each banner a `label` that names its kind when a page could show more than one.',
      'Pass `announce` only for a banner that appears during the session.',
      'Decide whether a dismissed banner comes back, and when.',
    ],
  },
  'Components/Feedback/Callout': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the dismiss button, when `onDismiss` is set.' },
      { keys: ['Enter', 'Space'], action: 'Dismisses the callout.' },
    ],
    handles: [
      'Becomes a region named by its title when it has one, and stays out of the landmark list when it does not.',
      'Renders the title as a real heading at `headingLevel`.',
      'Hides the seam, the icon and the swatch from assistive tech; the title and body carry the tone in words.',
      'Names the dismiss button "Dismiss".',
    ],
    you: [
      'Choose a `headingLevel` that fits the page outline.',
      'Render a callout that appears in response to an action inside a live region, or use a toast.',
      'Move focus somewhere sensible after a dismiss, because the button that had it is gone.',
    ],
  },
  'Components/Feedback/Empty state': {
    handles: [
      'Renders the title as a real heading at `headingLevel`.',
      'Gives the `error` variant `role="alert"`, so a failed load is announced.',
      'Hides the icon and the seam from assistive tech.',
    ],
    you: [
      'Pick the variant that matches the situation, so the words fit it.',
      'Choose a `headingLevel` that fits the page outline.',
      'Pass the action that moves the person forward in `actions`.',
    ],
  },
  'Components/Feedback/Placeholder': {
    handles: [
      'Gives the slot `role="img"` and `alt` as its accessible name.',
      'Hides the visible label and name from assistive tech, so the slot is read once.',
    ],
    you: [
      'Write an `alt` that says what is missing and why: Account logo, not uploaded yet.',
    ],
  },
  'Components/Feedback/Progress': {
    handles: [
      'Gives `Progress` `role="progressbar"` and `Meter` `role="meter"`, with their values, through Base UI.',
      'Names each bar by its visible `label`.',
      'Leaves out the value while `Progress` is indeterminate, and stills the working texture under reduced motion.',
      'Shows a meter\'s level as a figure and as ticks on the track, not by the fill colour alone.',
    ],
    you: [
      'Give every bar a `label`, or an `aria-label` when there is no room for one.',
      'Use `valueText` when a count says more than a percentage: 212 of 300 prompts.',
    ],
  },
  'Components/Feedback/Skeleton': {
    handles: [
      'Hides every bone from assistive tech.',
      'In `SkeletonGroup`, marks the region `aria-busy` and says the `label` once through a polite status mounted from the first render.',
      'Removes the sweep under reduced motion, and in forced colours draws text bones in the system grey.',
    ],
    you: [
      'Wrap the bones in a `SkeletonGroup` and say what is loading in its `label`: Loading runs.',
    ],
  },
  'Components/Feedback/Notification centre': {
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the bell, opens the list and moves focus into it.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves through Mark all as read and each notification’s action.' },
      { keys: ['Escape'], action: 'Closes the list and returns focus to the bell.' },
    ],
    handles: [
      'Names the bell “Notifications”, with the unread count when there is one: “Notifications, 2 unread”.',
      'Changes the count silently, with no live region: the toast that raised the event already announced it.',
      'Renders a named list; each unread item starts with a hidden “Unread.” and its tone in words.',
      'Shows unread as an ink edge, a semibold title and the word New, never colour alone.',
      'Keeps focus in the popover when Mark all as read, its own button, goes away.',
    ],
    you: [
      'Raise a toast for an event that needs saying now; the centre will not say it.',
      'Write titles that stand on their own, away from the page they came from.',
      'Save the read state if it should survive a reload.',
    ],
  },
  'Components/Feedback/Toast': {
    keyboard: [
      { keys: ['F6'], action: 'Moves focus to the toast region and pauses the timers.' },
      { keys: ['Tab'], action: 'Moves through the toasts and their action and dismiss buttons.' },
      { keys: ['Enter', 'Space'], action: 'Runs the action, or dismisses the toast, on the focused button.' },
      { keys: ['Escape'], action: 'Closes the toast that has focus.' },
      { keys: ['Shift+Tab'], action: 'Leaves the region from its start and returns focus to where it was.' },
    ],
    handles: [
      'Renders the stack in a polite live region, and announces `danger` toasts assertively, once: the card opts out of the polite region so the alert is the only reading.',
      'Prefixes the title with hidden words for its tone: Success, Error, In progress.',
      'Pauses the timers while the region has keyboard focus, and keeps a running toast until it is updated or dismissed.',
      'Names the dismiss button "Dismiss".',
    ],
    you: [
      'Mount `ToastProvider` once, near the root.',
      'Write a title that says what happened without the page around it.',
      'Use a dialog for anything the person must answer; a toast can be missed.',
    ],
  },
  'Components/Forms/Checkbox': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the checkbox.' },
      { keys: ['Space'], action: 'Toggles it. Enter does not, as with a native checkbox.' },
    ],
    handles: [
      'Base UI renders `role="checkbox"` with `aria-checked`, and `aria-checked="mixed"` for indeterminate.',
      'The `label` names the control and the whole label toggles it; the `description` sits outside the label and arrives once, through `aria-describedby`.',
      'Indeterminate is a bar, not a faded check, so the third state is a shape and not a tint.',
      '`CheckboxGroup` is a real `<fieldset>` and `<legend>`, so each option is heard in the group’s context.',
    ],
    you: [
      'Give every checkbox a `label`, or an `aria-label` when it stands alone in a table row.',
      'Give a set of checkboxes a `CheckboxGroup` with a `legend` that names the question.',
    ],
  },
  'Components/Forms/Chip': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the chip, or into a radio set at its checked chip.' },
      { keys: ['Space'], action: 'Toggles a checkbox chip, or checks a radio chip.' },
      { keys: ['ArrowRight', 'ArrowDown'], action: 'Moves to and checks the next chip in a radio set.' },
      { keys: ['ArrowLeft', 'ArrowUp'], action: 'Moves to and checks the previous chip in a radio set.' },
    ],
    handles: [
      'Each chip is a real `<input type="checkbox">` or `radio`, visually hidden but focusable, so state, keys and form submission come from the platform.',
      'The wrapping `<label>` names the input, and `count` is joined with a real space so it is heard as “Failed 12”.',
      'Checked is an ink fill, not a hue change, and forced colours keep it.',
      '`ChipGroup` is a `<fieldset>` whose `legend` can be visually hidden with `hideLegend` and still be announced.',
    ],
    you: [
      'Wrap a row of chips in `ChipGroup` with a `legend` that says what they filter.',
      'Give radio chips one shared `name`, or the arrow keys will not move between them.',
    ],
  },
  'Components/Forms/Combobox': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the input.' },
      { keys: ['ArrowDown', 'ArrowUp'], action: 'Opens the list, then moves the highlight while the caret stays in the input.' },
      { keys: ['Enter'], action: 'Chooses the highlighted option.' },
      { keys: ['Escape'], action: 'Closes the list.' },
      { keys: ['ArrowLeft'], action: 'With `multiple`, reaches the chips from the start of the input; ArrowRight in right-to-left.' },
      { keys: ['Backspace'], action: 'With `multiple`, removes the focused chip, or the last one from an empty input.' },
    ],
    handles: [
      'Base UI renders a `combobox` input wired to a `listbox` with `aria-activedescendant`, and labelled `group`s for grouped options.',
      'Loading and “No matches” are said in Base UI’s polite status regions, and the list carries `aria-busy` while loading.',
      'The clear and open buttons are named (“Clear selection”), and each chip’s remove button is named “Remove <label>”; all three are 24px targets at every density.',
      'With `multiple`, the input is described with the count and the key that reaches the chips.',
    ],
    you: [
      'Name it: put it in a `Field`, or pass `label` or `aria-label`.',
      'Translate `clearLabel`, `triggerLabel`, `removeLabel` and `emptyMessage` with the rest of the page.',
    ],
  },
  'Components/Forms/Date picker': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the date input, then to the calendar button.' },
      { keys: ['Enter'], action: 'In the input, reads the typed date and states why if it is refused.' },
      { keys: ['Enter', 'Space'], action: 'On the calendar button, opens the calendar on the chosen day; in the grid, chooses the focused day.' },
      { keys: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'], action: 'Moves by day and by week; left and right swap in right-to-left.' },
      { keys: ['PageUp', 'PageDown', 'Shift+PageUp', 'Shift+PageDown'], action: 'Moves by month, or by year with Shift.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last day of the week.' },
      { keys: ['Escape'], action: 'Closes the calendar without changing the value and returns focus to the button.' },
    ],
    handles: [
      'The calendar is a `grid` named by its month heading, with one tab stop; the day carries `aria-selected`, today `aria-current="date"`, and an unavailable day says so in its name.',
      'The month heading is a polite live region, so paging is announced.',
      'The input is described by its format (“Format: DD/MM/YYYY”), and a refused date is a sentence in a `role="alert"` with a mark, not colour alone.',
      'The calendar button is named by the value, “Change date, 6 October 2026”, and focus returns to it when the calendar closes.',
    ],
    you: [
      'Name it: put it in a `Field`, or pass `aria-label`.',
      'State rules the picker cannot know, such as “required”, through `Field`’s `error`.',
    ],
  },
  'Components/Forms/Time picker': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves through the segments in order: hour, minute and day period, then the date input and calendar button in DateTimePicker.' },
      { keys: ['Shift+Tab'], action: 'Moves back through the same stops.' },
      { keys: ['ArrowUp', 'ArrowDown'], action: 'Steps the focused segment, wrapping at the ends; the minute moves by `minuteStep`.' },
      { keys: ['Home', 'End'], action: 'Sets the focused segment to its first or last value.' },
      { keys: ['ArrowLeft', 'ArrowRight'], action: 'Moves to the previous or next segment.' },
      { keys: ['Backspace', 'Delete'], action: 'Empties the focused segment; Backspace in an empty one moves back.' },
      { keys: ['Enter'], action: 'Reads the time and states why if it is refused.' },
    ],
    handles: [
      'The field is a `group` named by its label, and each segment a `spinbutton` named by the label and its word, “Deploy at Hour”, with `aria-valuetext` (“9”, “PM”, “Empty”).',
      'Digits type into a segment and move on when no further digit fits; a separator moves on, and the day period takes the first letter of the locale’s word.',
      'An incomplete or out-of-range time is a sentence in a `role="alert"` with a mark, not colour alone, and the value is kept until the time is valid.',
      'In DateTimePicker, the calendar keeps every key of the Date picker page, and a moment outside `min` or `max` is stated under both halves.',
    ],
    you: [
      'Name it: put it in a `Field`, or pass `aria-label`.',
      'Translate the segment words and sentences through `messages`.',
      'Say whose time zone a time is in when it is not the reader’s.',
    ],
  },
  'Components/Forms/Field': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the control.' },
      { keys: ['Enter', 'Space'], action: 'On a search field’s clear button, empties the field and returns focus to it.' },
    ],
    handles: [
      '`Field` links the label to the control and joins the hint and error into `aria-describedby`, in the order they are shown.',
      'An error sets `aria-invalid` and carries a cut square so it is not colour alone. It is announced with `role="alert"`, except inside a `Form` with a `FormErrorSummary`, which announces every error once.',
      'The required asterisk is hidden from assistive technology while `required` reaches the control; “Optional” is kept as a separate word.',
      '`SearchInput` is a `searchbox`, and its clear button is named “Clear search”.',
    ],
    you: [
      'Spread the `control` props onto the control; without them it has no name and no description.',
      'When several fields can fail at once, put the fields in a `Form` with a `FormErrorSummary`; their errors then stop being alerts and the summary takes focus.',
      'Bind the key shown by `shortcut` yourself; the key cap is display only.',
    ],
  },
  'Components/Forms/File upload': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the browse button, then to each file’s Retry and Remove buttons.' },
      { keys: ['Enter', 'Space'], action: 'Opens the system file picker, or runs the focused Retry or Remove.' },
    ],
    handles: [
      'The keyboard path is a real `<button>`; the dropzone is not a fake button.',
      'The accepted types and size limit are part of the button’s description, ahead of `Field`’s hint.',
      'Drag state, added files, rejections and finished uploads are said in a polite status region, and each rejection is a sentence naming the file and the rule.',
      'Removing a row moves focus to a neighbouring Remove button, or back to the browse button, never to the page.',
    ],
    you: [
      'Name it: put it in a `Field`, or pass `aria-label`; alone it is named only “Browse”.',
      'Pass `messages` to translate every announcement and button name.',
    ],
  },
  'Components/Forms/Listbox': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the chosen option, or the first, and Tab again leaves the list.' },
      { keys: ['ArrowDown', 'ArrowUp'], action: 'Moves focus to the next or previous option; in a single list, also chooses it.' },
      { keys: ['Home', 'End'], action: 'Moves focus to the first or last option; in a single list, also chooses it.' },
      { keys: ['Space'], action: 'Chooses the focused option; in a multiple list, toggles it.' },
      { keys: ['Shift+ArrowDown', 'Shift+ArrowUp'], action: 'In a multiple list, moves focus and toggles the option it lands on.' },
      { keys: ['Shift+Space'], action: 'In a multiple list, chooses every option from the last one chosen to the focused one.' },
      {
        keys: ['Control+Shift+Home', 'Control+Shift+End'],
        action: 'In a multiple list, chooses every option from the focused one to the first or last, and moves there.',
      },
      { keys: ['Control+A', 'Meta+A'], action: 'In a multiple list, chooses every option, or clears them all when all are chosen.' },
    ],
    handles: [
      'Renders `role="listbox"` with `aria-multiselectable` when several can be chosen, and `option`s with `aria-selected`.',
      'One tab stop with roving focus on the options themselves, so the focus ring and scrolling into view are the browser’s own.',
      'Typing a letter moves to the next option that starts with it; letters typed together match a word.',
      'Each option is named by its label and described by its second line, so the name stays short.',
      'A disabled option is focusable, `aria-disabled` and never chosen, so a keyboard user learns it exists.',
      'A chosen option is an ink fill with a check or a filled square, never the colour alone.',
    ],
    you: [
      'Name it: pass `aria-labelledby` pointing at a visible label, or `aria-label`.',
      'Say why an option is disabled, in its description or next to the list.',
      'Announce the consequence of a choice yourself if it changes the page, such as a count in a live region.',
    ],
  },
  'Components/Forms/Form': {
    keyboard: [
      { keys: ['Enter'], action: 'In a text field, submits the form; if it finds errors, moves focus to the error summary.' },
      { keys: ['Tab'], action: 'From the summary, moves through its links, one per error.' },
      { keys: ['Enter'], action: 'On a summary link, moves focus to that field’s control, or the first control of a group, and scrolls its label into view.' },
    ],
    handles: [
      'On the submit that finds errors, focus moves to the `FormErrorSummary`, a region named by its heading (“3 fields need fixing”). The focus move is the one announcement; the summary is not also a live region.',
      'While a summary is mounted, each field’s error drops `role="alert"` and stays in its control’s `aria-describedby`, so three errors are not three alerts.',
      'Without a summary, focus moves to the first invalid control in document order, and field errors keep `role="alert"`.',
      'Each summary entry is a real link to the control’s id, reading “Label: message”, listed in document order.',
      '`Fieldset` is a real `<fieldset>` named by its legend; its description and error are its `aria-describedby`, and `disabled` disables every Base UI control inside.',
    ],
    you: [
      'Validate in `onSubmit` and set each field’s `error`; the form does not decide what is wrong.',
      'Write errors that make sense away from their field, since the summary lists them on their own.',
      'For errors that arrive later, such as from a server, call `focus()` on the summary’s ref: only a submit moves focus by itself.',
      'Give the form a name with `aria-label` or `aria-labelledby` when the page has more than one.',
    ],
  },
  'Components/Forms/Number input': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the input. The − and + buttons are not tab stops.' },
      { keys: ['ArrowUp', 'ArrowDown'], action: 'Steps by `step`, with Shift by `largeStep` and with Alt by `smallStep`.' },
      { keys: ['PageUp', 'PageDown'], action: 'Steps by `largeStep`, within the bounds.' },
      { keys: ['Home', 'End'], action: 'Jumps to `min` or `max`.' },
    ],
    handles: [
      'Base UI’s NumberField formats and parses with `Intl.NumberFormat` for the `locale`, and clamps to `min` and `max`.',
      'The steppers are named “Increase” and “Decrease”, and the one at a bound is disabled.',
      'A `unit` is added to the input’s description, so the number is heard with it.',
      'The wheel changes the value only when `allowWheelScrub` is set, so scrolling a form never edits it.',
    ],
    you: [
      'Name it: put it in a `Field`, or pass `label` or `aria-label`.',
      'Translate `incrementLabel` and `decrementLabel`.',
    ],
  },
  'Components/Forms/Radio': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus into the group at the checked radio, and Tab again leaves the group.' },
      { keys: ['ArrowDown', 'ArrowRight'], action: 'Moves to and checks the next radio, wrapping at the end.' },
      { keys: ['ArrowUp', 'ArrowLeft'], action: 'Moves to and checks the previous radio.' },
      { keys: ['Space'], action: 'Checks the focused radio. Enter does not.' },
    ],
    handles: [
      'Base UI renders `role="radio"` inside `role="radiogroup"`, so the square is still announced as a radio button.',
      '`RadioGroup` is named by its visible `label` through `aria-labelledby`, and described by its `description`.',
      'Each radio is named by its `label` alone, and its `description` arrives through `aria-describedby`.',
    ],
    you: [
      'Give `RadioGroup` a `label` that asks the question the options answer.',
      'Give every radio a `label`.',
    ],
  },
  'Components/Forms/Segmented control': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus into the control, and Tab again leaves it.' },
      { keys: ['ArrowLeft', 'ArrowRight'], action: 'Moves focus between segments, wrapping at the ends.' },
      { keys: ['Home', 'End'], action: 'Moves focus to the first or last segment.' },
      { keys: ['Enter', 'Space'], action: 'Chooses the focused segment.' },
    ],
    handles: [
      'Base UI renders a group of `aria-pressed` buttons with roving focus.',
      'The chosen segment is an ink fill, and pressing it again does not empty the control.',
      'With `iconOnly`, each segment is named by its `label` and the icon is hidden from assistive technology.',
    ],
    you: [
      'Pass `aria-label` to name the group, such as “View”.',
      'Give `label` as a string when you use `iconOnly`, so the segment has a name.',
    ],
  },
  'Components/Forms/Select': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the trigger.' },
      { keys: ['Enter', 'Space', 'ArrowDown', 'ArrowUp'], action: 'Opens the list.' },
      { keys: ['ArrowDown', 'ArrowUp'], action: 'Moves the highlight through the options.' },
      { keys: ['Home', 'End'], action: 'Highlights the first or last option.' },
      { keys: ['Enter', 'Space'], action: 'Chooses the highlighted option and closes the list.' },
      { keys: ['Escape'], action: 'Closes the list without changing the value.' },
    ],
    handles: [
      'Base UI renders the trigger as a `combobox` and the list as a `listbox` of `option`s with `aria-selected`.',
      'Typing a letter moves to the matching option, and on a closed trigger chooses it.',
      'The current value is a check and a wash, the highlight an ink fill, so the two are never the same mark.',
      '`label` is wired to the trigger with a real `<label>`, and `Field` passes its description and invalid state.',
    ],
    you: [
      'Name it: put it in a `Field`, or pass `label` or `aria-label`.',
      'Give a `placeholder` that says what to choose when there is no value.',
    ],
  },
  'Components/Forms/Slider': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the thumb, or to each thumb of a range in turn.' },
      { keys: ['ArrowRight', 'ArrowUp'], action: 'Increases by `step`, with Shift by `largeStep`; ArrowLeft increases in right-to-left.' },
      { keys: ['ArrowLeft', 'ArrowDown'], action: 'Decreases by `step`, with Shift by `largeStep`.' },
      { keys: ['PageUp', 'PageDown'], action: 'Changes by `largeStep`.' },
      { keys: ['Home', 'End'], action: 'Jumps to `min` or `max`.' },
    ],
    handles: [
      'Base UI renders a real `<input type="range">` in each thumb, with `role="slider"` and the value in `aria-valuenow` and `aria-valuetext`.',
      'The `label` names every thumb.',
      'The value is printed beside the label, so it is never learned only by dragging.',
    ],
    you: [
      'Give it a `label`; without one the thumb has no name.',
      'The `minLabel` and `maxLabel` are hidden from assistive technology; if they carry meaning, say it in text near the slider.',
    ],
  },
  'Components/Forms/Switch': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the switch.' },
      { keys: ['Space', 'Enter'], action: 'Turns it on or off.' },
    ],
    handles: [
      'Base UI renders `role="switch"` with `aria-checked`.',
      'The `label` names the control and the whole label toggles it; the `description` arrives through `aria-describedby`.',
      'On is stated three ways: the square moves end to end, the track turns verde, and the keyline stays.',
    ],
    you: [
      'Give every switch a `label`, or an `aria-label` when it stands alone.',
      'Use a switch only for a setting that takes effect at once; a choice that waits for Save is a checkbox.',
    ],
  },
  'Components/Forms/Tag group': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the tag last focused, the first at the start, and Tab again leaves the group.' },
      { keys: ['ArrowRight', 'ArrowDown'], action: 'Moves focus to the next tag, stopping at the last; ArrowLeft in right-to-left.' },
      { keys: ['ArrowLeft', 'ArrowUp'], action: 'Moves focus to the previous tag, stopping at the first.' },
      { keys: ['Home', 'End'], action: 'Moves focus to the first or last tag.' },
      { keys: ['Delete', 'Backspace'], action: 'Removes the focused tag when the group is removable, and focuses the tag that took its place.' },
      { keys: ['Space', 'Enter'], action: 'Selects or deselects the focused tag when the group is selectable.' },
    ],
    handles: [
      'Renders a `grid` of `row`s, one per tag, each named by its label, so the whole set is one tab stop.',
      'A removable tag says so with `aria-keyshortcuts`, and its × is a real button named “Remove <label>”, kept out of the tab order because the row answers Delete.',
      'After a removal, focus moves to the next tag, the previous one at the end, or the group once it is empty, never to the page body.',
      'A selectable group sets `aria-selected` on every tag and `aria-multiselectable` when several can be chosen; a selected tag is an ink fill with a check.',
      'An empty group says so in words, in a cell, rather than leaving a blank gap.',
    ],
    you: [
      'Name it with `aria-label` or `aria-labelledby`: “Dataset labels”.',
      'Remove the item from your own list in `onRemove`; the group does not own it.',
      'Translate `removeLabel` and `empty`.',
    ],
  },
  'Components/Layout/App shell': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the skip link first, then the sidebar toggle, the top bar and the navigation.' },
      { keys: ['Enter'], action: 'Follows the skip link to the main region, or the focused navigation link.' },
      { keys: ['Enter', 'Space'], action: 'Collapses or expands the sidebar, or opens the navigation sheet on a narrow screen.' },
      { keys: ['Escape'], action: 'Closes the navigation sheet and returns focus to the button that opened it.' },
    ],
    handles: [
      'Gives the page a banner, a named navigation, a main region and a skip link to it.',
      'Reports the sidebar toggle\'s state with `aria-expanded` and `aria-controls`, and keeps item labels as screen-reader text when collapsed.',
      'Opens the sidebar on a narrow screen as a modal sheet titled Navigation, which traps focus and has a visible close button.',
      'Marks the active item with `aria-current="page"` and reads its count in words: Runs, 3 failed.',
    ],
    you: [
      'Give the sidebar a `label` that names the navigation.',
      'Give each page one `h1`, usually through `PageHeader`.',
      'Put a condition of the whole application in the `banner` slot, as a `Banner`, rather than above the shell.',
    ],
  },
  'Components/Layout/Container': {
    handles: [
      'Renders a plain `<div>` with no role, so it adds nothing to what a screen reader hears.',
      'Keeps a side gutter at every width, so content never touches the screen edge.',
    ],
    you: [
      'Add the landmark yourself, such as `<main>`, when the container holds one.',
    ],
  },
  'Components/Layout/Divider': {
    handles: [
      'Is `role="none"` by default, so a screen reader does not announce a separator between every pair of rows.',
      'Sets `aria-orientation` when you pass `role="separator"`.',
    ],
    you: [
      'Pass `role="separator"` only when the division itself means something.',
    ],
  },
  'Components/Layout/Grid': {
    handles: [
      'Renders a plain `<div>` and never reorders its children, so reading order is source order.',
      'Collapses to fewer columns on narrow screens, so a page does not scroll sideways.',
    ],
    you: [
      'Put children in the order they should be read.',
      'Pass `role="list"`, and `role="listitem"` on each cell, when the cells are a list of like things.',
    ],
  },
  'Components/Layout/Page header': {
    handles: [
      'Renders the title as the page\'s `h1`.',
      'Renders `meta` as a list, so a screen reader says how many facts there are.',
    ],
    you: [
      'Use one page header per page, so the page has one `h1`.',
      'Pass a breadcrumb that is its own named navigation.',
    ],
  },
  'Components/Layout/Panel': {
    handles: [
      'Renders a `<div>` by default, or a `section`, `article` or `aside` through `as`.',
      'On a filled tone, redefines the whole ink ramp, so secondary text inside still clears contrast.',
      'Draws its edge as an outline in forced colours mode, so the panel keeps its shape.',
    ],
    you: [
      'Name a `section` or `aside` with `aria-labelledby` pointing at its heading.',
    ],
  },
  'Components/Layout/Stack': {
    handles: [
      'Renders a plain `<div>` with no role, so reading order is source order.',
      'Lets `Inline` wrap by default, so a row of controls does not force the page wider than a phone.',
    ],
    you: [
      'Put children in the order they should be read.',
    ],
  },
  'Components/Layout/Toolbar': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus into the toolbar, onto one control.' },
      { keys: ['ArrowRight', 'ArrowLeft'], action: 'Moves between controls, wrapping at either end; mirrored in right-to-left.' },
      { keys: ['Enter', 'Space'], action: 'Activates the focused button, or presses the focused toggle.' },
      { keys: ['Shift+Tab'], action: 'Leaves the toolbar; it is one tab stop.' },
    ],
    handles: [
      'Renders `role="toolbar"` with roving focus from Base UI, so ten controls are one tab stop.',
      'Reports toggles as pressed with `aria-pressed`.',
      'In a text field, lets the arrow keys move the caret and leave only at its edges.',
      'Removes overflowed actions from the row and puts them in a More menu, so the arrows never stall on a hidden control.',
    ],
    you: [
      'Name the toolbar with `aria-label`, and each toggle group too.',
      'Give a `ToolbarInput` an `aria-label`; the placeholder is not a name.',
      'Give icon-only buttons an `aria-label`.',
    ],
  },
  'Components/Navigation/Accordion': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus from one trigger to the next, through any open panel’s content.' },
      { keys: ['Enter', 'Space'], action: 'Opens or closes the focused section.' },
    ],
    handles: [
      'Each trigger is a `<button>` inside an `<h3>`, with `aria-expanded` and `aria-controls`.',
      'Each open panel is a `region` named by its trigger.',
      'Closed panels are hidden until found, so find-in-page opens the section that holds the match.',
      'The plus and cross marker is hidden from assistive technology; the state is in `aria-expanded`.',
    ],
    you: [
      'Place it under an `<h2>`, so the `<h3>` triggers sit in the page outline.',
      'Use `Collapsible` for a single disclosure inside something else; it has no heading.',
    ],
  },
  'Components/Navigation/Breadcrumb': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus from one link to the next.' },
      { keys: ['Enter'], action: 'Follows the focused link.' },
    ],
    handles: [
      'It is a `<nav>` named “Breadcrumb” holding an ordered list.',
      'The last item is plain text with `aria-current="page"`, not a link to where you already are.',
      'The separators are empty CSS rules, not slash characters, so they are not read out.',
    ],
    you: [
      'Leave `href` off the last item.',
      'When you shorten a label with `middleTruncate`, make sure the full id is on the page it leads to.',
    ],
  },
  'Components/Navigation/Link': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the link.' },
      { keys: ['Enter'], action: 'Follows the link. Space does not, even on a LinkButton: it is a link, and Space scrolls the page.' },
    ],
    handles: [
      'Renders an `<a>` (or your router’s link, through `render`), so it is announced as a link, opens in a new tab on a middle click and shows its address.',
      'Underlines `inline` links at all times, so a link in a sentence is not told apart by colour alone.',
      'With `external` or `target="_blank"`, adds `rel="noopener noreferrer"`, the up-right arrow and a hidden “(opens in a new tab)” after the label, from `messages.link.newTab`.',
      'Hides the glyphs from assistive technology, so the label is the name.',
    ],
    you: [
      'Write link text that names the destination on its own, since screen readers list links out of context.',
      'Make sure the element you pass to `render` renders an `<a>` with an `href`, and forwards the props and ref it receives.',
      'Use a `Button` that says why, not a link, when the destination is not available yet; a link cannot be disabled.',
    ],
  },
  'Components/Navigation/Pagination': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus through Previous, the page buttons and Next.' },
      { keys: ['Enter', 'Space'], action: 'Goes to the focused page.' },
    ],
    handles: [
      'It is a `<nav>` named “Pagination”, with page buttons named “Page 5” and the current one marked `aria-current="page"`.',
      'Previous and Next are named buttons, disabled at the ends.',
      'The ellipses are hidden from assistive technology, and the compact range text is a polite live region.',
    ],
    you: [
      'Pass a distinct `aria-label` when a page has more than one pagination.',
      'After a page change, move focus to the results or say what loaded; the page buttons do not announce it.',
    ],
  },
  'Components/Navigation/Stepper': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves through the steps that can be returned to, then into the current step’s fields, Back and Continue.' },
      { keys: ['Enter', 'Space'], action: 'On a step in the list, opens that step and moves focus to its heading.' },
      { keys: ['Enter'], action: 'In a text field, or on Continue, submits the step; a step that passes moves on and focuses the next heading.' },
    ],
    handles: [
      'The steps are an ordered list in a `nav` named by `label`; the current one has `aria-current="step"`.',
      'Each step states its state in words (“Done”, “Current”, “To do”, “Needs fixing”) as well as by its marker’s shape and colour, and a step button is named by those words, “Basics Done”.',
      'When the step changes, focus moves to the new step’s heading, which follows a “Step 2 of 4” line; on first render focus is left where it is.',
      'The panel is a `Form`, so a step with errors keeps focus in the step and sends it to the `FormErrorSummary` there.',
      'Steps beyond the furthest one reached are plain text, not disabled buttons, so they are not tab stops.',
    ],
    you: [
      'Name the list with `label`, such as “Steps to create an agent”.',
      'Validate in `onStepSubmit` and return `false` to keep a step; put a `FormErrorSummary` in any step with more than one field.',
      'Translate every word it writes with `messages`.',
      'Keep it out of another `<form>`: the panel is already one.',
    ],
  },
  'Components/Navigation/Tabs': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the selected tab, and from there to its panel.' },
      { keys: ['ArrowLeft', 'ArrowRight'], action: 'Moves focus between tabs, wrapping at the ends; swapped in right-to-left.' },
      { keys: ['Home', 'End'], action: 'Moves focus to the first or last tab.' },
      { keys: ['Enter', 'Space'], action: 'Selects the focused tab.' },
    ],
    handles: [
      'Base UI renders `tablist`, `tab` with `aria-selected`, and a `tabpanel` named by its tab and reachable with Tab.',
      'Focus does not select a tab unless `activateOnFocus` is set, so passing over a tab never starts loading it.',
      'A tab’s `icon` is hidden from assistive technology, and its `count` is part of its name.',
    ],
    you: [
      'Give every tab a text label, even when it has an icon.',
      'Set `activateOnFocus` only when every panel is cheap to show.',
    ],
  },
  'Components/Navigation/Tree': {
    keyboard: [
      { keys: ['Tab'], action: 'Moves focus to the item last focused, else the selected one, else the first, and Tab again leaves the tree.' },
      { keys: ['ArrowDown', 'ArrowUp'], action: 'Moves focus to the next or previous visible item, without selecting it.' },
      { keys: ['ArrowRight'], action: 'Opens a closed branch; on an open branch, moves to its first child. ArrowLeft in right-to-left.' },
      { keys: ['ArrowLeft'], action: 'Closes an open branch; otherwise moves to the parent. ArrowRight in right-to-left.' },
      { keys: ['Home', 'End'], action: 'Moves focus to the first or last visible item.' },
      { keys: ['Enter', 'Space'], action: 'Selects the focused item, and opens or closes it if it is a branch.' },
      { keys: ['*'], action: 'Opens every branch at the level of the focused item.' },
    ],
    handles: [
      'Renders `role="tree"` and one `treeitem` per visible item with `aria-level`, `aria-setsize` and `aria-posinset`, and `aria-expanded` on branches.',
      'Items are a flat run rather than nested groups, so each is named by its own label, not by everything inside it.',
      'One tab stop with roving focus; a hidden item hands the stop to the nearest open branch above it.',
      'Typing a letter moves to the next visible item that starts with it.',
      'The selected item has `aria-selected` and is a shade with an ink bar, the mark of the current location, never the colour alone.',
      'A disabled item is focusable, `aria-disabled` and never selected.',
    ],
    you: [
      'Name it: `aria-labelledby` pointing at the heading above it, or `aria-label`.',
      'Open the branches down to the selected item, so it is visible on load.',
      'Load content on `onValueChange`, which only Enter, Space and a click send, and move focus to it yourself only when the person asks.',
    ],
  },
  'Components/Overlays/Shortcuts dialog': {
    keyboard: [
      { keys: ['?'], action: 'Opens the dialog, or closes it, from anywhere but a text field.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves between the dialog’s controls; focus stays inside.' },
      { keys: ['Escape'], action: 'Closes the dialog and returns focus to where it was.' },
    ],
    handles: [
      'Lists only the shortcuts bound under the `HotkeysProvider`, so the list cannot drift from the keys.',
      'Prints each key for the platform, ⌘ on a Mac and Ctrl elsewhere, and hides the keycaps behind the same keys in words: “Control K”, “G, then E”.',
      'Keeps every key sequence left to right in a right-to-left page, as macOS and Windows do: G then E is typed G first, so it never reads E then G.',
      '`useHotkeys` ignores plain keys typed in a text field, every key during IME composition, key repeat and keys a component has already handled.',
      'It is a modal Base UI Dialog, titled “Keyboard shortcuts”, with a Close button.',
    ],
    you: [
      'Mount `HotkeysProvider` once near the root, around `ToastProvider`.',
      'Give every `useHotkeys` call a `label` that starts with a verb.',
      'Use `mod` for cross-platform chords, and sequences rather than single letters for navigation.',
    ],
  },
  'Components/Overlays/Command palette': {
    keyboard: [
      { keys: ['Control+K', 'Meta+K'], action: 'Opens the palette when the page calls `useCommandShortcut`: ⌘K on a Mac, Ctrl-K elsewhere.' },
      { keys: ['ArrowDown', 'ArrowUp'], action: 'Moves the highlight, skipping disabled commands and wrapping at the ends.' },
      { keys: ['Enter'], action: 'Runs the highlighted command and closes the palette.' },
      { keys: ['Escape'], action: 'Closes the palette.' },
    ],
    handles: [
      'It is a modal Base UI Dialog, titled by `label`, with focus held in the search input.',
      'The input is a `combobox` controlling a `listbox`, and reports itself collapsed, with no empty listbox, when nothing matches; the highlight is conveyed with `aria-activedescendant`, so the caret never leaves the input.',
      'Commands sit in `group`s named by their headings, and disabled ones carry `aria-disabled`.',
      'Once typing pauses, a polite status says the result count, or “No matches for …” when nothing matches; nothing is announced for the empty query.',
      'Icons and the key hints in the footer are hidden from assistive technology; the status region speaks the count instead.',
    ],
    you: [
      'Call `useCommandShortcut` to bind ⌘K or Ctrl-K. Give a command a `hotkey` to bind it, print it and list it in the shortcuts dialog; `shortcut` is display only.',
      'Write command labels as actions, “Start a new run”, and add `keywords` for the other words people use.',
    ],
  },
  'Components/Overlays/Dialog': {
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the trigger, opens the dialog and moves focus into it.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves through the dialog’s controls; focus stays inside.' },
      { keys: ['Escape'], action: 'Closes the dialog and returns focus to the trigger, or to `finalFocus` when it is set.' },
      { keys: ['Enter'], action: 'In an alert dialog’s confirmation field, confirms once the text matches.' },
    ],
    handles: [
      'Base UI traps focus, locks scroll, makes the page inert and returns focus on close; the popup says `aria-modal="true"`.',
      'The dialog is named by `title` and described by `description`, and a named Close button is always rendered unless `hideClose` is set.',
      'A body long enough to scroll is a tab stop named by the title, in every browser, and only while it scrolls.',
      '`AlertDialog` is a `role="alertdialog"` that an outside click does not dismiss, and it focuses Cancel first.',
      'While an async confirm is pending, both buttons stop taking presses and the dialog cannot be closed.',
      'An AlertDialog `error` is a `role="alert"`, announced once when it appears and again after each failed retry, and it is the confirm button’s description.',
    ],
    you: [
      'Write a `title` that names the task; it is the dialog’s name.',
      'Set `hideClose` only when the footer has its own way out.',
      'Give the confirm button the verb, “Delete run”, never “OK”.',
      'Set `error` when a confirm fails, and clear it when the dialog opens for something else.',
      'Set `finalFocus` when the confirm removes the trigger, so focus lands on the next item rather than the top of the page.',
    ],
  },
  'Components/Overlays/Drawer': {
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the trigger, opens the drawer and moves focus into it.' },
      { keys: ['Tab', 'Shift+Tab'], action: 'Moves through the drawer’s controls; focus stays inside.' },
      { keys: ['Escape'], action: 'Closes the drawer and returns focus to the trigger.' },
    ],
    handles: [
      'It is a Base UI Dialog underneath: focus trap, scroll lock, the inert page and focus return.',
      'The drawer is named by `title` and described by `description`, with a named Close button unless `hideClose` is set.',
      'The swipe to dismiss is an extra; Escape and the Close button do the same without a gesture.',
      'The side is logical, so an end drawer opens from the left in right-to-left, and the swipe follows.',
    ],
    you: [
      'Write a `title` that names what the drawer holds.',
      'Set `hideClose` only when the footer has its own way out.',
    ],
  },
  'Components/Overlays/Menu': {
    keyboard: [
      { keys: ['Enter', 'Space', 'ArrowDown'], action: 'On the trigger, opens the menu and focuses an item.' },
      { keys: ['ArrowDown', 'ArrowUp'], action: 'Moves between items, wrapping at the ends.' },
      { keys: ['Home', 'End'], action: 'Moves to the first or last item.' },
      { keys: ['Enter', 'Space'], action: 'Runs the focused item, or toggles a checkbox or radio item.' },
      { keys: ['ArrowRight', 'ArrowLeft'], action: 'Opens or closes a submenu; swapped in right-to-left.' },
      { keys: ['Escape'], action: 'Closes the menu and returns focus to the trigger.' },
    ],
    handles: [
      'Base UI renders `menu`, `menuitem`, `menuitemcheckbox` and `menuitemradio`, with typeahead and focus return.',
      'The highlight is an ink fill, rojo on a destructive item, so the current row is a shape and not a tint.',
      'Icons, check marks and the submenu chevron are hidden from assistive technology.',
      'Checkbox and radio items keep the menu open, so several can be set in one visit.',
    ],
    you: [
      'Give the trigger an accessible name; an icon-only trigger needs an `IconButton` with a `label`.',
      'Bind the keys shown by `shortcut` yourself; they are display only.',
    ],
  },
  'Components/Overlays/Popover': {
    keyboard: [
      { keys: ['Enter', 'Space'], action: 'On the trigger, opens the popover and moves focus into it.' },
      { keys: ['Tab'], action: 'Moves through the popover’s controls, then on to the page after the trigger.' },
      { keys: ['Escape'], action: 'Closes the popover and returns focus to the trigger.' },
    ],
    handles: [
      'Base UI renders the popup as a non-modal `dialog`, with `aria-expanded` on the trigger.',
      'A `title` names the popover and a `description` describes it.',
      'An outside press closes it, and the page behind stays usable.',
    ],
    you: [
      'Pass a `title`, or label the popup yourself; without one it is announced only as “dialog”.',
      'Use a Dialog instead when the content must be answered before going on.',
    ],
  },
  'Components/Overlays/Tooltip': {
    keyboard: [
      { keys: ['Tab'], action: 'Focusing the trigger shows the tooltip, not only hovering it.' },
      { keys: ['Escape'], action: 'Hides the tooltip.' },
    ],
    handles: [
      'It opens on keyboard focus as well as on hover.',
      'The popup is `role="tooltip"`, and while it is open the trigger is `aria-describedby` it, joined with any description the trigger already has.',
      '`shortcut` keys are drawn as `<kbd>` elements and read as words: “Command Shift R”.',
      'Inside a `TooltipProvider`, moving along a `Toolbar` shows the next tooltip at once, after the first delay.',
    ],
    you: [
      'Give the trigger its own accessible name, such as an `IconButton` `label`; the tooltip is its description, not its name.',
      'Never put information only in a tooltip; it does not exist on touch.',
      'Pass a focusable element as the child.',
    ],
  },
  'Components/Typography/Display': {
    handles: [
      'Renders an `h1` by default, or an `h2` or `p` through `as`, without changing the look.',
    ],
    you: [
      'Use `as` so the element matches the outline: at most one `h1` per page.',
    ],
  },
  'Components/Typography/Heading': {
    handles: [
      'Renders the element its `level` names, `h1` to `h4`.',
      'Lets `size` change the look without changing the outline.',
    ],
    you: [
      'Pick `level` from the page outline and never skip one; change `size` for a smaller look.',
    ],
  },
  'Components/Typography/Kbd': {
    handles: [
      'Renders a `<kbd>`, and nests a chord\'s keys inside one outer `<kbd>`, as the HTML spec describes.',
      'Keeps keys left to right in a right-to-left page, isolated from the text around them: a shortcut is typed in a fixed order, so ⌘K never reads K⌘ and Ctrl K never reads K Ctrl.',
    ],
    you: [
      'Write key names a screen reader can say, or add the spoken name nearby: Command K for ⌘K.',
    ],
  },
  'Components/Typography/Lead': {
    handles: [
      'Renders a `<p>` held to the reading measure.',
    ],
    you: [
      'Use it once, under the page title; it is not a heading.',
    ],
  },
  'Components/Typography/Meta': {
    handles: [
      'Renders a `<p>` in tabular figures, so facts line up down a column.',
    ],
    you: [
      'Write the unit in words or a standard symbol, so the figure means something when read aloud.',
    ],
  },
  'Components/Typography/Prose': {
    handles: [
      'Styles the markup inside it without changing its elements, so headings, lists and quotes keep their meaning.',
      'Underlines links, so they are not marked by colour alone.',
      'Holds text to the reading measure unless `fluid` is set.',
    ],
    you: [
      'Supply markup with real headings in order, lists and link text that makes sense on its own.',
    ],
  },
  'Components/Typography/Pullquote': {
    handles: [
      'Renders a `figure` with the quote in a `blockquote` and the attribution in a `figcaption` outside it.',
      'Hides the relleno band from assistive tech.',
    ],
    you: [
      'Pass `cite` so the quote says who said it.',
    ],
  },
  'Components/Typography/Rotulo': {
    handles: [
      'Renders a `<p>`; the band before it is drawn in CSS and is not read.',
    ],
    you: [
      'Place it under the block it labels, not above a heading as an eyebrow.',
    ],
  },
  'Components/Typography/Text': {
    handles: [
      'Renders a `p`, `span` or `div` only, so body text cannot sit on a heading element.',
      'Inherits the ink of the ground it sits on by default, so it stays legible on a filled panel.',
    ],
    you: [
      'Use `Heading` for headings; `Text` never carries the outline.',
      'Say a danger or success state in words; the tone alone is colour.',
    ],
  },
}
