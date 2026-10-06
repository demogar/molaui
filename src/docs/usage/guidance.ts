/**
 * Usage guidance for every documented component: when to use it, when not to
 * and what to use instead, do and don't, and how to word it.
 *
 * It is data rather than prose in each stories file because three readers need
 * the same words: the Usage section on each component's docs page, the
 * "Choosing a component" page, and the agent manifest (`docs/ai/components.json`,
 * `llms-full.txt`). Written once here, none of them can drift from the others.
 *
 * Keyed by the stories' `title`, which is also how the docs page finds its
 * entry and how the manifest builds the story link. `usage.test.ts` fails if a
 * component's stories have no entry, or an entry names a title that no longer
 * exists.
 */
export interface Alternative {
  /** The situation in which this component is the wrong choice. */
  when: string
  /** The component to use instead, by its stories title (so it can be linked), or `null` when the answer is not a component. */
  use: string | null
  /** Shown in place of the title's last segment, when the answer is one part of it ("Textarea", "AlertDialog"). */
  label?: string
}

export interface Usage {
  /** One sentence: what it is for. */
  summary: string
  /** When to reach for it. */
  use: string[]
  /** When not to, and what to use instead. */
  avoid: Alternative[]
  /** Do / don't pairs, only where the difference is worth showing. */
  practices?: { do: string; dont: string }[]
  /** Label wording, case, length, tone. */
  content?: string[]
}

export const USAGE: Record<string, Usage> = {
  'AI/Agent run': {
    summary: 'A long-running agent run as a timeline: its status and live clock, each step on one spine, and the reason it stopped.',
    use: [
      'Showing a run an operator watches or comes back to, step by step, while it works and after it ends.',
      'Answering “is it still working, what is it doing, how long has it taken, does it need me” on one panel.',
      'Putting the way back next to a failure: pass failure and a Run error sits between the header and the steps.',
      'Offering Cancel run while the run is open, and Retry run once it has failed or been stopped.',
    ],
    avoid: [
      { when: 'Events that have already been written down, such as a deploy history or an audit log.', use: 'Components/Data display/Timeline' },
      { when: 'A fixed sequence of instructions a person follows, such as a runbook.', use: 'Components/Data display/Timeline', label: 'StepList' },
      { when: 'One tool invocation, shown on its own or inside a message.', use: 'AI/Tool call' },
      { when: 'Work with a known total, such as embedding 1,204 documents.', use: 'Components/Feedback/Progress' },
    ],
    practices: [
      {
        do: 'Show elapsed time that keeps counting on the active step, with the working relleno under it.',
        dont: 'Add a percentage or a spinner to a run; it has no knowable total, and the system has no spinner by design.',
      },
      {
        do: 'Title each step in words, “Break the result down by plan”, and put the tool’s literal name in its detail.',
        dont: 'Title a step with a raw tool name or “Step 4”; the spine already numbers the steps.',
      },
    ],
    content: [
      'Name the agent as people know it, in sentence case: “Cayuco research agent”.',
      'Step titles start with a verb and name the object: “Query the run history”, not “Querying…”.',
      'Write the summary as a result: “Answered with 3 sources. One guardrail flagged for review.”',
    ],
  },
  'AI/Change review': {
    summary: 'A change an agent proposes, shown as the reviewer reads it, with Approve, Request changes and Reject under it.',
    use: [
      'An agent proposes edits to files or records that a person must approve before they are applied.',
      'The reviewer needs the diff, the agent’s reasons in its own words and the decision in one place.',
      'Showing a record change field by field, before and after, with FieldChanges rather than a JSON diff.',
    ],
    avoid: [
      { when: 'One tool call that needs a yes or no before it runs; the approval belongs on the call.', use: 'AI/Tool call' },
      { when: 'Confirming a destructive action the person started themselves.', use: 'Components/Overlays/Dialog', label: 'AlertDialog' },
      { when: 'Code or a payload that is not a change.', use: 'Components/Data display/Code', label: 'CodeBlock' },
    ],
    practices: [
      {
        do: 'Keep Approve, Request changes and Reject the same size and variant, as the component draws them.',
        dont: 'Restyle Approve as the ink primary or Reject as a quiet link; a nudged approval is a defect.',
      },
      {
        do: 'Pass the agent’s explanation as summary, so the reviewer can judge its reasoning.',
        dont: 'Show the diff alone and leave the reviewer to guess why the agent made the change.',
      },
    ],
    content: [
      'Title the change by what it does, “Roll the help panel out to Starter”, not by the files it touches.',
      'Name a record by its type and key, so each field change has an owner: “Feature flag help_panel_v2”.',
      'A reason for a no says what is wrong and what would make it acceptable, because the agent acts on it.',
    ],
  },
  'AI/Confidence': {
    summary: 'How sure the system is, in three levels and in words, with UncertaintyNote for a specific claim to check.',
    use: [
      'Stating how well an answer is supported, High, Medium or Low, with the basis it rests on.',
      'Flagging one claim the reader should verify, next to that claim, with UncertaintyNote.',
      'Offering the action that verifies a doubtful claim, such as opening the dashboard it came from.',
    ],
    avoid: [
      { when: 'Showing confidence as a percentage or score. No model is calibrated enough for “87.3%”; state a level and its basis.', use: null },
      { when: 'Saying that something failed or needs attention; uncertainty is information, not an alarm.', use: 'Components/Feedback/Callout' },
      { when: 'A reading inside a known range, such as a token budget.', use: 'Components/Feedback/Progress', label: 'Meter' },
    ],
    practices: [
      {
        do: 'Give a basis an operator can check: “3 sources agree”, “single source, 9 months old”.',
        dont: 'Show a bare level, or a decimal that will be read as a measurement.',
      },
      {
        do: 'Say in the note exactly what to verify and why it is in doubt.',
        dont: 'Put a generic disclaimer under every answer; people stop reading it by the second day.',
      },
    ],
    content: [
      'Write the basis as a short fact in lower case, since it follows the level: “sources disagree on the segment size”.',
      'Title an UncertaintyNote with the claim, “Unverified figure”, not with “Warning” or “Note”.',
    ],
  },
  'AI/Message': {
    summary: 'One turn of a conversation, laid out as a ledger: who spoke, when, with which model, and what they said or did.',
    use: [
      'Transcripts between an operator, an assistant, the system and its tools, where each turn is a record.',
      'Assistant answers with copy, regenerate and rating actions, and a stated failure with Retry.',
      'A long conversation in Thread, which follows new turns only while the reader is at the bottom.',
    ],
    avoid: [
      { when: 'The model’s thinking before it answers; it is evidence, not part of the answer.', use: 'AI/Reasoning' },
      { when: 'A run that stopped at a step and can resume from it; a message error covers one turn only.', use: 'AI/Run error' },
      { when: 'Rendering the answer’s text; a message is the frame and the answer goes inside it.', use: 'AI/Streaming text' },
      { when: 'A standing notice outside a conversation, such as a read-only workspace.', use: 'Components/Feedback/Callout' },
    ],
    practices: [
      {
        do: 'Pass the system’s error verbatim in error, so an operator can paste it into a ticket.',
        dont: 'Replace it with “Something went wrong”; the component already adds the plain sentence above it.',
      },
      {
        do: 'Let every turn take the full measure, one after another.',
        dont: 'Wrap turns in chat bubbles; long answers, tables and code need the whole column.',
      },
    ],
    content: [
      'Set author to the name people know, “Cayuco” or “M. Herrera”; the role is only the fallback.',
      'Pass the model as its identifier, “cayuco-deep-3”; it is shown as a literal.',
      'System turns state what changed in a sentence or two: “Context reset. Earlier turns are summarised.”',
    ],
  },
  'AI/Prompt input': {
    summary: 'The composer: a field that grows, attachments, a toolbar, and a send button that becomes Stop while a response generates.',
    use: [
      'Taking the next prompt in a conversation or an agent console.',
      'Letting the operator stop a response from the place the send button was.',
      'Keeping a draft while offline, with the reason it cannot be sent stated beside it.',
      'Long briefs where Enter should add a line, with submitOn set to mod-enter.',
    ],
    avoid: [
      { when: 'A multi-line field in a form that is submitted with other fields.', use: 'Components/Forms/Field', label: 'Textarea' },
      { when: 'Searching or filtering a list.', use: 'Components/Forms/Field', label: 'SearchInput' },
      { when: 'Jumping to a page or running a command by name.', use: 'Components/Overlays/Command palette' },
    ],
    practices: [
      {
        do: 'Set status to offline and keep the field editable, so the draft survives a dropped connection.',
        dont: 'Disable the field while offline or while a response generates; the operator loses the draft or the next prompt.',
      },
    ],
    content: [
      'The label names who is being addressed: “Message Cayuco”.',
      'Write the placeholder as a hint of scope, “Ask about a run, an evaluation, a document…”, never as the only label.',
      'Name attachments by file name, with type and size as the detail: “CSV · 4.1 MB”.',
    ],
  },
  'AI/Reasoning': {
    summary: 'The model’s thinking behind a disclosure, summarised as “Thought for 12.4s” and set a step quieter than the answer.',
    use: [
      'Keeping reasoning available as evidence, for the moment the answer looks wrong.',
      'Showing that the model is still thinking, with the working texture and a live clock.',
    ],
    avoid: [
      { when: 'The answer itself.', use: 'AI/Message' },
      { when: 'The steps an agent took, such as tool calls and handoffs.', use: 'AI/Agent run' },
      { when: 'Doubt about one claim, which belongs next to the claim.', use: 'AI/Confidence', label: 'UncertaintyNote' },
    ],
    practices: [
      {
        do: 'Leave reasoning closed, so the answer is what is read first.',
        dont: 'Open reasoning by default above every answer; when the answer is right, it is noise.',
      },
    ],
    content: [
      'Pass startedAt and endedAt, or durationMs, so the summary states a time rather than the bare word “Reasoning”.',
    ],
  },
  'AI/Run error': {
    summary: 'Why a run stopped: the step, a plain sentence, the error verbatim, and the ways back in order of cost.',
    use: [
      'A run failed, was rate limited, timed out or was cancelled, and the operator has to decide what to do next.',
      'Offering Retry from step N, Retry run and Copy error details next to the reason.',
      'Keeping output that arrived before the stop, marked as partial, with PartialOutput.',
    ],
    avoid: [
      { when: 'A failed run shown with its steps; pass failure to the run and it places this panel itself.', use: 'AI/Agent run' },
      { when: 'One tool call that failed; the call shows its own error and Retry call.', use: 'AI/Tool call' },
      { when: 'A condition of a page or region that is not a run failure, such as a stale index.', use: 'Components/Feedback/Callout' },
      { when: 'A panel that could not load its data.', use: 'Components/Feedback/Empty state' },
    ],
    practices: [
      {
        do: 'Choose the kind that matches the next move: failed, rate_limited, timed_out or cancelled.',
        dont: 'Report a rate limit or a person’s cancellation as a plain failure; what the operator does next differs.',
      },
      {
        do: 'Pass the step’s number and title, so the headline matches the timeline.',
        dont: 'Show “Something went wrong” with no step, no sentence and no literal.',
      },
    ],
    content: [
      'A custom message says what happened and what was kept: “The query was denied, so the run stopped. Steps 1–3 are kept.”',
      'Pass the error exactly as the tool returned it; do not reword, shorten or translate it.',
      'A cancellation is stated without alarm, in the past tense: “You stopped the run.”',
    ],
  },
  'AI/Run status': {
    summary: 'The one status vocabulary for a run, a step and a tool call: a glyph, a word and a colour, with an elapsed clock.',
    use: [
      'The state of any unit of model work: queued, running, streaming, needs approval, succeeded, failed, cancelled or timed out.',
      'Elapsed time that keeps counting for open work, or a fixed duration for finished work.',
      'Status in a header, in the label register, or in a row or sentence with register set to inline.',
    ],
    avoid: [
      { when: 'A status that is not model work, such as a document tag or a deploy state.', use: 'Components/Feedback/Badge' },
      { when: 'Work with a known total that can honestly show how much is done.', use: 'Components/Feedback/Progress' },
      { when: 'A whole run with its steps.', use: 'AI/Agent run' },
    ],
    practices: [
      {
        do: 'Use label to make a state more specific, such as “Thinking” for a reasoning step; the glyph stays.',
        dont: 'Invent a ninth status such as “Rate limited”; it is a reason on a failed run, said in words.',
      },
    ],
    content: [
      'Keep the status words as they are: “Succeeded”, “Failed”, “Needs approval”, “Timed out”.',
      'Use the same words everywhere on the page; a run is not “Errored” in a table and “Failed” in its header.',
    ],
  },
  'AI/Sources': {
    summary: 'Inline citation markers and the numbered list of sources they point to, with a preview card on hover, focus or first tap.',
    use: [
      'An answer makes claims drawn from documents, and readers need to check them where they are made.',
      'Listing what each source is, where it lives, the passage used and when it was read.',
      'Rendering [n] markers in streamed text, with citationRenderer built from the same array as the list.',
    ],
    avoid: [
      { when: 'Ordinary links in running text that are not evidence for a claim.', use: 'Components/Typography/Prose' },
      { when: 'Saying how strongly the sources support the answer.', use: 'AI/Confidence' },
      { when: 'A tool’s raw result, such as the rows a query returned.', use: 'AI/Tool call' },
    ],
    practices: [
      {
        do: 'Build the renderer once from the sources array, so marker 2 always opens source 2.',
        dont: 'Number markers and list items separately; one mismatch sends the reader to the wrong document.',
      },
      {
        do: 'Include the passage the answer used and when it was read.',
        dont: 'List only a title and a link; checking one sentence then means opening every document.',
      },
    ],
    content: [
      'Use the document’s own title as the source title, not its URL or file name.',
      'Quote the passage exactly as retrieved; do not paraphrase it.',
      'Give the domain as people know it: “docs.cayuco.internal”.',
    ],
  },
  'AI/Streaming text': {
    summary: 'A model’s answer arriving a token at a time, in the reading voice, without layout shift, and announced once when it ends.',
    use: [
      'Rendering an assistant’s answer as it streams, with a block caret at the end.',
      'Paragraphs, lists, code blocks, inline code and [n] citation markers from a model.',
      'Text the reader may skim, such as reasoning, with tone set to muted.',
    ],
    avoid: [
      { when: 'Long-form markup that does not stream, such as rendered documentation.', use: 'Components/Typography/Prose' },
      { when: 'Text the system says in its own voice, such as labels and hints.', use: 'Components/Typography/Text' },
      { when: 'Saying that work is under way before any text exists, outside a message.', use: 'AI/Run status' },
    ],
    practices: [
      {
        do: 'Append to text as tokens arrive and pass status, so completion is announced once.',
        dont: 'Wrap the text in a live region; a screen reader would read every token aloud.',
      },
      {
        do: 'Pass a stable renderCitation, built once at module scope or with useMemo.',
        dont: 'Create the renderer inline on every render; finished blocks then render again on every token.',
      },
    ],
    content: ['Override doneAnnouncement only with a short, complete sentence: “Summary complete.”'],
  },
  'AI/Token usage': {
    summary: 'What a run consumed: input, cached and output tokens, cost, and how full the context window is.',
    use: [
      'A run summary that reports tokens and cost, or a run header, with the inline variant.',
      'Warning before the context window fills: the meter turns gold at 80% and rojo at 95%, and says so.',
    ],
    avoid: [
      { when: 'A workspace budget or a monthly quota.', use: 'Components/Feedback/Progress', label: 'Meter' },
      { when: 'A headline figure on a dashboard, such as tokens this month.', use: 'Components/Data display/Stat' },
    ],
    practices: [
      {
        do: 'Pass contextWindow whenever it is known, so the meter shows how close the run is to the limit.',
        dont: 'Report spend alone; a full context fails quietly and looks like the model forgetting.',
      },
    ],
    content: [
      'Pass raw numbers; counts are shown compact, “12.4k”, and cost in US dollars to four decimals, “$0.0731”.',
    ],
  },
  'AI/Tool call': {
    summary: 'One tool invocation: the tool’s literal name, its arguments, the result or error, and an approval when a person must decide.',
    use: [
      'Showing what the model asked a system to do, with what, and what came back.',
      'Holding a call that writes, spends or sends until a person approves or denies it.',
      'Calls the model made at the same time, grouped with ToolCallGroup.',
    ],
    avoid: [
      { when: 'A larger change to files or records that needs a diff and a reason.', use: 'AI/Change review' },
      { when: 'The whole run the calls belong to.', use: 'AI/Agent run' },
      { when: 'A payload shown on its own, outside a call.', use: 'Components/Data display/Code', label: 'CodeBlock' },
    ],
    practices: [
      {
        do: 'Say in the approval reason what the call changes and whether the agent can undo it.',
        dont: 'Ask for approval with no reason, or make Approve the primary button and Deny a link.',
      },
      {
        do: 'Pass args and result as objects, so they render as formatted JSON.',
        dont: 'Rewrite payloads as prose; operators inspect them and paste them into tickets.',
      },
    ],
    content: [
      'The title says what the call is for, “Rollout results”; the name stays exactly as the model called it.',
      'Name approval buttons by the action: “Approve rollout” and “Deny”, not “Yes” and “No”.',
      'Keep the approval reason to a sentence or two: what changes, for whom, and whether it can be undone.',
    ],
  },
  'Components/Actions/Button': {
    summary: 'A cut-shape button for an action on this page, with IconButton for an action shown as an icon alone.',
    use: [
      'Starting an action: run, save, delete, cancel.',
      'Primary for the main action of a panel, secondary for the rest, danger only for destruction, ghost for the least emphasis.',
      'Work in flight after a press, with loading, which keeps the label and adds the working strip instead of a spinner.',
      'Icon-only actions in dense rows and toolbars, with IconButton and its required label.',
    ],
    avoid: [
      { when: 'Going to another page or URL. Use a link: an a element, or your router’s link styled with buttonVariants.', use: null },
      { when: 'A row of related actions above a table or canvas, with one tab stop.', use: 'Components/Layout/Toolbar' },
      { when: 'More actions on one object than deserve a button each.', use: 'Components/Overlays/Menu' },
      { when: 'Choosing between views, where the pressed state stays.', use: 'Components/Forms/Segmented control' },
    ],
    practices: [
      {
        do: 'Keep one primary button per panel, and keep danger for actions that destroy something.',
        dont: 'Use danger red for emphasis, or set several primary buttons side by side.',
      },
      {
        do: 'Let a disabled button keep its stated look, and say nearby why it is unavailable.',
        dont: 'Fade a button with opacity, or disable it with no explanation.',
      },
    ],
    content: [
      'Start with a verb and name the object: “Delete run”, “Start run”, not “OK”, “Yes” or “Submit”.',
      'Write labels in sentence case with no trailing period; the button sets them in capitals itself.',
      'Give IconButton a label that names the action and the object, “Copy run id”; it is also the tooltip.',
    ],
  },
  'Components/Data display/Avatar': {
    summary: 'A person or an agent as a square tile, with initials or a glyph on a colour picked from the name.',
    use: [
      'Showing who did something in a log, a page header or a list of reviewers.',
      'Marking an agent with a glyph through icon, so a person and a bot are never confused.',
      'Several people in one place, with AvatarGroup, which folds the rest into a “+n” tile past max.',
    ],
    avoid: [
      { when: 'Stating a status or a role.', use: 'Components/Feedback/Badge' },
      { when: 'An image or chart slot that has nothing in it yet.', use: 'Components/Feedback/Placeholder' },
    ],
    practices: [
      {
        do: 'Pass the full name; it becomes the accessible name and seeds the colour.',
        dont: 'Pass initials or a handle as the name; a screen reader then announces “AP”.',
      },
    ],
    content: [
      'Name people by full name and agents as people know them: “Support triage”.',
      'Name an AvatarGroup by role: “Reviewers”, “On call”.',
    ],
  },
  'Components/Data display/Code': {
    summary: 'Machine text: Code for an inline literal, CodeBlock for a labelled block with copy and wrap.',
    use: [
      'An id, a field name or a flag inside a sentence, with Code.',
      'A tool’s arguments, a query or a log tail, with CodeBlock; JSON is tokenised by value kind.',
      'A payload cut off mid-stream; CodeBlock shows exactly what arrived.',
    ],
    avoid: [
      { when: 'Figures compared down a column, such as cost and duration; they are Archivo with tabular figures.', use: 'Components/Typography/Meta' },
      { when: 'A keyboard shortcut.', use: 'Components/Typography/Kbd' },
      { when: 'A proposed change to a file, shown as additions and removals.', use: 'AI/Change review' },
      { when: 'Labels, headings or emphasis; the monospace is only for text a machine reads.', use: 'Components/Typography/Text' },
    ],
    practices: [
      {
        do: 'Use Code for a literal inside a sentence.',
        dont: 'Break a sentence with a CodeBlock to show one id.',
      },
      {
        do: 'Turn copyable off for payloads that must not leave the page.',
        dont: 'Put a CodeBlock on a black terminal panel; it sits on the same cloth as everything else.',
      },
    ],
    content: [
      'Show literals exactly as the system stores them; do not change their case or add spaces.',
      'Label a CodeBlock by its role or file name, as the reader would search for it: “arguments”, “query.sql”.',
    ],
  },
  'Components/Data display/Description list': {
    summary: 'Term and value pairs: the properties of a run, a document or an evaluation.',
    use: [
      'A side panel of properties scanned top to bottom, with the inline layout.',
      'Values long enough to wrap, such as a system prompt or a path, with the stacked layout.',
      'A summary that closes a section, with the grid layout.',
      'Ids, hashes and model names marked literal, so they are never read as prose.',
    ],
    avoid: [
      { when: 'Many records with the same fields, compared row against row.', use: 'Components/Data display/Table' },
      { when: 'A few headline figures with their change over time.', use: 'Components/Data display/Stat' },
      { when: 'The fields of a record before and after a proposed change.', use: 'AI/Change review', label: 'FieldChanges' },
    ],
    practices: [
      {
        do: 'Mark ids and model strings literal, and leave prose and figures in the system voice.',
        dont: 'Set every value in the monospace.',
      },
    ],
    content: [
      'Terms are short nouns in sentence case, without colons: “Model”, “Duration”.',
      'Give values their units, “41s”, “$0.2185”, and show a status as a Badge rather than a bare word.',
    ],
  },
  'Components/Data display/Stat': {
    summary: 'A KPI tile: a label, a figure, a change with its direction and sentiment, and an optional sparkline.',
    use: [
      'Headline figures at the top of a page, grouped in a StatGroup cut from one panel.',
      'A change whose direction and meaning differ, such as latency going down being good news.',
      'The shape of the recent past as a sparkline beside the figure.',
    ],
    avoid: [
      { when: 'A reading against a limit or threshold, such as a quota.', use: 'Components/Feedback/Progress', label: 'Meter' },
      { when: 'Many properties of one object.', use: 'Components/Data display/Description list' },
      { when: 'A trend that needs axes, values or several series. A sparkline is a glyph; use a chart.', use: null },
    ],
    practices: [
      {
        do: 'State direction and sentiment separately, so cost going down reads as good.',
        dont: 'Assume up is green; latency going up is a regression.',
      },
    ],
    content: [
      'The label names the measure and its window: “Runs today”, “p95 duration”.',
      'Put the unit in unit, “%”, and the comparison in the delta’s period, “vs yesterday”.',
      'Group digits and keep only the precision a reader uses: “1,204”, “97.8”.',
    ],
  },
  'Components/Data display/Table': {
    summary: 'Table primitives for rows of records, and DataTable for columns as data with sorting, selection, column visibility and pages.',
    use: [
      'Comparing many records with the same fields, such as runs, documents or evaluations.',
      'Sorting, selection, bulk actions and pages on client or server data, with DataTable.',
      'A layout DataTable does not cover, such as virtualised rows, with the primitives.',
    ],
    avoid: [
      { when: 'The properties of one record.', use: 'Components/Data display/Description list' },
      { when: 'Events where the order is the content.', use: 'Components/Data display/Timeline' },
      { when: 'A handful of headline figures.', use: 'Components/Data display/Stat' },
    ],
    practices: [
      {
        do: 'Right-align numeric columns, header included, in tabular figures.',
        dont: 'Left-align costs and durations, or set them in the monospace.',
      },
      {
        do: 'Show the no-results empty row with Clear filters when filters hide every row.',
        dont: 'Tell someone to create their first run when a filter is hiding the runs they have.',
      },
    ],
    content: [
      'Headers are short nouns in sentence case: “Run”, “Started”, “Cost”.',
      'Show a value that does not exist yet as an em dash, “—”, not as zero.',
      'Set noun so counts read naturally: “3 runs selected”.',
    ],
  },
  'Components/Data display/Timeline': {
    summary: 'Timeline for events already written down, on a spine; StepList for ordered steps a person follows.',
    use: [
      'An audit log, a deploy history or the stages of an evaluation, with Timeline.',
      'A runbook or a checklist, with StepList and its ruled bands.',
      'The event happening now, with the active tone and its working relleno.',
    ],
    avoid: [
      { when: 'A live agent run whose steps change as it works.', use: 'AI/Agent run' },
      { when: 'Records compared by their fields rather than read in order.', use: 'Components/Data display/Table' },
      { when: 'Sections of one document that open and close.', use: 'Components/Navigation/Accordion' },
    ],
    practices: [
      {
        do: 'Put when or where in meta, and what happened in the title.',
        dont: 'Leave the node colour to say what happened; the words have to carry it.',
      },
    ],
    content: [
      'Timeline titles state the event in the past tense: “Review approved”, “Rollout paused”.',
      'StepList titles are instructions: “Freeze the agent version”.',
      'Use one time format down the list: “Oct 1 · 09:12”.',
    ],
  },
  'Components/Feedback/Badge': {
    summary: 'A small status mark in one of the system’s tones; StatusDot for a square dot beside a label; RecommendationBadge for an editorial scale.',
    use: [
      'The state of a row or an object: queued, live, failed, pinned.',
      'Soft by default; solid for the one state on a row that must be seen first; outline for categories.',
      'A state that is live right now, with pulse, which stills under reduced motion.',
    ],
    avoid: [
      { when: 'The state of a run, a step or a tool call; model work has its own vocabulary.', use: 'AI/Run status' },
      { when: 'A message with a sentence and an action.', use: 'Components/Feedback/Callout' },
      { when: 'A filter a person turns on and off.', use: 'Components/Forms/Chip' },
      { when: 'A count on a tab; tabs and navigation items take count themselves.', use: 'Components/Navigation/Tabs' },
    ],
    practices: [
      {
        do: 'Give every badge a word, and every StatusDot a label beside it or its own label.',
        dont: 'Let a coloured dot alone carry a state.',
      },
      {
        do: 'Use soft badges down a column.',
        dont: 'Fill a column with solid badges; fifty solid statuses read as a quilt.',
      },
      {
        do: 'Map a stopped or cancelled state to neutral; a person chose it.',
        dont: 'Show a cancellation in gold; warn is for work that is degraded or waiting on someone.',
      },
    ],
    content: [
      'One or two words in sentence case, with no punctuation: “Succeeded”, “Needs review”.',
      'Use the same status words as the filters and headers around it.',
    ],
  },
  'Components/Feedback/Callout': {
    summary: 'A message that belongs to a region of the page, with a tone, an optional title and actions.',
    use: [
      'A standing condition of a page or panel: a model that retires soon, a read-only workspace, a stale index.',
      'Something to read before working in the region, with one or two actions.',
      'A notice the person can dismiss, with onDismiss, where the caller decides whether it returns.',
    ],
    avoid: [
      { when: 'Something that has just happened, possibly elsewhere, such as a finished re-index.', use: 'Components/Feedback/Toast' },
      { when: 'A decision the person must make before going on.', use: 'Components/Overlays/Dialog', label: 'AlertDialog' },
      { when: 'A panel with nothing to show.', use: 'Components/Feedback/Empty state' },
      { when: 'A short status on a row.', use: 'Components/Feedback/Badge' },
    ],
    practices: [
      {
        do: 'Match the tone to the consequence: warn for a limit approaching, danger for something broken.',
        dont: 'Use danger for news or tips; red has to keep meaning broken.',
      },
      {
        do: 'Put a callout that appears after an action inside a live region, or use a toast.',
        dont: 'Insert a static callout after an action and expect a screen reader to notice it.',
      },
    ],
    content: [
      'The title states the condition: “Token budget at 86%”, not “Warning” or “Heads up”.',
      'The body says what it means and what to do: “Switch the model in settings to keep evaluation history comparable.”',
      'Actions are verbs on the object: “Retry from 812”, “View log”.',
    ],
  },
  'Components/Feedback/Empty state': {
    summary: 'What a panel shows when it has nothing to show, in four variants: empty, no results, error and no permission.',
    use: [
      'Nothing exists yet, and the action creates the first one.',
      'Filters hide everything, and the action clears them.',
      'The panel could not load, and the action retries.',
      'The content exists but is not the reader’s to see, and the text says who can grant it.',
    ],
    avoid: [
      { when: 'Content that is on its way.', use: 'Components/Feedback/Skeleton' },
      { when: 'One slot, such as a chart or an image, waiting for its content.', use: 'Components/Feedback/Placeholder' },
      { when: 'A warning about a page that does have content.', use: 'Components/Feedback/Callout' },
      { when: 'A table with no rows; the table’s own empty row keeps the headers.', use: 'Components/Data display/Table' },
    ],
    practices: [
      {
        do: 'Pick the variant for the conversation: no-results says filters are hiding things, and clears them.',
        dont: 'Tell someone filtering their runs to “create your first run”.',
      },
      {
        do: 'Say who can grant access in no-permission.',
        dont: 'Show “Access denied” with no next step.',
      },
    ],
    content: [
      'The title states the condition: “No runs match these filters”, “Traces did not load”.',
      'The description gives the cause or the count: “3 filters are hiding 1,284 runs.”',
      'An error says what happened and what happens next: “The trace store returned 503. This panel will try again in 30s.”',
    ],
  },
  'Components/Feedback/Placeholder': {
    summary: 'A slot for something that does not exist yet, such as a chart with no data, announced as one image.',
    use: [
      'A chart, preview or image that cannot render yet, held at its final size.',
      'A layout where the slot must keep its place, with a label for the kind of thing and a name for what it would show.',
    ],
    avoid: [
      { when: 'Content that is loading and will arrive shortly.', use: 'Components/Feedback/Skeleton' },
      { when: 'A whole panel with nothing in it, which needs an action.', use: 'Components/Feedback/Empty state' },
      { when: 'A person or agent without a photo; initials stand in.', use: 'Components/Data display/Avatar' },
    ],
    content: [
      'label is the kind, “Chart” or “Preview”; name is the thing, “Tickets by plan”.',
      'alt says what is missing, “No data yet: run latency by agent”, because it is announced in place of the content.',
    ],
  },
  'Components/Feedback/Progress': {
    summary: 'Progress for work moving toward done, which may be indeterminate; Meter for a reading inside a known range, with thresholds.',
    use: [
      'An upload, an ingest or an evaluation over a known number of items, with Progress.',
      'Work that has started but has no known size yet, with a null value: the working relleno, not a spinner.',
      'A budget, a quota or a context window, with Meter and its warn and danger thresholds.',
    ],
    avoid: [
      { when: 'A model call or an agent run with no knowable total; show elapsed time, not a percentage.', use: 'AI/Run status' },
      { when: 'Content loading into a known layout.', use: 'Components/Feedback/Skeleton' },
      { when: 'A headline figure with no range.', use: 'Components/Data display/Stat' },
      { when: 'Choosing a value on a scale.', use: 'Components/Forms/Slider' },
    ],
    practices: [
      {
        do: 'Use Meter for a reading that can go down as well as up, such as tokens used this month.',
        dont: 'Use Progress for a quota; a quota is not work moving toward done.',
      },
      {
        do: 'Use valueText to give the count: “212 / 300”.',
        dont: 'Invent a percentage to make a wait feel shorter.',
      },
    ],
    content: [
      'Progress labels name the work as it happens: “Embedding documents”, “Evaluating prompts”.',
      'A bar that stays on screen after the work ends says how it ended: “Failed at 67%”.',
      'Meter labels name the measure and its period: “Tokens this month”.',
    ],
  },
  'Components/Feedback/Skeleton': {
    summary: 'Bones in the shape of content that has not arrived, with SkeletonGroup to mark the region busy and say once what is loading.',
    use: [
      'A card, list or table whose layout is known while its data loads.',
      'Swapping bones for content in place, so the layout barely moves when the data lands.',
      'Lines of text that follow the surrounding type size, with SkeletonText.',
    ],
    avoid: [
      { when: 'Work with a known size, such as an upload.', use: 'Components/Feedback/Progress' },
      { when: 'A slot whose content does not exist yet, rather than one that is loading.', use: 'Components/Feedback/Placeholder' },
      { when: 'A button waiting on its own action; give it its loading state.', use: 'Components/Actions/Button' },
      { when: 'Text a model is still writing.', use: 'AI/Streaming text' },
    ],
    practices: [
      {
        do: 'Wrap the bones in SkeletonGroup with a label, so the region is announced once.',
        dont: 'Add a spinner or a “Loading…” line to each bone; the system has no spinner, by design.',
      },
      {
        do: 'Cut the bones to the content’s shape: an avatar bone, a short line for a name.',
        dont: 'Cover the area with one generic block.',
      },
    ],
    content: ['The group label names what is loading: “Loading agent”, “Loading runs”.'],
  },
  'Components/Feedback/Toast': {
    summary: 'A floating notice for something that happened elsewhere or just now; a running toast turns into its result in place.',
    use: [
      'Confirming an action whose result is not visible where the operator is.',
      'Long work the operator may leave, with toast.running, then toast.update with the outcome.',
      'One follow-up action, such as Undo or View run.',
    ],
    avoid: [
      { when: 'A condition of the page that stays true, such as read-only mode.', use: 'Components/Feedback/Callout' },
      { when: 'Anything that needs a decision, or more than one action.', use: 'Components/Overlays/Dialog' },
      { when: 'A validation error on a field.', use: 'Components/Forms/Field' },
      { when: 'Confirming a copy to the clipboard. Confirm it in place, as CodeBlock and Message do.', use: null },
    ],
    practices: [
      {
        do: 'Update the running toast with the outcome, so the result lands where the work was.',
        dont: 'Leave the running toast and fire a second, unrelated success toast.',
      },
    ],
    content: [
      'The title states what happened, in the past tense: “Index rebuilt”, “Deploy failed”.',
      'The description adds the cause or the figures: “1,204 documents · 3m 41s”.',
      'The action is one verb: “Undo”, “Retry”, “View”.',
    ],
  },
  'Components/Forms/Checkbox': {
    summary: 'A square that turns a choice on or off, applied when the form is saved; CheckboxGroup for any number of choices from a set.',
    use: [
      'One yes-or-no setting that takes effect on Save.',
      'Any number of options from a short visible list, with CheckboxGroup and its legend.',
      'A parent that selects all its children, and goes indeterminate when only some are on.',
    ],
    avoid: [
      { when: 'A setting that takes effect the moment it changes.', use: 'Components/Forms/Switch' },
      { when: 'Exactly one option from a set.', use: 'Components/Forms/Radio' },
      { when: 'Filters above a list that apply as they are pressed.', use: 'Components/Forms/Chip' },
      { when: 'A long list of options that people would rather search.', use: 'Components/Forms/Combobox' },
    ],
    practices: [
      {
        do: 'Label the positive choice: “Stream partial output”.',
        dont: 'Label a negative, “Don’t stream output”, which makes checked mean off.',
      },
    ],
    content: [
      'Labels state what is turned on, in sentence case, with no trailing period.',
      'Conditions go in description, not in the label: “Up to three times, with exponential backoff.”',
      'The legend names the set: “Tools”, “Notify on”.',
    ],
  },
  'Components/Forms/Chip': {
    summary: 'A filter chip with a real checkbox or radio inside, filled with ink when on, with an optional count.',
    use: [
      'Filters above a list or table that apply as they are pressed.',
      'Showing how many rows each filter would leave, with count.',
      'One of a few fixed ranges, such as 1h, 24h and 7d, with type set to radio.',
    ],
    avoid: [
      { when: 'A status shown to the reader rather than chosen by them.', use: 'Components/Feedback/Badge' },
      { when: 'Switching between views of the same data.', use: 'Components/Forms/Segmented control' },
      { when: 'Options in a form that is saved later.', use: 'Components/Forms/Checkbox' },
      { when: 'Values picked from a long list into a field; Combobox shows them as chips inside it.', use: 'Components/Forms/Combobox' },
    ],
    practices: [
      {
        do: 'Wrap chips in a ChipGroup with a legend, so “Failed” is heard as a status filter.',
        dont: 'Leave a row of chips unnamed; “Failed” on its own sounds like an error.',
      },
    ],
    content: [
      'Use the same words as the status being filtered: “Succeeded”, “Failed”.',
      'Keep default chips to one line; use the comfortable size for labels that wrap.',
    ],
  },
  'Components/Forms/Combobox': {
    summary: 'A select you can type into: Combobox always ends on an option from the list; Autocomplete takes free text with suggestions.',
    use: [
      'A list too long to scroll, such as people, tools or runs, where typing narrows it.',
      'Several values from a long list, with multiple, shown as chips inside the field.',
      'A server search, with filter set to null and loading and status reporting the results.',
      'Free text where suggestions save keystrokes and keep names consistent, such as a run label, with Autocomplete.',
    ],
    avoid: [
      { when: 'A short list people can scan without typing.', use: 'Components/Forms/Select' },
      { when: 'Two to five options that should all be visible.', use: 'Components/Forms/Radio' },
      { when: 'Jumping to a page or running a command from anywhere.', use: 'Components/Overlays/Command palette' },
      { when: 'Filtering the rows of a list as you type.', use: 'Components/Forms/Field', label: 'SearchInput' },
    ],
    practices: [
      {
        do: 'Use Combobox when the form must submit a value the list offered, such as a reviewer.',
        dont: 'Use Autocomplete for a reviewer or an owner; a half-typed name would be submitted as typed.',
      },
      {
        do: 'Write the empty message for the moment: before typing, what can be searched; after, the query that found nothing.',
        dont: 'Leave the popup blank while results load or when nothing matches.',
      },
    ],
    content: [
      'The placeholder says what to type: “Search people”, “run-4187 or eval-sweeper”.',
      'Keep a disabled option in the list, with its reason as the description: “Requires approval”.',
    ],
  },
  'Components/Forms/Date picker': {
    summary: 'DatePicker for one date, typed or picked from a calendar; DateRangePicker for a period, with presets and two typed ends.',
    use: [
      'One date, such as when to run an evaluation, with DatePicker.',
      'A period for a report or a filter, with DateRangePicker and presets such as the last 7 days.',
      'Dates with bounds or unavailable days, through min, max and isDateDisabled.',
    ],
    avoid: [
      { when: 'A period between two dates, where two single pickers would not check the order.', use: 'Components/Forms/Date picker', label: 'DateRangePicker' },
      { when: 'One date; a range picker would ask for a second press.', use: 'Components/Forms/Date picker', label: 'DatePicker' },
      { when: 'A duration, such as a timeout in seconds.', use: 'Components/Forms/Number input' },
      { when: 'A few fixed relative ranges, such as 1h, 24h and 7d.', use: 'Components/Forms/Chip' },
    ],
    practices: [
      {
        do: 'Pass locale, so the typed order, digits and first day of the week follow it.',
        dont: 'Guess the date order from the language; es-ES and es-PA write dates in different orders.',
      },
      {
        do: 'Keep typed entry on in DateRangePicker; typing is the accessible path into a date.',
        dont: 'Turn typedEntry off unless the presets and the grid cover every case.',
      },
    ],
    content: [
      'Label the field by what the date is for: “Run evaluation on”, “Report period”.',
      'Leave the placeholder to the component; it is the locale’s own pattern.',
      'Rules the picker cannot know, such as required, go to Field as an instruction: “Choose a date for the evaluation.”',
    ],
  },
  'Components/Forms/Field': {
    summary: 'A label, a control and a hint or error wired together; the page also covers Input, Textarea, SearchInput and Label.',
    use: [
      'Any form control that needs a visible label, a hint and a validation message, through the render prop.',
      'One line of text with Input, with a unit or an icon inside the field through leading and trailing.',
      'Several lines with Textarea, which grows with its content when autosize is set.',
      'Filtering a list with SearchInput, which shows a shortcut cap when empty and a clear button when not.',
    ],
    avoid: [
      { when: 'A number that is stepped, bounded or formatted.', use: 'Components/Forms/Number input' },
      { when: 'A choice from a known list.', use: 'Components/Forms/Select' },
      { when: 'A date or a period.', use: 'Components/Forms/Date picker' },
      { when: 'A prompt to a model, with attachments and a send button.', use: 'AI/Prompt input' },
    ],
    practices: [
      {
        do: 'Spread the control props onto the control, so its id, description and invalid state are wired.',
        dont: 'Use the placeholder as the label; it disappears as soon as someone types.',
      },
      {
        do: 'Put the unit inside the field with trailing: “seconds”, “tokens”.',
        dont: 'Write the unit as text after the field, where it reads as a second field.',
      },
    ],
    content: [
      'Labels are short nouns in sentence case: “Run name”, “Webhook URL”.',
      'Hints explain the consequence: “Shown in the run list and in alerts.”',
      'Errors say what is wrong and how to fix it: “Must be between 1 and 900 seconds.”',
    ],
  },
  'Components/Forms/File upload': {
    summary: 'A dropzone with a real Browse button, and a list of the files put there with their status and progress.',
    use: [
      'Attaching or uploading files, such as an evaluation dataset or documents for the knowledge index.',
      'Driving the transfer with onUpload, which queues, uploads, reports progress and retries each file.',
      'Stating the accepted types and the size limit before a file is chosen.',
    ],
    avoid: [
      { when: 'Attaching files to the next prompt in a conversation.', use: 'AI/Prompt input' },
      { when: 'Pasting text, such as a JSON override; a field is faster than a file.', use: 'Components/Forms/Field', label: 'Textarea' },
    ],
    practices: [
      {
        do: 'Reject a file in a sentence that names it and the rule: “budget.xlsx is 14.2 MB; the limit is 10 MB.”',
        dont: 'Say “Invalid file”, or add a rejected file to the list.',
      },
    ],
    content: [
      'When onUpload rejects, its error message is one sentence the person can act on; it is shown under the row.',
      'Pass messages to translate the copy, and keep each rule stated with its figure.',
    ],
  },
  'Components/Forms/Number input': {
    summary: 'A number you can type and step, formatted for a locale, with bounds, a unit and steppers inside the field.',
    use: [
      'An exact value with bounds, such as a token budget, a retry count or a timeout.',
      'Currency, percentages and units Intl knows, through format.',
      'A short unit suffix such as “tokens”, which is also added to the description.',
    ],
    avoid: [
      { when: 'A value where its place in a range matters more than the exact figure, such as temperature.', use: 'Components/Forms/Slider' },
      { when: 'An identifier made of digits, such as a run number; it is text, not a quantity.', use: 'Components/Forms/Field', label: 'Input' },
      { when: 'A date or a period.', use: 'Components/Forms/Date picker' },
    ],
    practices: [
      {
        do: 'Pass locale and a format, so “12,000 tokens” reads as a number.',
        dont: 'Use a native number input, which formats nothing and changes value when the page scrolls.',
      },
      {
        do: 'Leave the wheel off in forms, and set allowWheelScrub only on a field that is the point of its screen.',
        dont: 'Let scrolling past a field change its value.',
      },
    ],
    content: [
      'Labels name the quantity and its scope: “Token budget per run”, “Retries before halting”.',
      'Errors give the bound: “The workspace allows at most 8 concurrent runs.”',
    ],
  },
  'Components/Forms/Radio': {
    summary: 'One choice from a small set, all visible, in a named RadioGroup; square, and told from a checkbox by its mark.',
    use: [
      'Exactly one of two to five options that people should compare side by side.',
      'Options that each need a description, such as what happens when a tool call fails.',
    ],
    avoid: [
      { when: 'Any number of options.', use: 'Components/Forms/Checkbox' },
      { when: 'More options than fit comfortably, or options that do not need comparing.', use: 'Components/Forms/Select' },
      { when: 'Switching views, where the change is instant and nothing is submitted.', use: 'Components/Forms/Segmented control' },
      { when: 'A single setting that is on or off.', use: 'Components/Forms/Switch' },
    ],
    practices: [
      {
        do: 'Give the group a label that asks the question: “When a tool call fails”.',
        dont: 'Leave the group unnamed; a screen reader then announces “group” and nothing else.',
      },
    ],
    content: [
      'Option labels are parallel and start the same way: “Retry, then continue”, “Skip the step”, “Halt the run”.',
      'The consequence goes in description: “The run is marked failed and the owner is paged.”',
    ],
  },
  'Components/Forms/Segmented control': {
    summary: 'One choice from a few views or settings, all visible and switched instantly, cut from one piece.',
    use: [
      'Switching between views of the same content: Table, Board, Timeline.',
      'A setting with two to five short options that applies at once, such as density.',
      'Icon-only segments in a tight space, with the labels kept as accessible names.',
    ],
    avoid: [
      { when: 'More than five options, or options that need explaining.', use: 'Components/Forms/Select' },
      { when: 'A choice that is submitted with a form.', use: 'Components/Forms/Radio' },
      { when: 'Panels of different content, each with its own heading.', use: 'Components/Navigation/Tabs' },
      { when: 'Filters that can be combined.', use: 'Components/Forms/Chip' },
    ],
    practices: [
      {
        do: 'Always have one segment selected; pressing the selected one does nothing.',
        dont: 'Use segments as a row of separate action buttons.',
      },
    ],
    content: [
      'Labels are one word where possible: “Table”, “Board”.',
      'Name the group with aria-label: “View”, “Density”.',
    ],
  },
  'Components/Forms/Select': {
    summary: 'A choice from a list in a popup, with an optional second line per option and labelled groups.',
    use: [
      'One value from a list short enough to scan without typing, such as an environment or a model.',
      'Options that need a second line, such as a model’s speed and cost.',
      'A field in a form, inside Field, or a compact filter in a toolbar.',
    ],
    avoid: [
      { when: 'A list long enough that people would rather type.', use: 'Components/Forms/Combobox' },
      { when: 'Two to five options that should all be visible.', use: 'Components/Forms/Radio' },
      { when: 'Switching views instantly.', use: 'Components/Forms/Segmented control' },
      { when: 'A list of actions rather than a value.', use: 'Components/Overlays/Menu' },
    ],
    practices: [
      {
        do: 'Keep a retired option in the list, disabled, with the reason as its description.',
        dont: 'Remove an option someone may look for without saying where it went.',
      },
    ],
    content: [
      'Option labels are the names people use, “Cayuco Steady 3”; the description adds the trade-off, “Balanced · default”.',
      'The placeholder says what to choose: “Choose an environment”.',
    ],
  },
  'Components/Forms/Slider': {
    summary: 'A value or a range on a continuous scale, with the value always printed in tabular figures.',
    use: [
      'A value where the range matters as much as the number, such as temperature or a rollout percentage.',
      'A range between two values, with two thumbs.',
      'A scale whose ends need words, through minLabel and maxLabel.',
    ],
    avoid: [
      { when: 'An exact figure someone will type, such as a budget of 40,000 tokens.', use: 'Components/Forms/Number input' },
      { when: 'A reading the person cannot change.', use: 'Components/Feedback/Progress', label: 'Meter' },
      { when: 'A few discrete options.', use: 'Components/Forms/Segmented control' },
    ],
    practices: [
      {
        do: 'Format the printed value with its unit, through formatValue: “25% of runs”.',
        dont: 'Turn showValue off, so the value can only be learned by dragging.',
      },
    ],
    content: ['End labels describe the effect at each end, not the number: “Precise”, “Creative”.'],
  },
  'Components/Forms/Switch': {
    summary: 'A setting that takes effect the moment it is switched; on is verde, the colour of live.',
    use: [
      'Turning a capability on or off at once: streaming, a tool, a flag.',
      'Settings lists, with labelPosition set to start so labels align left and switches right.',
    ],
    avoid: [
      { when: 'A choice that waits for a Save button.', use: 'Components/Forms/Checkbox' },
      { when: 'A choice between two named options rather than on and off.', use: 'Components/Forms/Radio' },
      { when: 'A pressed state in a row of controls, such as Wrap lines.', use: 'Components/Layout/Toolbar' },
    ],
    practices: [
      {
        do: 'Apply the change as soon as the switch moves, and say in the description what it affects.',
        dont: 'Mix switches and checkboxes in a form that is saved later; a switch says it has already happened.',
      },
    ],
    content: [
      'Label the capability, not the action: “Stream responses”, not “Turn on streaming”.',
      'The description states the effect or the cost: “Stored for 30 days; may contain user text.”',
    ],
  },
  'Components/Layout/App shell': {
    summary: 'The frame a tool lives in: a top bar, a sidebar that collapses to a rail or becomes a sheet, and one scrolling main region.',
    use: [
      'The outer frame of an application with navigation, search and a work area.',
      'Navigation with sections, a current page and counts, through Sidebar, NavSection and NavItem.',
      'The product mark, search and account controls, through Topbar.',
    ],
    avoid: [
      { when: 'The title, description and actions at the top of one page inside the shell.', use: 'Components/Layout/Page header' },
      { when: 'Details beside the work, opened from a row.', use: 'Components/Overlays/Drawer' },
      { when: 'Switching between views inside a page.', use: 'Components/Navigation/Tabs' },
    ],
    practices: [
      {
        do: 'Mark the current destination with active, and set countTone to attention only for things that need a person.',
        dont: 'Fill every count in rojo; totals are not alarms.',
      },
    ],
    content: [
      'Navigation labels are short nouns: “Runs”, “Agents”, “Evaluations”.',
      'Give a count its countLabel, “3 failed”, so the number is not read alone.',
      'Name the Sidebar landmark: “Main”, “Settings”.',
    ],
  },
  'Components/Layout/Container': {
    summary: 'The page column, in prose, page, wide and full widths; Section and SectionHeader set the rhythm down the page.',
    use: [
      'Holding a page to a readable or a working width, with gutters that move with density.',
      'Wide tables and dashboards, with size set to wide.',
      'Reading pages, with size set to prose, which never widens.',
      'Spacing sections down a page with Section, and titling them with SectionHeader.',
    ],
    avoid: [
      { when: 'A bounded region with its own ground and edge.', use: 'Components/Layout/Panel' },
      { when: 'Columns of cards or tiles.', use: 'Components/Layout/Grid' },
      { when: 'The outer frame of an application.', use: 'Components/Layout/App shell' },
    ],
    content: [
      'A SectionHeader label goes under the heading and says what kind of section it is: “Evaluation suite”.',
    ],
  },
  'Components/Layout/Divider': {
    summary: 'Three dividers in rising weight and rarity: a keyline, a relleno seam and the sawtooth diente.',
    use: [
      'A keyline between rows or fields.',
      'A relleno seam between two major parts of a page.',
      'A diente only where the page gives way to a filled panel.',
    ],
    avoid: [
      { when: 'Sections that already have headings and space between them.', use: 'Components/Layout/Container', label: 'Section' },
      { when: 'Groups of controls in a row.', use: 'Components/Layout/Toolbar' },
    ],
    practices: [
      {
        do: 'Use the keyline by default, and relleno only where a hairline is too weak.',
        dont: 'Put relleno between every card; the texture turns into wallpaper.',
      },
    ],
    content: ['A divider carries no words; when a division needs a name, give it a heading instead.'],
  },
  'Components/Layout/Grid': {
    summary: 'Column patterns that reflow; auto fits as many columns of at least minItem as there is room for.',
    use: [
      'Cards or tiles that reflow with no breakpoints, with cols set to auto and a minItem.',
      'Fixed patterns of halves, thirds, quarters or fifths.',
      'Cells cut from one panel that share keylines, with gap set to seamless.',
    ],
    avoid: [
      { when: 'Rows of records with the same fields.', use: 'Components/Data display/Table' },
      { when: 'Headline figures, which have their own group.', use: 'Components/Data display/Stat' },
      { when: 'One column or one row of items with a single gap.', use: 'Components/Layout/Stack' },
    ],
    content: ['Keep tiles in a grid parallel: the same fields, in the same order, with the same units.'],
  },
  'Components/Layout/Page header': {
    summary: 'The top of a page inside the shell: a breadcrumb, the title, a description, actions, a row of facts and optional tabs.',
    use: [
      'Saying where the reader is, what the page is and what they can do on it.',
      'Short facts about the object, such as status, owner and last update, through meta.',
      'Tabs that switch views of the page, on the header’s bottom edge.',
    ],
    avoid: [
      { when: 'A title for a section inside a page.', use: 'Components/Layout/Container', label: 'SectionHeader' },
      { when: 'A title that is the whole point of the screen, such as an onboarding panel.', use: 'Components/Typography/Display' },
    ],
    practices: [
      {
        do: 'Keep the page’s main action in actions, where it wraps under the title on a narrow screen.',
        dont: 'Hide the main action in an overflow menu.',
      },
    ],
    content: [
      'The title is the object’s name or the collection’s: “Runs”, “Support triage”.',
      'The description says what the page holds in one sentence.',
      'Meta items are short facts, not sentences: “Updated 12s ago”, “Retention 30 days”.',
    ],
  },
  'Components/Layout/Panel': {
    summary: 'A cut surface: a region of one ground bounded by an edge, where the tone decides the ink.',
    use: [
      'Grouping content into a region of a page, bounded by the ink keyline.',
      'A filled region on a layer colour; the panel resets the ink so the text stays legible.',
      'The one panel on a screen that is its point, with edge set to band.',
    ],
    avoid: [
      { when: 'A message about a region, with a tone and an action.', use: 'Components/Feedback/Callout' },
      { when: 'Content that floats over the page.', use: 'Components/Overlays/Popover' },
      { when: 'A region with nothing in it yet.', use: 'Components/Feedback/Empty state' },
    ],
    practices: [
      {
        do: 'Set the ground with tone, so every ink inside follows it.',
        dont: 'Add a background class to a div; secondary text inside it renders dark on dark.',
      },
      {
        do: 'Keep edge band to one panel per screen.',
        dont: 'Band every card on the page.',
      },
    ],
    content: ['Title a panel by what it holds, “Weekly digest agent”, not “Details” or “Info”.'],
  },
  'Components/Layout/Stack': {
    summary: 'Stack for a column with one gap, Inline for a row that wraps, and RowBetween for one thing at each end.',
    use: [
      'Vertical rhythm between blocks, with a gap named by role.',
      'A row of buttons or badges that wraps on a phone, with Inline.',
      'A panel header with a title at one end and an action at the other, with RowBetween.',
    ],
    avoid: [
      { when: 'A row of controls that should be one tab stop.', use: 'Components/Layout/Toolbar' },
      { when: 'Columns that reflow with the available width.', use: 'Components/Layout/Grid' },
      { when: 'Groups that need more separation than a larger gap.', use: 'Components/Layout/Divider' },
    ],
    practices: [
      {
        do: 'Pick a gap from the seven named steps.',
        dont: 'Add an arbitrary margin as an eighth step; a layout that needs one needs a divider.',
      },
    ],
    content: ['In a RowBetween header, pair a noun title with a verb action: “Run history” and “Export CSV”.'],
  },
  'Components/Layout/Toolbar': {
    summary: 'A row of related controls with one tab stop and arrow-key movement, with toggles, a field and an overflow menu.',
    use: [
      'Actions and filters above a table or canvas, such as Re-run, Stop and Share trace.',
      'Pressed states, with ToolbarToggle and ToolbarToggleGroup.',
      'A filter field in the row, with ToolbarInput and an aria-label.',
      'More actions than fit, folded into a More menu with ToolbarOverflow.',
    ],
    avoid: [
      { when: 'One or two actions; plain buttons are enough.', use: 'Components/Actions/Button' },
      { when: 'Switching between views.', use: 'Components/Forms/Segmented control' },
      { when: 'Actions on one row of a table.', use: 'Components/Overlays/Menu' },
    ],
    practices: [
      {
        do: 'Separate groups with ToolbarSeparator.',
        dont: 'Group with extra space; between identical ghost buttons it reads as uneven spacing.',
      },
      {
        do: 'Order overflow items by priority, with the destructive action last.',
        dont: 'Put Delete first, where it stays in the row the longest.',
      },
    ],
    content: [
      'Name the toolbar with aria-label: “Run actions”, “Filter runs”.',
      'Buttons are verbs; toggles name what they show: “Wrap lines”, “Tool calls”.',
    ],
  },
  'Components/Navigation/Accordion': {
    summary: 'Sections of one document that open one or several at a time; Collapsible for a single disclosure.',
    use: [
      'Answers in an FAQ, or the advanced settings of an agent.',
      'Settings where comparing two sections matters, with multiple.',
      'One disclosure inside something else, such as a raw response, with Collapsible.',
    ],
    avoid: [
      { when: 'Peer views of one object where only one shows at a time.', use: 'Components/Navigation/Tabs' },
      { when: 'Content most readers need on every visit. Leave it open on the page.', use: null },
      { when: 'The model’s thinking behind an answer.', use: 'AI/Reasoning' },
      { when: 'Ordered steps to follow.', use: 'Components/Data display/Timeline', label: 'StepList' },
    ],
    practices: [
      {
        do: 'Say in the trigger what is inside, with a count in meta.',
        dont: 'Hide a required field inside a closed section.',
      },
    ],
    content: [
      'Triggers are questions in an FAQ, “What counts as a run?”, and nouns in settings, “Limits”.',
      'Meta is a short fact: “6 tools”, “Defaults”.',
    ],
  },
  'Components/Navigation/Breadcrumb': {
    summary: 'Where a page sits, as links back up the path, with the current page as plain text.',
    use: [
      'Pages nested two or more levels deep: Workspace / Agents / knowledge-agent / Run #4182.',
      'Long ids in the path, shortened in the middle with middleTruncate.',
    ],
    avoid: [
      { when: 'Moving between pages of the same list.', use: 'Components/Navigation/Pagination' },
      { when: 'Switching between views of one page.', use: 'Components/Navigation/Tabs' },
      { when: 'Top-level navigation between parts of the product.', use: 'Components/Layout/App shell' },
    ],
    practices: [
      {
        do: 'Pass renderLink to use your router’s link.',
        dont: 'Link the current page; a link to where you already are does nothing.',
      },
    ],
    content: [
      'Use each page’s own title as its crumb, so the trail matches the headings.',
      'Shorten ids in the middle, keeping both ends: “run_8f3a…c21e”.',
    ],
  },
  'Components/Navigation/Pagination': {
    summary: 'Moving through a long ordered result, as numbered pages or as a compact range with two arrows.',
    use: [
      'Results where a page is a place people come back to, with the pages variant.',
      'Dense tables where the question is how much is left, with the compact variant: “51–100 of 1,284”.',
    ],
    avoid: [
      { when: 'A table that also sorts and selects; DataTable includes its pagination.', use: 'Components/Data display/Table', label: 'DataTable' },
      { when: 'Showing where a page sits in the hierarchy.', use: 'Components/Navigation/Breadcrumb' },
      { when: 'Steps of a flow that must be done in order.', use: 'Components/Data display/Timeline', label: 'StepList' },
    ],
    practices: [
      {
        do: 'Wire onPageChange to the router when a page should have its own URL.',
        dont: 'Expect the page numbers to be links; the component does not own your URLs.',
      },
    ],
    content: ['Give the compact variant pageSize and total, so it states the range rather than “Page 2 of 26”.'],
  },
  'Components/Navigation/Tabs': {
    summary: 'Switching between views of one thing: underline for views, panel for tabs that are containers.',
    use: [
      'Views of one object, such as a run’s Trace, Output, Cost and Logs, with the underline variant.',
      'Containers, such as a code sample in three languages, with the panel variant.',
      'A count on a tab, such as the number of tool calls, through count.',
    ],
    avoid: [
      { when: 'Changing how the same data is displayed, such as Table or Board.', use: 'Components/Forms/Segmented control' },
      { when: 'Sections someone may want open together.', use: 'Components/Navigation/Accordion' },
      { when: 'Moving between parts of the product.', use: 'Components/Layout/App shell' },
    ],
    practices: [
      {
        do: 'Keep labels short, in sentence case.',
        dont: 'Set tab labels in capitals; a row of capitalised labels reads as buttons.',
      },
    ],
    content: [
      'Labels are one or two nouns: “Trace”, “Output”, “Cost”.',
      'Let a long list scroll rather than shortening labels until they stop meaning anything.',
    ],
  },
  'Components/Overlays/Command palette': {
    summary: 'The keyboard’s front door: a searchable list of commands and destinations, opened with ⌘K or Ctrl+K.',
    use: [
      'Jumping to a run, an agent or a page by name from anywhere in the tool.',
      'Running a command without the pointer, with its shortcut shown beside it.',
      'Matching synonyms and ids through keywords.',
    ],
    avoid: [
      { when: 'Choosing a value for a form field from a long list.', use: 'Components/Forms/Combobox' },
      { when: 'Actions on one object, opened from that object.', use: 'Components/Overlays/Menu' },
      { when: 'Filtering the list on the current page.', use: 'Components/Forms/Field', label: 'SearchInput' },
    ],
    practices: [
      {
        do: 'Group results under headings, such as Actions, Agents and Go to.',
        dont: 'Expect fuzzy matches; every typed word must appear in the label, description or keywords.',
      },
      {
        do: 'Keep unavailable commands visible and disabled, with the reason as the description.',
        dont: 'Hide commands the person cannot run without saying why.',
      },
    ],
    content: [
      'Commands start with a verb, “Start a new run”; destinations are nouns, “Settings”.',
      'Descriptions add the reason or the context: “Owners only”, “Answers from the help centre”.',
    ],
  },
  'Components/Overlays/Dialog': {
    summary: 'Dialog for a short modal task; AlertDialog to confirm an action that destroys something.',
    use: [
      'A short task the person finishes or cancels before going back, such as renaming an agent.',
      'Read-only detail that needs the screen for a moment, with only the body scrolling.',
      'Confirming a destructive action with AlertDialog, which opens on Cancel and ignores clicks outside.',
      'An irreversible action at scale, with confirmationText set to the resource’s exact name.',
    ],
    avoid: [
      { when: 'Details beside the work that the person compares with the page.', use: 'Components/Overlays/Drawer' },
      { when: 'A small panel anchored to a control, without trapping focus.', use: 'Components/Overlays/Popover' },
      { when: 'A notice that needs no decision.', use: 'Components/Feedback/Toast' },
      { when: 'A change an agent proposes for a person to review.', use: 'AI/Change review' },
    ],
    practices: [
      {
        do: 'Name the object and the consequence in a destructive confirm: “Its trace, tool calls and outputs are removed for everyone.”',
        dont: 'Ask “Are you sure?” over OK and Cancel.',
      },
      {
        do: 'Return a promise from onConfirm, so the dialog stays open if the work fails.',
        dont: 'Close the dialog before the work has succeeded.',
      },
    ],
    content: [
      'Titles name the task or ask the question: “Rename agent”, “Delete this run?”.',
      'The confirm button repeats the verb and object: “Delete run”, never “OK” or “Yes”.',
      'The footer holds a ghost Cancel and one primary action.',
    ],
  },
  'Components/Overlays/Drawer': {
    summary: 'A panel that slides in from an edge: details beside a list, filters, or quick actions in a bottom sheet.',
    use: [
      'The details of a row, opened from a table, with an end drawer.',
      'Filters for a list, applied from the footer of a start drawer.',
      'Quick actions on a phone, with a bottom sheet.',
    ],
    avoid: [
      { when: 'A short task or a decision that should hold all the attention.', use: 'Components/Overlays/Dialog' },
      { when: 'A few options attached to one control.', use: 'Components/Overlays/Popover' },
      { when: 'Navigation for the whole product.', use: 'Components/Layout/App shell' },
    ],
    practices: [
      {
        do: 'Put the apply action in the footer, which stays visible while the body scrolls.',
        dont: 'Hide the close button; a touch screen-reader user has no Escape key.',
      },
    ],
    content: [
      'Titles name what is inside: “Run details”, “Filter runs”.',
      'An apply button states the result: “Show 42 runs”.',
    ],
  },
  'Components/Overlays/Menu': {
    summary: 'Actions on a thing that do not each deserve a button, with checkbox and radio items, submenus and shortcuts.',
    use: [
      'Row actions behind an icon button such as “Run actions”.',
      'View options, such as columns to show and a sort order, with checkbox and radio items.',
      'Related actions grouped in a submenu, such as export formats.',
    ],
    avoid: [
      { when: 'One or two actions that are always needed.', use: 'Components/Actions/Button' },
      { when: 'Choosing a value for a form field.', use: 'Components/Forms/Select' },
      { when: 'Finding any command in the product by name.', use: 'Components/Overlays/Command palette' },
      { when: 'A panel with fields or an explanation.', use: 'Components/Overlays/Popover' },
    ],
    practices: [
      {
        do: 'Mark a destructive item with tone set to danger, and put it last, after a separator.',
        dont: 'Place Delete between harmless actions.',
      },
    ],
    content: [
      'Items are verbs on the object: “Rename”, “Duplicate”, “Delete run”.',
      'Submenu items name the format or the target: “Trace as JSON”.',
      'Group labels are short nouns: “Columns”, “Sort by”.',
    ],
  },
  'Components/Overlays/Popover': {
    summary: 'A non-modal panel anchored to the control that opened it.',
    use: [
      'Filters for one table column, with Apply and Reset.',
      'A short explanation someone asks for, such as what a step budget is.',
      'The details of one item, in a few lines or controls.',
    ],
    avoid: [
      { when: 'A label for an icon-only control.', use: 'Components/Overlays/Tooltip' },
      { when: 'A list of actions.', use: 'Components/Overlays/Menu' },
      { when: 'A task that should hold focus until it is done.', use: 'Components/Overlays/Dialog' },
      { when: 'A preview of a cited source.', use: 'AI/Sources', label: 'Citation' },
    ],
    practices: [
      {
        do: 'Give the popover a title, or an aria-label when it has none.',
        dont: 'Put information people need only inside a popover they may never open.',
      },
    ],
    content: [
      'The title says what the popover does: “Filter by status”.',
      'The description says how it applies: “Runs matching any checked status are shown.”',
    ],
  },
  'Components/Overlays/Tooltip': {
    summary: 'A short label on hover or focus, with an optional keyboard shortcut.',
    use: [
      'Naming an icon-only button, and its shortcut.',
      'A row of icon buttons inside TooltipProvider, so each next label appears without a delay.',
    ],
    avoid: [
      { when: 'Information people need to finish the task; a tooltip does not exist on touch.', use: 'Components/Overlays/Popover' },
      { when: 'Anything with a link or a button in it.', use: 'Components/Overlays/Popover' },
      { when: 'Explaining a form field; give it a hint.', use: 'Components/Forms/Field' },
    ],
    practices: [
      {
        do: 'Pair a tooltip with IconButton’s label.',
        dont: 'Use a tooltip instead of an accessible name.',
      },
    ],
    content: [
      'A verb phrase in sentence case, with no trailing period: “Copy run id”.',
      'Write keys as they appear on the keyboard: ⌘, ⇧, R.',
    ],
  },
  'Components/Typography/Display': {
    summary: 'Archivo Bold set wide, for the one title that is the point of a screen.',
    use: [
      'An empty state, an onboarding panel or the page that introduces a tool.',
      'The signature display-cut class, on a filled panel, once per page.',
    ],
    avoid: [
      { when: 'Page titles in a working view.', use: 'Components/Typography/Heading' },
      { when: 'A label that says what kind of block this is.', use: 'Components/Typography/Rotulo' },
    ],
    practices: [
      {
        do: 'Use one per screen at most.',
        dont: 'Set display-cut on light cloth; it reads as a sticker, not appliqué.',
      },
    ],
    content: ['Keep it to a few words; it is set at up to 76px.'],
  },
  'Components/Typography/Heading': {
    summary: 'Four heading levels for wayfinding in a tool, with size to separate the look from the outline.',
    use: [
      'A page title at level 1, panel titles at 2, groups at 3, and a label over a cluster of fields at 4.',
      'A heading whose look should differ from its outline level, through size.',
    ],
    avoid: [
      { when: 'The one statement that is the point of a screen.', use: 'Components/Typography/Display' },
      { when: 'A label that says what kind of block this is.', use: 'Components/Typography/Rotulo' },
      { when: 'Bold text that is not a heading.', use: 'Components/Typography/Text' },
    ],
    practices: [
      {
        do: 'Change size to get a smaller heading.',
        dont: 'Skip a level in the outline to get a smaller heading.',
      },
    ],
    content: [
      'Sentence case, with no trailing period: “Run history”, “Tool calls in this step”.',
      'Name the content, not the action: “Arguments”, not “View the arguments”.',
    ],
  },
  'Components/Typography/Kbd': {
    summary: 'A key as a cut shape, with KbdChord for keys pressed together.',
    use: [
      'A keyboard shortcut in text, a hint or a footer.',
      'Keys pressed together, such as ⌘ and K, with KbdChord.',
    ],
    avoid: [
      { when: 'A literal the machine reads, such as an id or a flag.', use: 'Components/Data display/Code' },
      { when: 'The shortcut of an icon button, shown on hover.', use: 'Components/Overlays/Tooltip' },
    ],
    content: [
      'Use the key’s symbol or its printed name: ⌘, ⇧, ↵, Esc.',
      'When a shortcut differs between platforms, show both, or bind both as the command palette does with ⌘K and Ctrl+K.',
    ],
  },
  'Components/Typography/Lead': {
    summary: 'The paragraph under a page title that says what the screen is for, in the reading voice.',
    use: [
      'One or two sentences under a page or section title, read once on a first visit.',
      'The explanation under a Display title on an onboarding or first-run screen.',
    ],
    avoid: [
      { when: 'Interface text, such as descriptions and hints.', use: 'Components/Typography/Text' },
      { when: 'Several paragraphs of long-form content.', use: 'Components/Typography/Prose' },
    ],
    content: ['Say what the screen is for and what the reader can do there, in plain sentences.'],
  },
  'Components/Typography/Meta': {
    summary: 'Small facts compared down a column, such as duration, cost, count and time, in tabular figures.',
    use: [
      'A line of figures under a title or in a row: “2.4 s · 3,812 tokens · $0.014”.',
      'Timestamps and counts that are reference rather than content, such as when a run started.',
    ],
    avoid: [
      { when: 'Ids and other machine literals.', use: 'Components/Data display/Code' },
      { when: 'Labelled properties of one object.', use: 'Components/Data display/Description list' },
      { when: 'Descriptions or hints written as sentences.', use: 'Components/Typography/Text' },
    ],
    content: [
      'Separate facts with a middle dot, “ · ”, and always give the unit.',
      'Keep each fact to a figure and its unit; no sentences.',
    ],
  },
  'Components/Typography/Prose': {
    summary: 'The reading voice for long-form markup, such as a document, a run summary or a model’s answer.',
    use: [
      'Rendered markdown or rich text that cannot be annotated element by element.',
      'A model’s finished answer, so it reads as speech rather than as interface.',
      'A chat column or a side panel, with size set to sm.',
    ],
    avoid: [
      { when: 'An answer that is still streaming.', use: 'AI/Streaming text' },
      { when: 'Interface text: labels, hints and descriptions.', use: 'Components/Typography/Text' },
      { when: 'A single introductory paragraph under a title.', use: 'Components/Typography/Lead' },
    ],
    practices: [
      {
        do: 'Keep the reading measure, and let margins absorb the width.',
        dont: 'Set fluid on long text in a wide panel; the lines grow too long to read.',
      },
    ],
    content: ['Headings inside prose use the same sentence case as the rest of the interface.'],
  },
  'Components/Typography/Pullquote': {
    summary: 'A voice interrupting the prose: a quotation in the reading face, under a relleno band, with its source.',
    use: [
      'A quoted customer, a key finding in a research summary, or a sentence from an answer an operator pinned.',
      'Breaking a long write-up, such as an evaluation report, with the sentence the reader should keep.',
    ],
    avoid: [
      { when: 'A passage quoted as evidence for a claim.', use: 'AI/Sources' },
      { when: 'A message about the page.', use: 'Components/Feedback/Callout' },
    ],
    content: ['Quote exactly, and give cite as who said it and where: “Evaluation lead, research interview 7”.'],
  },
  'Components/Typography/Rotulo': {
    summary: 'The label register, cut short by a band, set under the block it belongs to.',
    use: [
      'Saying what kind of thing a block is, or who it is from, under its heading.',
      'A label inside a dense header, with plain, which drops the band.',
    ],
    avoid: [
      { when: 'An eyebrow above a heading; the heading says it better.', use: 'Components/Typography/Heading' },
      { when: 'A status.', use: 'Components/Feedback/Badge' },
      { when: 'The label of a form field.', use: 'Components/Forms/Field', label: 'Label' },
    ],
    practices: [
      {
        do: 'Put the rótulo under the heading.',
        dont: 'Put it above the heading as an eyebrow.',
      },
      {
        do: 'Keep the oro band for ink grounds.',
        dont: 'Use oro on light cloth, where it measures 1.66:1 and disappears.',
      },
    ],
    content: ['Two or three words in sentence case; the register sets them in capitals.'],
  },
  'Components/Typography/Text': {
    summary: 'Running interface text in the system voice, in three inks: ink, ink-2 and muted.',
    use: [
      'Descriptions, hints and secondary lines in the interface.',
      'Figures compared down a column, with tabular.',
      'A result stated in words, with tone set to danger or success.',
    ],
    avoid: [
      { when: 'Long-form text someone reads, such as an answer or an article.', use: 'Components/Typography/Prose' },
      { when: 'Headings.', use: 'Components/Typography/Heading' },
      { when: 'Machine literals.', use: 'Components/Data display/Code' },
    ],
    practices: [
      {
        do: 'Use ink for what the reader came for, ink-2 for what explains it, and muted for what they can skip.',
        dont: 'Add a fourth grey, or let colour alone carry a result.',
      },
    ],
    content: ['Sentence case throughout; full sentences end with a full stop, labels do not.'],
  },
}
