/**
 * Pages that are not component pages: composed screens.
 *
 * A showcase (the agent console, the form example) demonstrates one layer of
 * the system working together; it documents its decisions and nothing else.
 * A pattern (`Patterns/*`) is a whole Cayuco screen meant to be copied, so it
 * has its own guidance (patterns.ts): when to use it, what it is built from,
 * where its states are and what it does for accessibility.
 *
 * Neither is held to the component page contract (usage guidance, a
 * lifecycle phase, an accessibility section and its evidence), because
 * neither is a part to pick. The test, the evidence script and the docs page
 * all ask these functions, so they cannot disagree about which pages are
 * components.
 */
export const SHOWCASES = new Set(['AI/Agent console', 'Components/Forms/Form example'])

export const isPattern = (title: string) => title.startsWith('Patterns/')

export const isShowcase = (title: string) => SHOWCASES.has(title) || isPattern(title)
