# Codemods

Scripts that rewrite a consumer's code across a breaking change. Every codemod, with the release
that deprecated what it migrates and the release that removes it, is listed on the
[Codemods](https://demogar.github.io/molaui/?path=/docs/mola-ui-codemods--overview) page. The
policy for when one is written, and how, is on the
[Versioning](https://demogar.github.io/molaui/?path=/docs/mola-ui-versioning--overview) page.

Run one from a checkout of this repository against your source, with `--dry` first:

```bash
npx tsx codemods/skeleton-line-to-text.ts ../your-app/src --dry
npx tsx codemods/skeleton-line-to-text.ts ../your-app/src
npx tsx codemods/prop-vocabulary.ts ../your-app/src --dry
```

Each codemod exports a `meta` record (what it changes, the `deprecate()` id it migrates, and the
versions) and has a `.test.ts` beside it, run by `npm test`. `index.test.ts` fails if the
Codemods page, a codemod's `meta` and the library's `deprecate()` call disagree.
