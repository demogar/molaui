import { BookOpen, Check, CircleDashed, Dot, Gauge, Plus, TriangleAlert, Wrench } from 'lucide-react'
import type * as React from 'react'

import pkg from '../../../package.json'
import { Badge, type BadgeTone } from '../../components/badge'
import { Code } from '../../components/code'
import { RELEASES } from '../usage/changelog-source'
import { type ChangeEntry, type ChangeType, isReleased, pagesFor } from '../usage/changes'
import type { PageData } from '../usage/contract'
import { storyHref } from '../usage/links'
import { whatsNewFor } from '../usage/whats-new'
import { titleName } from './usage'

/**
 * Changes from CHANGELOG.md: the last section of a component page, and the
 * status and full list on each What's new page. Every block reads RELEASES,
 * which is the `?raw` import of the file release-please writes, so nothing
 * here can say something the Changelog page does not.
 *
 * Every block carries `sb-unstyled`, because Storybook's docs styles are
 * unlayered and would beat every Tailwind utility on these elements.
 */

type Kind = ChangeType | 'breaking'

const LOOK: Record<Kind, { label: string; tone: BadgeTone; Glyph: typeof Check }> = {
  breaking: { label: 'Breaking', tone: 'danger', Glyph: TriangleAlert },
  feature: { label: 'Feature', tone: 'info', Glyph: Plus },
  fix: { label: 'Fix', tone: 'success', Glyph: Wrench },
  performance: { label: 'Performance', tone: 'neutral', Glyph: Gauge },
  docs: { label: 'Docs', tone: 'neutral', Glyph: BookOpen },
  other: { label: 'Other', tone: 'neutral', Glyph: Dot },
}

const kindOf = (entry: ChangeEntry): Kind => (entry.breaking ? 'breaking' : entry.type)

/** The type as glyph, word and tone, never the tone alone, the rule the components follow. */
export function ChangeTypeBadge({ entry }: { entry: ChangeEntry }) {
  const kind = kindOf(entry)
  const { label, tone, Glyph } = LOOK[kind]
  return (
    <Badge tone={tone} variant="soft" data-change-type={kind}>
      <Glyph aria-hidden className="size-3.5" strokeWidth={2.5} />
      {label}
    </Badge>
  )
}

// A fixed locale and UTC, so the date reads the same on the server, in CI's
// screenshots and in every reader's browser.
const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

export function ReleaseDate({ date }: { date: string }) {
  return <time dateTime={date}>{DATE.format(new Date(`${date}T00:00:00Z`))}</time>
}

function Subject({ text }: { text: string }) {
  return (
    <>
      {text.split(/`([^`]+)`/).map((part, i) => (i % 2 ? <Code key={i}>{part}</Code> : part))}
    </>
  )
}

const link = 'text-ink underline underline-offset-2'

function Version({ version }: { version: string }) {
  const page = whatsNewFor(version)
  return page ? (
    <a href={storyHref(page)} target="_top" className={link}>
      {version}
    </a>
  ) : (
    <>{version}</>
  )
}

/**
 * One line per entry: the type, the subject, then where it came from. The
 * provenance line ends in the pull request and the commit, the two places a
 * reader goes to see what actually changed.
 */
function ChangeItem({ entry, showVersion, showPages }: { entry: ChangeEntry; showVersion: boolean; showPages: boolean }) {
  const pages = showPages ? pagesFor(entry) : []
  return (
    <li className="grid gap-1 border-b border-keyline py-3 first:pt-0 last:border-b-0">
      <p className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ink">
        <ChangeTypeBadge entry={entry} />
        <span>
          <Subject text={entry.subject} />
        </span>
      </p>
      <p className="m-0 text-ink-muted">
        {[
          showVersion ? (
            <span key="version">
              <Version version={entry.version} />
              {entry.date ? (
                <>
                  , <ReleaseDate date={entry.date} />
                </>
              ) : null}
            </span>
          ) : null,
          pages.length ? (
            <span key="pages">
              On{' '}
              {pages.map((title, i) => (
                <span key={title}>
                  {i === 0 ? '' : i === pages.length - 1 ? ' and ' : ', '}
                  <a href={storyHref(title)} target="_top" className={link}>
                    {titleName(title)}
                  </a>
                </span>
              ))}
            </span>
          ) : null,
          entry.pr ? (
            <a key="pr" href={entry.pr.url} className={link}>
              Pull request #{entry.pr.number}
            </a>
          ) : null,
          entry.commit ? (
            <a key="commit" href={entry.commit.url} className={link}>
              Commit <span className="font-mono text-xs">{entry.commit.sha}</span>
            </a>
          ) : null,
        ]
          .filter(Boolean)
          .map((item, i) => (
            <span key={i}>
              {i ? <span aria-hidden> · </span> : null}
              {item}
            </span>
          ))}
      </p>
    </li>
  )
}

function ChangeList({ entries, showVersion, showPages }: { entries: ChangeEntry[]; showVersion: boolean; showPages: boolean }) {
  return (
    <ul className="m-0 grid list-none p-0">
      {entries.map((entry, i) => (
        <ChangeItem key={`${entry.version}-${entry.commit?.sha ?? i}`} entry={entry} showVersion={showVersion} showPages={showPages} />
      ))}
    </ul>
  )
}

/** The Changes section of a component page. Nothing at all when it has no entries. */
export function ChangesSection({ page }: { page: PageData }) {
  if (!page.changes.length) return null
  return (
    <section data-changes className="sb-unstyled not-prose my-10 grid gap-4 font-ui text-sm text-ink">
      <h2 className="m-0 text-xl font-bold text-ink">Changes</h2>
      <p className="m-0 text-ink-2">
        Read from the{' '}
        <a href="?path=/docs/mola-ui-changelog--overview" target="_top" className={link}>
          Changelog
        </a>{' '}
        by the scope of each commit, newest first. Changes to the whole system, such as tokens and theming, are only
        listed there.
      </p>
      <ChangeList entries={page.changes} showVersion showPages={false} />
    </section>
  )
}

function Status({ children }: { children: React.ReactNode }) {
  return (
    <section data-release-status className="sb-unstyled not-prose my-6 grid gap-2 font-ui text-sm text-ink">
      {children}
    </section>
  )
}

/**
 * Released or not, from package.json: release-please bumps the version and
 * writes CHANGELOG.md in the same commit, so a page drafted ahead of its
 * release flips the day it ships, with its date and compare link, and no one
 * has to remember to edit it.
 */
export function ReleaseStatus({ version }: { version: string }) {
  const release = RELEASES.find((r) => r.version === version)
  if (isReleased(version, pkg.version) && release) {
    return (
      <Status>
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink-2">
          <Badge tone="success" variant="soft" data-release="released">
            <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
            Released
          </Badge>
          <span>
            Version {version}
            {release.date ? (
              <>
                , <ReleaseDate date={release.date} />
              </>
            ) : null}
            .{' '}
            {release.compareUrl ? (
              <a href={release.compareUrl} className={link}>
                Every commit since the last release
              </a>
            ) : null}
          </span>
        </p>
      </Status>
    )
  }
  return (
    <Status>
      <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-ink-2">
        <Badge tone="warn" variant="soft" data-release="unreleased">
          <CircleDashed aria-hidden className="size-3.5" strokeWidth={2.5} />
          Unreleased
        </Badge>
        <span>
          Not on npm yet: the current version is {pkg.version}. Drafted from the open release pull request, so it can
          still change before {version} is tagged.
        </span>
      </p>
    </Status>
  )
}

/**
 * Everything in a release, from the changelog, with the component pages each
 * entry landed on. Before the release it says where the list will come from,
 * rather than repeating a draft.
 */
export function ReleaseChanges({ version }: { version: string }) {
  const release = RELEASES.find((r) => r.version === version)
  if (!isReleased(version, pkg.version) || !release) {
    return (
      <p className="sb-unstyled not-prose m-0 font-ui text-sm text-ink-2">
        The full list appears here, from the changelog, once {version} is released.
      </p>
    )
  }
  return (
    <div data-release-changes className="sb-unstyled not-prose grid gap-4 font-ui text-sm text-ink">
      <ChangeList entries={release.entries} showVersion={false} showPages />
    </div>
  )
}
