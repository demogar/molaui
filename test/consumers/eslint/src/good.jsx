// The same screen written the Mola way: check.mjs expects no finding.
import { Button, Text } from '@demogar/mola-ui'

export function RunActions({ onRun }) {
  return (
    <div className="flex gap-2">
      <Button onClick={onRun}>Run agent</Button>
      <Text className="text-ink-2">Last run 4 minutes ago</Text>
    </div>
  )
}
