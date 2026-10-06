/**
 * The introduction's title panel. A component rather than inline MDX because
 * MDX wraps loose text in its own styled paragraphs, and Storybook's docs
 * styles are unlayered — they beat every utility in @layer, whatever its
 * specificity. `sb-unstyled` opts the subtree out of them.
 */
export function Hero() {
  return (
    <div className="sb-unstyled not-prose mb-12" data-theme="light">
      <div className="on-ink px-8 pt-14 pb-10 sm:px-12">
        <p className="m-0 font-display text-[clamp(56px,9vw,112px)]/[0.95] font-extrabold tracking-display wdth-display text-on-ink">
          <span className="display-cut band-oro text-ink">Mola</span> UI
        </p>
        <p className="mt-8 mb-0 max-w-[34rem] font-text text-xl/[1.4] text-on-ink">
          A design system cut like a mola: flat layers, hard keylines, revealed bands. Built for the
          dense, technical tools experts use all day — and for the interfaces that sit between those
          experts and their agents.
        </p>
        <dl className="mt-10 mb-0 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ['2', 'themes, one declaration'],
            ['3', 'densities, one attribute'],
            ['0', 'border radius, anywhere'],
            ['AA', 'every pairing, tested'],
          ].map(([value, label]) => (
            <div key={label} className="m-0">
              <dt className="sr-only">{label}</dt>
              <dd className="m-0 font-display text-3xl font-bold wdth-display text-on-ink-accent tabular">{value}</dd>
              <dd className="m-0 mt-1 rotulo text-on-ink-muted">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="relleno band-oro" aria-hidden="true" />
    </div>
  )
}
