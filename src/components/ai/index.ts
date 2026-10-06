/**
 * Mola UI — the AI-native interface layer.
 *
 * Components for the surfaces a model-backed product needs and a classic
 * component library does not have: streaming output, long-running agent runs,
 * tool calls, human approval, sources and uncertainty. Seven rules hold the
 * set together. Each one exists because the opposite is what ships by default.
 *
 * 1. THREE VOICES, THREE JOBS. The model's prose is set in Alegreya, the
 *    reading face, because it is read. What the machine DID — tool names,
 *    arguments, results, run ids, model ids — is a Martian Mono literal,
 *    because it is inspected and pasted into tickets. The chrome is Archivo.
 *    A reader can tell from the letterforms whether they are looking at the
 *    model talking, the model acting, or the product.
 *
 * 2. STATE IS NEVER COLOUR ALONE. Every status is glyph + word + colour, and
 *    the glyphs differ in shape. (`RunStatus`)
 *
 * 3. LATENCY IS A CLOCK, NOT A PERCENTAGE. Model work has no knowable total.
 *    Elapsed time keeps counting, in tabular figures that tick in place; no
 *    progress bar invents a 90% and stalls there. (`useElapsed`)
 *
 * 4. UNKNOWN DURATION IS WORKING RELLENO. The system's indeterminate state is
 *    its own divider texture, sliding — on a step, a tool call, a button.
 *    Never a spinner.
 *
 * 5. FAILURE IS A FIRST-CLASS STATE. A failed call opens itself, says what
 *    happened in a sentence, shows the error verbatim as a literal, and puts
 *    Retry next to it. Content that arrived before the failure stays.
 *
 * 6. STREAMING DOES NOT MOVE THE PAGE UNDER YOU. Text only grows at its end;
 *    the caret is fixed-width; the transcript follows new output only while
 *    the reader is at the bottom, and offers "Jump to latest" otherwise.
 *
 * 7. ANNOUNCE COMPLETION, NOT TOKENS. Nothing that streams is a live region.
 *    Streaming text is `aria-busy`; one polite status says "Response
 *    complete." Runs announce their own status changes, not each step.
 *
 * And one about trust: uncertainty is coarse and in words (`Confidence`
 * has three levels, never "87.3%"), every claim can be traced to a numbered
 * source in one click (`Citation`, `SourceList`), and a call that writes to
 * the world waits for a person, with Approve and Deny given equal weight
 * (`ToolCall` with `approval`).
 */
export * from './agent-run'
export * from './confidence'
export * from './message'
export * from './prompt-input'
export * from './reasoning'
export * from './run-error'
export * from './run-status'
export * from './sources'
export * from './streaming-text'
export * from './token-usage'
export * from './tool-call'
