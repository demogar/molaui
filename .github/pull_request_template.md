<!-- The PR title becomes the squash commit on main. Use Conventional Commits:
     feat(button): lowercase subject  |  fix(tokens): ...  |  docs(adr): ...   -->

## What and why

<!-- What changes, and the problem it solves. Link the issue: Closes #123 -->

## How it was verified

<!-- Commands you ran and what they showed. For visual changes, name the stories
     you checked and in which theme and density; attach before/after screenshots
     (node scripts/shoot.mjs). -->

- [ ] `npm run check` passes locally
- [ ] Every new state has a story (stories are axe-tested)
- [ ] Checked in light and dark, and at compact density, if it changes anything visual
- [ ] New colour tokens have a contrast pairing in `contract.test.ts` and an entry in `cn.ts`
- [ ] Docs / ADRs updated if a design decision changed
- [ ] No real company names, branding, secrets or personal data in stories, fixtures or screenshots
