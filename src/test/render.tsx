import { configure } from '@testing-library/react'

/**
 * Testing Library, rendered in React strict mode.
 *
 * The Next.js consumer runs strict mode in development, and so does the
 * Storybook (`strictMode` in .storybook/main.ts), so a component that breaks
 * when React mounts, unmounts and remounts it — a timer started in render, an
 * effect that is not cleaned up, a stream that restarts — breaks for real
 * users. Without this, every test rendered once and none of that showed.
 *
 * `configure({ reactStrictMode: true })` applies to `render` and `renderHook`
 * alike, so this module re-exports Testing Library unchanged rather than
 * wrapping each function (a hand-written wrapper would also have to wrap
 * `rerender` and forward `wrapper`). ESLint forbids importing
 * `@testing-library/react` anywhere else, so a test cannot quietly go back to a
 * non-strict render.
 */
configure({ reactStrictMode: true })

export * from '@testing-library/react'
