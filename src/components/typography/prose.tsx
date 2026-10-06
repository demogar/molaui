import type * as React from 'react'

import { cn } from '../../lib/cn'

/**
 * The reading voice, for long-form text someone is saying to the reader — an
 * article, a run summary, a model's answer.
 *
 * ── why a model's answer is set in Alegreya ──
 * The editorial system reserved Alegreya for "where a person is talking". An
 * assistant's reply is read, not scanned: three paragraphs of reasoning set in
 * the UI grotesque look like a settings panel and are read like one, skimmed
 * for a keyword. The text face tells the reader to slow down. The rest of the
 * message — tool calls, citations, timestamps — stays in Archivo, so the
 * boundary between what the model SAID and what the system DID is drawn by the
 * typeface itself.
 *
 * It styles descendants rather than exporting a component per element because
 * this content arrives as markup (rendered markdown, CMS rich text) that no
 * caller can annotate element by element. The measure is fixed: margins absorb
 * width, the text column never does.
 *
 * Machine literals inside prose — `code`, `pre` — drop back to Martian Mono:
 * the reading voice is for language, not for identifiers. A step smaller than
 * in UI text, because Alegreya's x-height is low and mono at the usual 0.9em
 * shouts over the sentence around it.
 */
export interface ProseProps extends React.ComponentProps<'div'> {
  /** `sm` for a chat column or a side panel; `base` for a document. */
  size?: 'sm' | 'base'
  /** Let the text run the full width of its container instead of the reading measure. */
  fluid?: boolean
}

export function Prose({ size = 'base', fluid = false, className, ...props }: ProseProps) {
  return (
    <div
      data-slot="prose"
      className={cn(
        'font-text',
        size === 'sm' ? 'text-[15px] leading-[1.55]' : 'text-[17px] leading-[1.6]',
        !fluid && 'max-w-prose',
        // rhythm: one line of space between blocks, none before the first
        '[&>*]:mt-0 [&>*]:mb-0 [&>*+*]:mt-[0.85em]',
        // headings return to the system voice: they are wayfinding, not speech
        '[&_h2]:font-display [&_h2]:wdth-display [&_h2]:text-[1.3em] [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:tracking-[-0.01em] [&_*+h2]:mt-[1.5em]',
        '[&_h3]:font-display [&_h3]:wdth-display [&_h3]:text-[1.1em] [&_h3]:font-semibold [&_h3]:leading-snug [&_*+h3]:mt-[1.3em]',
        '[&_h4]:font-ui [&_h4]:rotulo [&_h4]:text-ink-2 [&_*+h4]:mt-[1.4em]',
        '[&_strong]:font-bold [&_em]:italic',
        // links are underlined: colour alone cannot be the only signal
        '[&_a]:text-rojo-deep [&_a]:underline [&_a]:decoration-rojo-rule [&_a:hover]:decoration-current',
        '[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-[1.3em] [&_ol]:ps-[1.5em] [&_li+li]:mt-[0.3em] [&_li]:ps-[0.2em]',
        '[&_ol>li]:marker:font-ui [&_ol>li]:marker:tabular [&_ol>li]:marker:text-[0.85em]',
        '[&_blockquote]:border-s-[3px] [&_blockquote]:border-oro [&_blockquote]:ps-4 [&_blockquote]:italic [&_blockquote]:text-ink-2',
        '[&_:not(pre)>code]:literal [&_:not(pre)>code]:text-[0.78em] [&_:not(pre)>code]:bg-ink-soft [&_:not(pre)>code]:px-[0.3em] [&_:not(pre)>code]:py-[0.1em]',
        '[&_pre]:literal [&_pre]:overflow-x-auto [&_pre]:bg-cloth-shade [&_pre]:p-3 [&_pre]:text-[0.8em] [&_pre]:leading-[1.6] [&_pre]:shadow-cut',
        '[&_hr]:my-[1.5em] [&_hr]:h-px [&_hr]:border-0 [&_hr]:bg-keyline',
        className,
      )}
      {...props}
    />
  )
}
