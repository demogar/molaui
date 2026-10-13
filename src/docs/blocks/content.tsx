import { Code } from '../../components/code'
import { USAGE } from '../usage/guidance'
import { storyHref } from '../usage/links'
import { RULES } from '../usage/rules'
import { titleName } from './usage'

/**
 * The Content and voice page's blocks. The rules and the per-component
 * wording are not restated here: they are read from rules.ts and
 * guidance.ts, the same sources the component pages and the agent manifest
 * use. Only the word list is written here, and every "where" in it names a
 * label the components ship today.
 */

/** Backticked names in the guidance become the system's own inline Code. */
function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <Code key={i}>{part}</Code> : part))}
    </>
  )
}

const link = 'font-semibold text-ink underline underline-offset-2'

/** The design rules that are about words and voices, from rules.ts. */
export function ContentRules() {
  const rules = RULES.filter((r) => /^(Typefaces|Labels|State is never)/.test(r.rule))
  return (
    <ul className="sb-unstyled not-prose my-6 grid list-none gap-3 p-0 font-ui text-sm text-ink">
      {rules.map((r) => (
        <li key={r.rule} className="m-0 grid gap-1 bg-cloth-pale p-4 shadow-cut">
          <span className="font-semibold text-ink">
            <Inline text={r.rule} />
          </span>
          <span className="text-ink-2">
            <Inline text={r.why} />
          </span>
        </li>
      ))}
    </ul>
  )
}

interface Word {
  say: string
  when: string
  /** Where a component says it today, with the page it is on. */
  where: { label: string; title: string }[]
  not?: string
}

/**
 * The words that are easy to swap and should not be. Each entry is drawn
 * from a label the components ship (or a default a prop can override), so
 * the list describes the system as it is, not as a style guide wishes.
 */
export const WORDS: { group: string; words: Word[] }[] = [
  {
    group: 'Ending something',
    words: [
      {
        say: 'Close',
        when: 'Puts away a container the person opened. Nothing is lost; the work inside is kept or was already saved.',
        where: [
          { label: 'Dialog and Drawer header button', title: 'Components/Overlays/Dialog' },
          { label: '“Close navigation” on the mobile sidebar', title: 'Components/Layout/App shell' },
        ],
        not: 'Not for a notice the system raised (Dismiss), or for abandoning a change (Cancel).',
      },
      {
        say: 'Dismiss',
        when: 'Sends away a notice the system put in front of the person: a toast, a callout. The notice was information, not a task.',
        where: [
          { label: 'Toast close button', title: 'Components/Feedback/Toast' },
          { label: 'Callout with onDismiss', title: 'Components/Feedback/Callout' },
        ],
        not: 'Not for a dialog the person opened themselves (Close).',
      },
      {
        say: 'Done',
        when: 'The one footer button of a panel with nothing to confirm: the person has finished looking or adjusting, and every change already applied.',
        where: [{ label: 'Footer of a view-only Dialog or Drawer', title: 'Components/Overlays/Drawer' }],
        not: 'Not when something still has to be saved; name the action instead, “Save name”.',
      },
      {
        say: 'Cancel',
        when: 'Abandons what the person started in this panel, changing nothing. Always beside a named action, never alone.',
        where: [{ label: 'Dialog footer, the default cancelLabel', title: 'Components/Overlays/Dialog' }],
        not: 'Not as the confirm of a destructive question; the confirm repeats the verb, “Delete run”.',
      },
    ],
  },
  {
    group: 'Taking something away',
    words: [
      {
        say: 'Delete',
        when: 'Destroys the thing itself, for everyone. Always with its object, “Delete run”, and on the danger button.',
        where: [{ label: 'Menu and AlertDialog confirm, “Delete run”', title: 'Components/Overlays/Dialog' }],
        not: 'Not for taking an item out of a list or a selection (Remove).',
      },
      {
        say: 'Remove',
        when: 'Takes an item out of this list, selection or message. The item itself still exists.',
        where: [
          { label: '“Remove {name}” on a chosen option', title: 'Components/Forms/Combobox' },
          { label: '“Remove {name}” on a file', title: 'Components/Forms/File upload' },
          { label: '“Remove {name}” on an attachment', title: 'AI/Prompt input' },
        ],
      },
      {
        say: 'Clear',
        when: 'Empties a field or a set of filters. The field stays, ready for a new value.',
        where: [
          { label: '“Clear search” in SearchInput', title: 'Components/Forms/Field' },
          { label: '“Clear selection”', title: 'Components/Forms/Combobox' },
          { label: '“Clear filters” when filters hide every row', title: 'Components/Data display/Table' },
        ],
      },
    ],
  },
  {
    group: 'Work in progress',
    words: [
      {
        say: 'Stop',
        when: 'Halts a response while it generates and keeps what has already arrived, marked as partial. The send button becomes Stop in the same place.',
        where: [{ label: 'Prompt input while a response streams', title: 'AI/Prompt input' }],
        not: 'Stopped is not failed: no rojo, no alert.',
      },
      {
        say: 'Cancel run',
        when: 'Ends a run that is still open. Its status reads Cancelled.',
        where: [{ label: 'Agent run actions', title: 'AI/Agent run' }],
      },
      {
        say: 'Retry',
        when: 'Runs the same thing again after it failed. Say what is retried when it is not obvious: “Retry from step 3”, “Retry run”.',
        where: [
          { label: '“Retry from step N”', title: 'AI/Run error' },
          { label: '“Retry {name}” on a failed upload', title: 'Components/Forms/File upload' },
        ],
      },
    ],
  },
  {
    group: 'Deciding for an agent',
    words: [
      {
        say: 'Approve and Deny',
        when: 'Permission for one action an agent wants to take. Deny refuses it, and the call does not run.',
        where: [{ label: 'Tool call approval', title: 'AI/Tool call' }],
      },
      {
        say: 'Approve, Request changes and Reject',
        when: 'A verdict on work an agent proposes. Reject turns the work down; Request changes sends it back with a reason.',
        where: [{ label: 'Change review', title: 'AI/Change review' }],
      },
    ],
  },
  {
    group: 'Confirming',
    words: [
      {
        say: 'Copy, then Copied',
        when: 'The button names what it copies, and its name changes to say it worked: “Copy run id” becomes “Run id copied”.',
        where: [
          { label: 'Code block', title: 'Components/Data display/Code' },
          { label: 'Agent run id', title: 'AI/Agent run' },
        ],
      },
    ],
  },
]

export const NEVER = ['OK', 'Yes', 'Submit', 'Are you sure?', 'Click here']

export function WordList() {
  const cell = 'border-t border-keyline p-3 text-start align-top'
  return (
    <div className="sb-unstyled not-prose my-6 grid gap-8 font-ui text-sm text-ink">
      {WORDS.map((group) => (
        <div key={group.group} className="grid gap-2">
          <h3 className="m-0 rotulo text-ink-muted">{group.group}</h3>
          <div className="relative min-w-0 overflow-x-auto bg-cloth-pale shadow-cut">
            <table className="w-full min-w-[36rem] border-collapse">
              <thead className="sr-only">
                <tr>
                  <th scope="col">Say</th>
                  <th scope="col">When</th>
                  <th scope="col">Where the components say it</th>
                </tr>
              </thead>
              <tbody>
                {group.words.map((w, i) => (
                  <tr key={w.say}>
                    <th scope="row" className={`${cell} w-1/5 font-semibold text-ink ${i === 0 ? 'border-t-0' : ''}`}>
                      {w.say}
                    </th>
                    <td className={`${cell} text-ink-2 ${i === 0 ? 'border-t-0' : ''}`}>
                      {w.when}
                      {w.not ? <span className="mt-1 block text-ink-muted">{w.not}</span> : null}
                    </td>
                    <td className={`${cell} w-1/3 text-ink-2 ${i === 0 ? 'border-t-0' : ''}`}>
                      <ul className="m-0 grid list-none gap-1 p-0">
                        {w.where.map((place) => (
                          <li key={place.label} className="m-0">
                            <a href={storyHref(place.title)} target="_top" className={link}>
                              {titleName(place.title)}
                            </a>
                            <span className="block text-xs">{place.label}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Every component's own wording guidance, gathered from guidance.ts. The
 * component pages show each list in its Usage section; here they are read
 * together, which is how inconsistencies between them get noticed.
 */
export function WordingByComponent() {
  const entries = Object.entries(USAGE).filter(([, usage]) => usage.content?.length)
  return (
    <div className="sb-unstyled not-prose my-6 grid gap-6 font-ui text-sm text-ink md:grid-cols-2">
      {entries.map(([title, usage]) => (
        <section key={title} className="grid content-start gap-1.5">
          <h3 className="m-0 text-base font-semibold">
            <a href={storyHref(title)} target="_top" className={link}>
              {titleName(title)}
            </a>
          </h3>
          <ul className="m-0 grid list-disc gap-1 ps-5 text-ink-2">
            {usage.content!.map((line) => (
              <li key={line}>
                <Inline text={line} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
