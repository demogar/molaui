import { Trash2 } from 'lucide-react'
import * as React from 'react'

import { PageHeader } from '../../components/app-shell/page-header'
import { NavItem } from '../../components/app-shell/sidebar'
import { Button } from '../../components/button'
import { AlertDialog } from '../../components/dialog'
import { Field, Input, Textarea } from '../../components/field'
import { NumberInput } from '../../components/number-input'
import { Radio, RadioGroup } from '../../components/radio'
import { Select } from '../../components/select'
import { Switch } from '../../components/switch'
import { useToast } from '../../components/toast'
import { Heading } from '../../components/typography'
import { cn } from '../../lib/cn'
import {
  MODELS,
  SAVED_SETTINGS,
  SETTINGS_PAGES,
  type SettingsErrors,
  validate,
  WORKSPACE_CONTENTS,
  type WorkspaceSettings,
} from './_data'

/**
 * Workspace settings: a long form that is saved as a whole, plus the one
 * action on the page that is not part of the form at all.
 *
 * ── one save, stated in words ──
 * Settings save together, with one button, rather than each control saving
 * itself on change. A monthly limit and the rule for what happens when it is
 * reached are one decision; saving the first before the second is chosen
 * would run the workspace, for a moment, on half of it. The bar at the foot
 * of the form says how many changes are waiting ("3 unsaved changes") — a
 * count, not a dot, so it reads the same to a screen reader, in greyscale and
 * in forced colours — and it is sticky, so Save is never a scroll away.
 *
 * The bar is always mounted, quiet when there is nothing to save. A bar that
 * appears on the first change and vanishes on save was considered and
 * rejected: pressing Save would remove the button that has focus, and focus
 * would fall to the top of the document. Save stays focusable while
 * disabled, so after saving the keyboard is exactly where it was.
 *
 * ── validation on save, cleared as you fix ──
 * Errors appear when Save is pressed, not on every keystroke — "use lowercase
 * letters" shouting while someone is half-way through typing a slug is an
 * error about a value nobody has finished. Focus goes to the first invalid
 * field, and the bar says how many need fixing. Once shown, an error is
 * re-checked as that field changes, so it disappears the moment it is fixed.
 *
 * ── leaving with unsaved changes ──
 * While the form is dirty, following any link that leaves the page — the
 * app sidebar, the settings pages, the breadcrumb — opens "Discard unsaved
 * changes?" first. The guard listens for link clicks on the document, in the
 * capture phase, rather than wrapping each link: the sidebar belongs to the
 * shell, not to this page, and on a phone it is in a portaled sheet. In a
 * product this is the router's navigation blocker; `beforeunload` covers
 * closing the tab. Links to somewhere on this page (the skip link) and to
 * this page itself do not count as leaving.
 *
 * ── the danger zone is not part of the form ──
 * Deleting the workspace happens immediately, behind its own confirm, so it
 * sits after the form and outside it: Save never deletes anything, and
 * Discard never brings anything back. The confirm names the workspace and
 * everything that goes with it, and asks for the slug to be typed, because a
 * reflexive Enter must not be able to delete eight agents.
 */

export interface SettingsPageProps {
  /** The settings as last saved. */
  saved?: WorkspaceSettings
  /** Edits already made when the page opens — for stories and tests. */
  defaultDraft?: Partial<WorkspaceSettings>
  /** Validate on mount, as if Save had been pressed. */
  defaultValidated?: boolean
  /** How long the fake save takes, in ms. */
  saveDelay?: number
}

const KEYS = Object.keys(SAVED_SETTINGS) as (keyof WorkspaceSettings)[]
const integer = new Intl.NumberFormat('en-US')

function countChanges(draft: WorkspaceSettings, saved: WorkspaceSettings) {
  return KEYS.filter((key) => draft[key] !== saved[key]).length
}

function plural(n: number, one: string, other: string) {
  return `${integer.format(n)} ${n === 1 ? one : other}`
}

export function SettingsPage({
  saved: initialSaved = SAVED_SETTINGS,
  defaultDraft,
  defaultValidated = false,
  saveDelay = 800,
}: SettingsPageProps) {
  const toast = useToast()
  const [saved, setSaved] = React.useState(initialSaved)
  const [draft, setDraft] = React.useState<WorkspaceSettings>({ ...initialSaved, ...defaultDraft })
  const [errors, setErrors] = React.useState<SettingsErrors>(() =>
    defaultValidated ? validate({ ...initialSaved, ...defaultDraft }) : {},
  )
  const [saving, setSaving] = React.useState(false)
  const [leavingTo, setLeavingTo] = React.useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const formRef = React.useRef<HTMLFormElement>(null)
  const uid = React.useId()

  const changes = countChanges(draft, saved)
  const dirty = changes > 0
  const errorCount = Object.keys(errors).length

  // Re-check only the fields already showing an error, so a message goes
  // away when it is fixed but a new one never appears mid-typing.
  const set = <K extends keyof WorkspaceSettings>(key: K, value: WorkspaceSettings[K]) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    if (errors[key]) {
      const message = validate(next)[key]
      setErrors((current) => {
        const { [key]: _gone, ...rest } = current
        return message ? { ...rest, [key]: message } : rest
      })
    }
  }

  const focusFirstInvalid = () =>
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())

  const discard = () => {
    const before = draft
    const beforeErrors = errors
    setDraft(saved)
    setErrors({})
    toast.show({
      title: 'Changes discarded',
      description: `${plural(countChanges(before, saved), 'change', 'changes')} undone.`,
      action: {
        label: 'Undo',
        onClick: () => {
          setDraft(before)
          setErrors(beforeErrors)
        },
      },
    })
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!dirty || saving) return
    const next = validate(draft)
    setErrors(next)
    if (Object.keys(next).length > 0) {
      focusFirstInvalid()
      return
    }
    setSaving(true)
    window.setTimeout(() => {
      setSaving(false)
      setSaved(draft)
      toast.success({ title: 'Settings saved', description: 'Runs started from now on use the new settings.' })
    }, saveDelay)
  }

  // The leave guard. See the doc comment: capture phase, on the document,
  // so links in the shell and in portals are covered too.
  React.useEffect(() => {
    if (!dirty) return
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
      const link = (event.target as Element | null)?.closest?.('a[href]')
      if (!(link instanceof HTMLAnchorElement)) return
      const href = link.getAttribute('href') ?? ''
      if (link.getAttribute('aria-current') === 'page') return
      if (href.startsWith('#') && href.length > 1 && document.getElementById(href.slice(1))) return
      event.preventDefault()
      event.stopPropagation()
      setLeavingTo(href)
    }
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    document.addEventListener('click', onClick, true)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      document.removeEventListener('click', onClick, true)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [dirty])

  React.useEffect(() => {
    if (defaultValidated) focusFirstInvalid()
    // Once, on mount: the story opens as if Save had just been pressed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const status = saving
    ? 'Saving…'
    : errorCount > 0
      ? `${plural(errorCount, 'field needs', 'fields need')} fixing before you can save`
      : dirty
        ? plural(changes, 'unsaved change', 'unsaved changes')
        : 'No unsaved changes'

  return (
    <div className="@container/settings min-h-full">
      <PageHeader
        breadcrumb={
          <nav aria-label="Breadcrumb" className="text-xs text-ink-muted">
            <a href="#support" className="text-ink-2 underline decoration-keyline hover:text-ink">
              {saved.name}
            </a>
            <span aria-hidden className="mx-1.5">
              /
            </span>
            <span aria-current="page">Settings</span>
          </nav>
        }
        title="Workspace settings"
        description={`Settings for everyone in ${saved.name}. Changes apply to runs started after you save.`}
      />

      <div className="grid gap-x-8 gap-y-4 px-4 pt-4 sm:px-6 @4xl/settings:grid-cols-[11rem_minmax(0,1fr)] @4xl/settings:pt-6">
        <nav aria-label="Settings" className="@4xl/settings:sticky @4xl/settings:top-6 @4xl/settings:self-start">
          <ul className="m-0 flex list-none gap-px overflow-x-auto p-0 scroll-cloth @4xl/settings:flex-col">
            {SETTINGS_PAGES.map((page) => (
              <NavItem key={page.href} href={page.href} active={page.label === 'General'} className="shrink-0">
                {page.label}
              </NavItem>
            ))}
          </ul>
        </nav>

        <div className="@container/form min-w-0 max-w-4xl">
          <form ref={formRef} noValidate onSubmit={submit} aria-label="General settings">
            <SettingsSection
              id={`${uid}-general`}
              title="Workspace"
              description="How the workspace is named and found."
            >
              <Field label="Workspace name" required error={errors.name} hint="Shown in the workspace switcher and on every run.">
                {(control) => (
                  <Input {...control} value={draft.name} onChange={(event) => set('name', event.target.value)} autoComplete="off" />
                )}
              </Field>
              <Field
                label="Slug"
                required
                error={errors.slug}
                hint="The workspace’s address in links and the API. Changing it breaks saved links."
              >
                {(control) => (
                  // A path reads left to right in any page, prefix first, so the
                  // whole control is LTR; the label and hint around it still follow the page.
                  <div dir="ltr">
                    <Input
                      {...control}
                      value={draft.slug}
                      onChange={(event) => set('slug', event.target.value)}
                      // The wrapper is `literal`, so the prefix inherits the same face and size.
                      leading={<span>workspaces/</span>}
                      className="literal"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                )}
              </Field>
              <Field label="Description" optional hint="One or two sentences for people joining the workspace.">
                {(control) => (
                  <Textarea
                    {...control}
                    rows={3}
                    autosize
                    value={draft.description}
                    onChange={(event) => set('description', event.target.value)}
                  />
                )}
              </Field>
            </SettingsSection>

            <SettingsSection
              id={`${uid}-models`}
              title="Models and limits"
              description="What new agents run on, and how much the workspace may spend."
            >
              <Field label="Default model" hint="New agents start on this model. Existing agents keep theirs.">
                {(control) => (
                  <Select
                    {...control}
                    items={MODELS.map((model) => ({ ...model, label: <span className="literal">{model.label}</span> }))}
                    value={draft.defaultModel}
                    onValueChange={(value) => value && set('defaultModel', value)}
                  />
                )}
              </Field>
              <div className="grid gap-5 @lg/form:grid-cols-2">
                <Field label="Monthly spend limit" required error={errors.monthlyLimit} hint="At least $50.">
                  {(control) => (
                    <NumberInput
                      {...control}
                      locale="en-US"
                      format={{ style: 'currency', currency: 'USD', maximumFractionDigits: 0 }}
                      min={0}
                      step={50}
                      largeStep={500}
                      value={draft.monthlyLimit}
                      onValueChange={(value) => set('monthlyLimit', value)}
                    />
                  )}
                </Field>
                <Field label="Token limit per run" required error={errors.tokensPerRun} hint="Up to 200,000.">
                  {(control) => (
                    <NumberInput
                      {...control}
                      locale="en-US"
                      unit="tokens"
                      min={1000}
                      step={1000}
                      largeStep={10000}
                      value={draft.tokensPerRun}
                      onValueChange={(value) => set('tokensPerRun', value)}
                    />
                  )}
                </Field>
              </div>
              <RadioGroup
                label="When the monthly limit is reached"
                value={draft.onLimit}
                onValueChange={(value) => set('onLimit', value as WorkspaceSettings['onLimit'])}
              >
                <Radio value="pause" label="Pause new runs" description="Runs in progress finish. New runs wait until the limit resets on the 1st." />
                <Radio value="notify" label="Keep running and notify admins" description="Spend can pass the limit until someone acts." />
              </RadioGroup>
            </SettingsSection>

            <SettingsSection
              id={`${uid}-notifications`}
              title="Notifications"
              description="Emails sent to workspace admins and agent owners."
            >
              <div className="flex flex-col divide-y divide-keyline">
                <Switch
                  labelPosition="start"
                  label="Failed runs"
                  description="Email an agent’s owner when it fails twice within an hour."
                  checked={draft.failedRunEmails}
                  onCheckedChange={(checked) => set('failedRunEmails', checked)}
                  className="pb-4"
                />
                <Switch
                  labelPosition="start"
                  label="Weekly evaluation digest"
                  description="Every Monday, each agent’s evaluation scores and how they moved."
                  checked={draft.weeklyDigest}
                  onCheckedChange={(checked) => set('weeklyDigest', checked)}
                  className="py-4"
                />
                <Switch
                  labelPosition="start"
                  label="Spend alerts"
                  description="Email admins at 80% and 100% of the monthly limit."
                  checked={draft.spendAlerts}
                  onCheckedChange={(checked) => set('spendAlerts', checked)}
                  className="pt-4"
                />
              </div>
            </SettingsSection>

            <div
              data-dirty={dirty || undefined}
              className={cn(
                'sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-3 bg-cloth-pale px-4 py-3 sm:mx-0',
                'shadow-[inset_0_1.5px_0_var(--ink)]',
                // Forced colours drop box-shadows; without an edge the fields
                // would scroll under the bar with nothing between them.
                'forced-colors:border-t-2',
              )}
            >
              <p role="status" className="m-0 flex min-w-0 flex-1 basis-full items-center gap-2 text-sm @md/form:basis-0">
                <span
                  aria-hidden
                  className={cn(
                    'size-2 shrink-0',
                    errorCount > 0 ? 'bg-rojo forced-ink' : dirty ? 'bg-oro forced-ink' : 'bg-transparent shadow-cut',
                  )}
                />
                <span
                  dir="auto"
                  className={cn(dirty ? 'font-semibold text-ink' : 'text-ink-muted', errorCount > 0 && 'text-ink-danger')}
                >
                  {status}
                </span>
              </p>
              <div className="ms-auto flex shrink-0 items-center gap-2">
                <Button type="button" variant="ghost" disabled={!dirty || saving} onClick={discard}>
                  Discard
                </Button>
                <Button type="submit" disabled={!dirty} loading={saving} focusableWhenDisabled>
                  Save changes
                </Button>
              </div>
            </div>
          </form>

          <SettingsSection
            id={`${uid}-danger`}
            title="Danger zone"
            description="Actions here take effect at once and cannot be undone."
            danger
            className="mt-6 mb-10 border-b-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <div className="min-w-0 flex-1 basis-64">
                <p className="m-0 text-sm font-semibold text-ink">Delete this workspace</p>
                <p className="mt-1 mb-0 text-sm text-ink-2">
                  Removes its {WORKSPACE_CONTENTS.agents} agents, {WORKSPACE_CONTENTS.indexes} knowledge indexes and all run
                  history, for everyone in {saved.name}.
                </p>
              </div>
              <Button variant="danger" icon={<Trash2 />} onClick={() => setDeleteOpen(true)}>
                Delete workspace
              </Button>
            </div>
          </SettingsSection>
        </div>
      </div>

      <AlertDialog
        open={leavingTo !== null}
        onOpenChange={(open) => !open && setLeavingTo(null)}
        title="Discard unsaved changes?"
        description={`You have ${plural(changes, 'unsaved change', 'unsaved changes')} to the ${saved.name} settings. Leaving this page discards ${changes === 1 ? 'it' : 'them'}.`}
        // "Discard changes" beside "Keep editing" wrapped onto two lines in
        // the small alert dialog; the title already says what is discarded.
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={() => {
          const href = leavingTo
          setDraft(saved)
          setErrors({})
          setLeavingTo(null)
          if (href) window.location.assign(href)
        }}
      />

      <AlertDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete the ${saved.name} workspace?`}
        description={`This permanently deletes ${WORKSPACE_CONTENTS.agents} agents, ${WORKSPACE_CONTENTS.indexes} knowledge indexes (${integer.format(WORKSPACE_CONTENTS.documents)} documents) and all run history. Runs in progress are cancelled. Members lose access immediately.`}
        confirmLabel="Delete workspace"
        confirmationText={saved.slug}
        onConfirm={() =>
          new Promise<void>((resolve) =>
            window.setTimeout(() => {
              toast.show({ title: `${saved.name} deleted`, description: 'Its members have been told by email.' })
              resolve()
            }, saveDelay),
          )
        }
      />
    </div>
  )
}

/**
 * A titled group of settings: heading and description on the start side,
 * the controls on a raised panel on the end side — side by side when the
 * form is wide enough, stacked when it is not. Measured on the form, not the
 * viewport, for the same reason as the agents screen: the shell's sidebar
 * decides how wide the form is.
 */
function SettingsSection({
  id,
  title,
  description,
  danger = false,
  className,
  children,
}: {
  id: string
  title: string
  description: string
  /** Cuts a rojo seam into the panel's top edge, as a destructive dialog does. */
  danger?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn(
        'grid gap-x-8 gap-y-4 border-b border-keyline py-8 first:pt-2 @2xl/form:grid-cols-[14rem_minmax(0,1fr)]',
        className,
      )}
    >
      <div className="min-w-0">
        <Heading level={2} size={3} id={id}>
          {title}
        </Heading>
        <p className="mt-1.5 mb-0 text-sm text-ink-2">{description}</p>
      </div>
      <div className="min-w-0 bg-cloth-pale shadow-cut">
        {danger ? <div aria-hidden className="relleno h-2 band-rojo" /> : null}
        <div className="flex flex-col gap-5 p-5">{children}</div>
      </div>
    </section>
  )
}
