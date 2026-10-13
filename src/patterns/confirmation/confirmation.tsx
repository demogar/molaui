import { CircleAlert, Plus } from 'lucide-react'
import * as React from 'react'

import { PageHeader } from '../../components/app-shell/page-header'
import { Badge } from '../../components/badge'
import { Breadcrumb } from '../../components/breadcrumb'
import { Button } from '../../components/button'
import { Callout } from '../../components/callout'
import { Code } from '../../components/code'
import { AlertDialog } from '../../components/dialog'
import { EmptyState } from '../../components/empty-state'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/table'
import { useToast } from '../../components/toast'
import { ADMINS, API_KEYS, type ApiKey } from './_data'

/**
 * Revoking an API key: a destructive action that cannot be undone, that
 * takes a round trip to the server, and that can fail. The settings page
 * pattern already shows a confirm that succeeds; this one is about the parts
 * a happy-path confirm leaves out.
 *
 * ── the friction matches the damage ──
 * Every revoke asks first, because nothing brings a key back. A live key
 * also asks for its name to be typed: it is the one whose revocation breaks
 * a customer-facing service, and a muscle-memory Enter on the wrong row is
 * the mistake the typing prevents. A test key does not, because asking
 * everyone to type for everything teaches them to type without reading.
 *
 * The question names the key, and the description says what stops working,
 * by name ("the chat widget on every customer page"), not "this action
 * cannot be undone" alone. Cancel has focus when the dialog opens, and the
 * confirm button repeats the verb: "Revoke key", never "OK".
 *
 * ── pending, then one of two endings ──
 * While the request is in flight, AlertDialog shows the confirm's working
 * strip and refuses both buttons and Escape, so the answer cannot be
 * changed halfway. If the request succeeds, the dialog closes and a toast
 * says what happened; if it fails, the dialog stays open where the operator
 * acted, with the failure in words and the key's state unchanged ("Not
 * revoked"), and the same button tries again.
 *
 * AlertDialog has no slot for an error: it promises to stay open on a
 * rejected promise but leaves the caller to say why. The failure goes in its
 * description, which is the dialog's accessible description, as a
 * `role="alert"` line so it is announced when it appears. A dedicated
 * `error` prop would be better, and is noted on the pattern's page instead of
 * being worked around here.
 *
 * ── where focus goes afterwards ──
 * On close, Base UI returns focus to the button that opened the dialog. So
 * a revoked key's row keeps its Revoke button, disabled and still focusable,
 * rather than removing it: a removed button would drop focus to the top of
 * the document, and AlertDialog does not expose Base UI's `finalFocus` to
 * send it anywhere else. The row's state badge and the toast say it is done.
 * Revoked keys stay listed for 30 days, as an audit trail, which is also why
 * the button has somewhere to stay.
 */

export interface ApiKeysScreenProps {
  keys?: ApiKey[]
  /** Only admins can revoke; members see the list and who to ask. */
  canRevoke?: boolean
  /** The request. Rejects with an Error whose message is shown in the dialog. */
  revoke?: (key: ApiKey) => Promise<void>
  /** Open with the confirmation for this key already showing. */
  defaultConfirmingId?: string
  /** Open with this failure already in the dialog. */
  defaultError?: string
}

const ENV_LABEL = { live: 'Live', test: 'Test' } as const

function ago(minutes: number | null) {
  if (minutes === null) return 'Never'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / (24 * 60))}d ago`
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export function ApiKeysScreen({
  keys: initialKeys = API_KEYS,
  canRevoke = true,
  revoke = () => wait(900),
  defaultConfirmingId,
  defaultError,
}: ApiKeysScreenProps) {
  const [keys, setKeys] = React.useState(initialKeys)
  // Which key, and whether the dialog is open, are kept apart so the dialog
  // keeps its words while it animates closed.
  const [confirmingId, setConfirmingId] = React.useState<string | null>(defaultConfirmingId ?? null)
  const [open, setOpen] = React.useState(defaultConfirmingId !== undefined)
  const [error, setError] = React.useState<string | null>(defaultError ?? null)
  const toast = useToast()
  const uid = React.useId()
  const headingId = `${uid}-heading`

  const target = keys.find((key) => key.id === confirmingId) ?? null
  const active = keys.filter((key) => key.state === 'active').length

  const confirm = async () => {
    if (!target) return
    setError(null)
    try {
      await revoke(target)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The request failed.')
      // Rethrown so AlertDialog stays open: the failure belongs where the operator acted.
      throw cause
    }
    setKeys((all) => all.map((key) => (key.id === target.id ? { ...key, state: 'revoked' } : key)))
    toast.show({
      tone: 'success',
      title: `${target.name} revoked`,
      description: `Requests with ${target.hint} are refused from now on.`,
    })
  }

  return (
    <>
      <PageHeader
        breadcrumb={<Breadcrumb items={[{ label: 'Settings', href: '#settings' }, { label: 'API keys' }]} />}
        title="API keys"
        description="Keys let services outside Cayuco call the Support workspace. Revoked keys stay listed for 30 days."
        actions={canRevoke ? <Button icon={<Plus />}>Create key</Button> : undefined}
      />
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {!canRevoke ? (
          <Callout tone="info" variant="flat" headingLevel={2} title="Only workspace admins can create or revoke keys">
            Ask {ADMINS.join(' or ')} if a key needs revoking.
          </Callout>
        ) : null}
        {keys.length === 0 ? (
          <EmptyState
            size="lg"
            headingLevel={2}
            title="No API keys yet"
            description="Create a key for each service that calls Cayuco, so one can be revoked without breaking the others."
            actions={canRevoke ? <Button icon={<Plus />}>Create key</Button> : undefined}
          />
        ) : (
          <section aria-labelledby={headingId} className="grid gap-3">
            <h2 id={headingId} className="m-0 font-ui text-base font-bold text-ink">
              {active} active {active === 1 ? 'key' : 'keys'}
            </h2>
            <Table framed aria-labelledby={headingId} className="min-w-[44rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Created by</TableHead>
                  <TableHead>Last used</TableHead>
                  <TableHead>Status</TableHead>
                  {canRevoke ? (
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => {
                  const revoked = key.state === 'revoked'
                  return (
                    <TableRow key={key.id}>
                      <TableCell>
                        <span className="font-medium">{key.name}</span>
                        <Badge tone={key.environment === 'live' ? 'accent' : 'neutral'} variant="soft" className="ms-2">
                          {ENV_LABEL[key.environment]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Code>{key.hint}</Code>
                      </TableCell>
                      <TableCell className="text-ink-2">{key.createdBy}</TableCell>
                      <TableCell className="text-ink-muted">{ago(key.lastUsedMinutesAgo)}</TableCell>
                      <TableCell>
                        <Badge tone={revoked ? 'neutral' : 'success'} dot>
                          {revoked ? 'Revoked' : 'Active'}
                        </Badge>
                      </TableCell>
                      {canRevoke ? (
                        <TableCell className="text-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            aria-label={`Revoke ${key.name}`}
                            disabled={revoked}
                            focusableWhenDisabled
                            onClick={() => {
                              setError(null)
                              setConfirmingId(key.id)
                              setOpen(true)
                            }}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </section>
        )}
      </div>

      <AlertDialog
        open={open && target !== null}
        onOpenChange={setOpen}
        title={target ? `Revoke ${target.name}?` : ''}
        description={
          target ? (
            <>
              {target.usedBy} stops working at once: every request with <Code>{target.hint}</Code> is refused. A
              revoked key cannot be restored; you would create a new one and update each service that used it.
              {error ? (
                <span role="alert" className="mt-3 flex gap-2 font-semibold text-danger">
                  <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={2.5} />
                  <span>
                    Not revoked. {error} The key still works. Try again, or cancel and check the key’s status later.
                  </span>
                </span>
              ) : null}
            </>
          ) : (
            ''
          )
        }
        confirmLabel="Revoke key"
        confirmationText={target?.environment === 'live' ? target.name : undefined}
        onConfirm={confirm}
      />
    </>
  )
}
