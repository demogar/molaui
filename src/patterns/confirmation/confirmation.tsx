import { Plus } from 'lucide-react'
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
 * The failure goes in AlertDialog's `error`, which sits over the buttons,
 * is announced once, and is linked to Revoke key. The screen keeps the
 * message in its own state and clears it when the dialog opens for another
 * key, so one key's failure is never shown under another key's question.
 *
 * ── where focus goes afterwards ──
 * Cancel or Escape returns focus to the row's Revoke button, Base UI's
 * default. A revoke that succeeds removes that button, because a revoked key
 * has nothing left to revoke; its row stays for 30 days as an audit trail,
 * with its state in words. So AlertDialog's `finalFocus` sends focus to the
 * next active key's Revoke button, or the previous one at the end of the
 * list, where the reader would carry on from. With none left it goes
 * to the heading, which now reads "0 active keys". Without it focus would
 * drop to the top of the document.
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
  const headingRef = React.useRef<HTMLHeadingElement>(null)
  const revokeButtons = React.useRef(new Map<string, HTMLButtonElement>())
  // Set only by a revoke that succeeded; read once, when the dialog closes.
  const focusAfterRevoke = React.useRef<string | null>(null)

  const target = keys.find((key) => key.id === confirmingId) ?? null
  const active = keys.filter((key) => key.state === 'active').length

  const finalFocus = () => {
    const next = focusAfterRevoke.current
    focusAfterRevoke.current = null
    if (next === null) return true
    const button = next === 'heading' ? undefined : revokeButtons.current.get(next)
    return button ?? headingRef.current ?? true
  }

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
    const index = keys.findIndex((key) => key.id === target.id)
    const isActive = (key: ApiKey | undefined) => key !== undefined && key.state === 'active' && key.id !== target.id
    const next = keys.slice(index + 1).find(isActive) ?? keys.slice(0, index).reverse().find(isActive)
    focusAfterRevoke.current = next?.id ?? 'heading'
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
            <h2 ref={headingRef} id={headingId} tabIndex={-1} className="m-0 font-ui text-base font-bold text-ink">
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
                          {revoked ? null : (
                            <Button
                              ref={(node) => {
                                if (node) revokeButtons.current.set(key.id, node)
                                else revokeButtons.current.delete(key.id)
                              }}
                              size="sm"
                              variant="secondary"
                              aria-label={`Revoke ${key.name}`}
                              onClick={() => {
                                setError(null)
                                setConfirmingId(key.id)
                                setOpen(true)
                              }}
                            >
                              Revoke
                            </Button>
                          )}
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
            </>
          ) : (
            ''
          )
        }
        error={
          error
            ? `Not revoked. ${error} The key still works. Try again, or cancel and check the key’s status later.`
            : undefined
        }
        finalFocus={finalFocus}
        confirmLabel="Revoke key"
        confirmationText={target?.environment === 'live' ? target.name : undefined}
        onConfirm={confirm}
      />
    </>
  )
}
