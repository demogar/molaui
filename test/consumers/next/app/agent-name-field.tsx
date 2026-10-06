'use client'

import { Field, Input } from '@demogar/mola-ui'

// Field's children is a render prop, and a function cannot cross from a
// server component into a client one, so the Field lives in a client file.
// The page around it stays a server component.
export function AgentNameField() {
  return (
    <Field label="Agent name" hint="Shown in the Cayuco run log.">
      {(control) => <Input {...control} name="name" defaultValue="Ledger reconciler" />}
    </Field>
  )
}
