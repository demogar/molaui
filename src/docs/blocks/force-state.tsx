import * as React from 'react'

/**
 * Shows a pseudo-class state without a pointer, so a story can put hover,
 * pressed and focus side by side and the visual tests can hold all of them in
 * one screenshot.
 *
 * A story can only pass classes, and passing `cut-band band-ink` to the
 * "pressed" button would photograph the story's guess at the pressed state,
 * not the component's: a regression in button.tsx would still show the right
 * picture. So this copies the component's own rules instead. Every style rule
 * whose selector names `:hover`, `:active` or `:focus-visible` is inserted
 * again right after itself, in the same `@layer` and `@media`, with the
 * pseudo-class widened to "or inside an element marked `data-force-state`". The
 * copy sits beside the original, so it wins and loses exactly where the
 * original would. storybook-addon-pseudo-states does the same thing; this is
 * the forty lines of it the system needs, without another dependency to pin.
 */
export type ForcedState = 'hover' | 'active' | 'focus-visible'

const PSEUDO = /:(hover|active|focus-visible)(?![\w-])/g
const done = new WeakSet<CSSStyleSheet>()

type RuleParent = CSSStyleSheet | CSSGroupingRule

function copyForced(parent: RuleParent) {
  let rules: CSSRuleList
  try {
    rules = parent.cssRules
  } catch {
    // A cross-origin sheet (the web fonts) cannot be read, and has no states.
    return
  }
  for (let i = rules.length - 1; i >= 0; i--) {
    const rule = rules[i]
    if (!rule) continue
    if (rule instanceof CSSStyleRule) {
      // A nested rule (`&:focus-visible` inside a utility, if the build keeps
      // nesting) is a child of its style rule.
      if ((rule as unknown as CSSGroupingRule).cssRules?.length) copyForced(rule as unknown as CSSGroupingRule)
      const plain = rule.selectorText.includes('data-force-state') || !PSEUDO.test(rule.selectorText)
      PSEUDO.lastIndex = 0
      if (plain) continue
      const selector = rule.selectorText.replace(
        PSEUDO,
        // The real pseudo-class stays as an alternative: a rule for two states
        // at once (`:active:focus-visible`, a pressed button that is also
        // focused) must still match when one is forced and the other real.
        (_, state: string) => `:is(:${state}, [data-force-state~="${state}"], [data-force-state~="${state}"] *)`,
      )
      try {
        parent.insertRule(`${selector}{${rule.style.cssText}}`, i + 1)
      } catch {
        // A selector this browser cannot parse once rewritten is left alone.
      }
    } else if ('cssRules' in rule) {
      copyForced(rule as CSSGroupingRule)
    }
  }
}

function forceStates() {
  if (typeof document === 'undefined') return
  for (const sheet of Array.from(document.styleSheets)) {
    if (done.has(sheet)) continue
    done.add(sheet)
    copyForced(sheet)
  }
}

export interface ForceStateProps {
  /** The pseudo-classes to show. A press is a hover too, so pressed passes both. */
  state: ForcedState | ForcedState[]
  children: React.ReactNode
}

/** Renders its children as if they were in `state`. Storybook only. */
export function ForceState({ state, children }: ForceStateProps) {
  // Before paint, so the first frame a screenshot can catch is already forced.
  React.useLayoutEffect(forceStates, [])
  return (
    <span data-force-state={([] as ForcedState[]).concat(state).join(' ')} className="contents">
      {children}
    </span>
  )
}
