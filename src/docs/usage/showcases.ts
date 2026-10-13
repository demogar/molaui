/**
 * Composed screens document their decisions, not when to use them: they are
 * the answer to "how do these fit together", not a part to pick. So they are
 * exempt from the component page contract (usage guidance, a lifecycle phase,
 * an accessibility section and its evidence). The test, the evidence script
 * and the docs page all ask this one function, so they cannot disagree about
 * which pages are components.
 */
const SHOWCASES = new Set(['AI/Agent console', 'Components/Forms/Form example'])

export const isShowcase = (title: string) => SHOWCASES.has(title) || title.startsWith('Patterns/')
