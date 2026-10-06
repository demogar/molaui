// A server component: no 'use client'.
//
// The namespace import is deliberate. With named imports the bundler drops
// every re-export the page does not use (the package marks its JS free of
// side effects), so a broken module elsewhere in the barrel would never run
// here and the build would pass. Reading the namespace keeps all of them, so
// every module the package root re-exports is evaluated on the server, and
// one that runs client-only React at module level (a createContext) without
// its own 'use client' fails this build. Stat is rendered for the other half:
// a component that reads context, which only works as a client component.
import * as mola from '@demogar/mola-ui'

import { AgentNameField } from './agent-name-field'

const { Badge, Button, Dialog, DialogContent, Stat } = mola

export default function Page() {
  return (
    <main data-exports={Object.keys(mola).length}>
      <Badge tone="success">Running</Badge>
      <Stat label="Runs today" value="128" />
      <AgentNameField />
      <Button>Run agent</Button>
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
