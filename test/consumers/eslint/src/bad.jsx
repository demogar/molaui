// Breaks the design rules on purpose: check.mjs expects each finding below.
import { Buton } from '@demogar/mola-ui'

export function RunActions({ onRun }) {
  return (
    <div className="flex gap-2">
      <button className="border rounded-[6px] px-3" onClick={onRun}>
        Run agent
      </button>
      <p style={{ color: '#333' }}>Last run 4 minutes ago</p>
      <Buton />
    </div>
  )
}
