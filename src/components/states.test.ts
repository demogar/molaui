import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { found } from '../test/found'

/**
 * The state vocabulary (Foundations/Layers, docs/adr/0015-pressed-is-ink.md),
 * held where the classes are written. The Button `States` story shows it for
 * one component; this holds every component to the same words, so a new cut
 * control cannot ship with a hover and no pressed step, and a disabled control
 * cannot go back to the ground that read as an empty frame in dark.
 */
const root = resolve(import.meta.dirname)
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '_story-data' ? [] : walk(path)
    return /\.tsx?$/.test(name) && !/\.(stories|test)\.tsx?$/.test(name) ? [path] : []
  })
}
const files = found(walk(root), 60, 'component sources')
const read = (file: string) => readFileSync(file, 'utf8')

/**
 * Text fields reveal the band on hover too, but nobody presses a text field:
 * the caret and the focus ring are its response.
 */
const NOT_PRESSED = new Set(['field/field-control.ts', 'time-picker/time-picker.tsx'])

describe('state vocabulary', () => {
  it('every cut shape that reveals its band on hover closes it with ink when pressed', () => {
    const hovering = files.filter((f) => /hover:(?:[\w-]+:)*cut-band/.test(read(f)))
    expect(hovering.length).toBeGreaterThan(5)
    const missing = hovering
      .map((f) => relative(root, f))
      .filter((f) => !NOT_PRESSED.has(f))
      .filter((f) => !/(?:active|data-dragging):(?:[\w-]+:)*band-ink/.test(read(join(root, f))))
    expect(missing).toEqual([])
  })

  it('every disabled control stands on --disabled, not the shade that vanished in dark', () => {
    const shaded = files
      .filter((f) => /disabled:(?:[\w-]+:)*bg-cloth-shade|disabled\s*(?:&&|\?)\s*'bg-cloth-shade/.test(read(f)))
      .map((f) => relative(root, f))
    expect(shaded).toEqual([])
  })
})
