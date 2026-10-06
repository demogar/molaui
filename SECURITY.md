# Security Policy

Mola UI renders text that a model or a user wrote — streamed answers, tool-call
arguments, citations — inside other people's applications, so we take security
reports seriously.

## Supported versions

Until 1.0, only the latest release gets security fixes.

## Reporting a vulnerability

**Do not open a public issue.** Report it privately with GitHub's
[private vulnerability reporting](https://github.com/demogar/molaui/security/advisories/new).

Please include:

- what an attacker can do and under which conditions,
- steps or a minimal proof of concept to reproduce it,
- the affected version or commit.

You can expect an acknowledgement within 3 business days and a status update
within 10. Once a fix is released, we will credit you in the advisory unless
you prefer otherwise.

## Scope

Of particular interest: model or user text that escapes into markup or script
(the streaming-text parser, JSON highlighting, message and tool-call rendering
are meant to produce React elements only, never HTML), link and citation
`href`s that allow `javascript:` or other unsafe schemes, approval UI that can
be spoofed or bypassed so an action looks approved when it was not, and
anything in the published package that reaches the network or the consumer's
storage.

Out of scope: the Storybook demo data, which is fictional, and issues in
dependencies that are not reachable through Mola UI — report those upstream.
