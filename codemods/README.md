# Codemods

Scripts that rewrite a consumer's code across a breaking change. The policy for when one is
written, and how, is on the [Versioning](https://demogar.github.io/molaui/?path=/docs/mola-ui-versioning--overview)
page.

| Codemod | Change | Deprecated | Removed |
| --- | --- | --- | --- |
| [`skeleton-line-to-text.ts`](skeleton-line-to-text.ts) | `<Skeleton shape="line">` → `<Skeleton shape="text">` | 0.2.0 | 1.0.0 |

Run one from a checkout of this repository against your source, with `--dry` first:

```bash
npx tsx codemods/skeleton-line-to-text.ts ../your-app/src --dry
npx tsx codemods/skeleton-line-to-text.ts ../your-app/src
```

Each codemod has a `.test.ts` beside it, run by `npm test`.
