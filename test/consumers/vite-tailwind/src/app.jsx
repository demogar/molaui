import { Badge, Button, Dialog, DialogContent, Field, Input } from '@demogar/mola-ui'

// The same things in every fixture, so the runner checks one page shape.
export function App() {
  return (
    <main>
      <Badge tone="success">Running</Badge>
      <Field label="Agent name" hint="Shown in the Cayuco run log.">
        {(control) => <Input {...control} name="name" defaultValue="Ledger reconciler" />}
      </Field>
      <Button>Run agent</Button>
      {/* A nested theme in each direction: the runner checks they paint different grounds. */}
      <section data-theme="dark" data-probe="dark">Dark panel</section>
      <section data-theme="light" data-probe="light">Light panel</section>
      <Dialog defaultOpen>
        <DialogContent
          title="Publish the run report?"
          description="The Cayuco team sees it in their weekly digest."
          footer={<Button>Publish</Button>}
        >
          Three runs finished, one is still waiting on approval.
        </DialogContent>
      </Dialog>
    </main>
  )
}
