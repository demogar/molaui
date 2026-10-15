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

// Both are Getting started's own code blocks, written here by
// scripts/consumers.mjs, and so is the root layout around this page.
import { AgentNameField } from '../snippets/agent-name-field'
import { ThemeSwitcher } from '../snippets/theme-switcher'

const { Badge, Button, Dialog, DialogContent, Stat } = mola

export default function Page() {
  return (
    <main data-exports={Object.keys(mola).length}>
      <ThemeSwitcher />
      <Badge tone="success">Running</Badge>
      <Stat label="Runs today" value="128" />
      <AgentNameField />
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
