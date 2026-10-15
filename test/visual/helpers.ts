import { type Page } from '@playwright/test'

/**
 * Time is frozen so that "4 minutes ago", an elapsed-time counter or a
 * retry countdown renders the same on every run, and the simulated agent's
 * streaming is run to completion in fake time rather than raced in real time.
 */
export const NOW = new Date('2026-05-04T10:30:00Z')

/**
 * Runs fake time forward until the story stops changing, or 15 seconds of
 * it have passed (every simulated stream, countdown and enter transition is
 * shorter).
 *
 * One `runFor(15_000)` was tried first and was flaky in CI: a simulated
 * stream schedules its next token from an effect, after React re-renders,
 * and React renders on a real MessageChannel task that the fake clock does
 * not drive. In one jump only the timers already queued fire, so how far a
 * stream got depended on the machine's speed. Stepping 100ms at a time and
 * letting React's queued tasks run between steps makes every run take the
 * same path.
 *
 * "Stopped changing" compares the whole markup, not its length. Lengths were
 * tried first and let a scripted run be photographed mid-flight: while a step
 * runs, the only thing moving is an elapsed counter, and "1.2s" becoming
 * "1.3s" keeps every length the same, so a second of ticking counters read
 * as settled. Whether a status word changed inside that second depended on
 * how fast the runner committed renders, so the same story was captured at
 * 1.2s on one run and 3.4s on another. Compared in full, a running counter
 * keeps the loop going until the run reaches its end state, or until the
 * 15 seconds are up for a story that never stops.
 */
export async function settle(page: Page) {
  const flush = () =>
    page.evaluate(async () => {
      // Tasks run in order, so a message posted now runs after any render
      // React has already queued; three rounds cover a render that yields.
      for (let i = 0; i < 3; i++) {
        await new Promise<void>((resolve) => {
          const channel = new MessageChannel()
          channel.port1.onmessage = () => resolve()
          channel.port2.postMessage(null)
        })
      }
      return document.body.innerHTML
    })
  let last = await flush()
  let quiet = 0
  for (let elapsed = 0; elapsed < 15_000 && quiet < 10; elapsed += 100) {
    await page.clock.runFor(100)
    const now = await flush()
    quiet = now === last ? quiet + 1 : 0
    last = now
  }
}
