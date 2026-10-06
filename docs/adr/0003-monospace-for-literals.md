# 0003 — A monospace returns, for machine literals only

**Date:** 2026-10-05 · **Status:** accepted

## Context

The editorial system removed monospace entirely: small tracked mono labels are one of the
loudest tells of templated design, and tabular figures in Archivo did the job mono had been doing
for numbers.

An AI platform shows things a travel guide never did: JSON tool arguments, run ids, hashes, model
identifiers, stack traces. These are *inspected*, character by character. In a proportional face
`l`, `1` and `I` collide, `0` and `O` collide, and columns of ids do not align.

## Decision

Martian Mono, narrowed on its width axis to 87.5 so payloads wrap less, a step smaller than the
surrounding text, ligatures off (`!=` must read as two characters). Exposed only as the `literal`
utility and through `Code` / `CodeBlock`.

It is **never** a label, a heading, a button or a table number. Labels stay in the Archivo rótulo
register; numbers stay tabular Archivo.

## Consequences

Three voices with three jobs: the system (Archivo), the reader (Alegreya), the machine (Martian
Mono). A screen can be read for *who is speaking* from the typeface alone — which is exactly what
an agent transcript needs.
