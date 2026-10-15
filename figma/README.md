# The Mola UI Figma kit

A Figma plugin that draws the Mola UI kit into a Figma file: the variables, the effect styles
and the core components, generated from the same sources as the code. You run it once in
your own file. You run it again whenever the tokens or the components change, and it updates
the kit in place.

Why a plugin? Figma's REST API cannot create components, and its Variables endpoints need an
Enterprise plan. A plugin can do both on any plan, the free Starter plan included (see
[Starter and paid plans](#starter-and-paid-plans)).

```
figma/
  plugin/manifest.json    what Figma imports
  plugin/code.js          the plugin, generated: the runtime with the kit's data inlined
  component-map.json      every component export, built in Figma or pending, generated
  src/                    the generator (tokens.ts, components.ts, icons.ts, build.ts) and
                          the runtime (plugin.ts), with their tests
```

## Run it

1. Install the three typefaces on the machine that runs Figma, from Google Fonts:
   **Archivo**, **Alegreya** and **Martian Mono**. Restart Figma after you install them. The
   plugin loads them with `figma.loadFontAsync`. If one is missing, it says which one and how
   to fix it. If it is Archivo (the face the components use), it still writes the variables
   and effect styles, then stops before the components.
2. Open the Figma **desktop** app. Development plugins can only be imported there. Open the
   file that will hold the kit. A new file works well.
3. **Plugins → Development → Import plugin from manifest…** and choose
   `figma/plugin/manifest.json` from a checkout of this repository.
4. **Plugins → Development → Mola UI kit → Draw or update the kit**. It runs without a UI and
   closes with a summary that starts with the plan path it took, then lists
   what it created or updated, and anything it could not do.

The plugin needs no network access (`allowedDomains: ["none"]`). Everything it draws is
already in `code.js`.

## Starter and paid plans

The plugin does not ask which plan the file is on. It tries to give `Color` a second mode, and
if Figma refuses, it takes the single-mode path. The closing message names the path it took.

**Paid plans (Professional and up)** allow several modes per collection. `Color` holds `light`
and `dark` and `Density` holds `comfortable`, `compact` and `spacious`, as the table below says.
Pick a mode for a frame in its variable modes (Appearance in the right sidebar).

**Starter** allows one mode per collection. The kit then splits each multi-mode collection:

| Collection | Holds |
| --- | --- |
| `Color` | the mode the kit shows: `light` at first |
| `Color · dark` | the dark values, under the same variable names |
| `Density` | the mode the kit shows: `comfortable` at first |
| `Density · compact`, `Density · spacious` | the other densities, under the same names |

Components and effect styles bind `Color` and `Density`, so the kit renders light and
comfortable. To see it dark, run **Plugins → Development → Mola UI kit → Show dark (Starter
plan)**. It rewrites `Color` in place with the dark values, keeps the light ones in
`Color · light`, and leaves every binding alone, so the whole file turns dark. **Show light**,
**Show compact**, **Show spacious** and **Show comfortable** work the same way. A later
**Draw or update the kit** keeps whichever mode is showing.

A file that started on Starter upgrades by itself. After the plan changes, run **Draw or
update the kit** again: `Color` and `Density` gain their other modes, the `·` alternates are
merged into them and removed, and every variable bound in your designs keeps its id. If the
alternates were showing dark, `dark` stays the first mode of `Color`, because Figma cannot
reorder modes from a plugin. Drag `light` back to the front in the variables panel if you want
light as the default.

If an earlier version of the plugin stopped on Starter with a mode-limit error, just run the
current one. It adopts the half-made collections: it renames Figma's default "Mode 1" to
`light` or `comfortable`, fills in the variables that are already there, adds the alternates,
and duplicates nothing.

**Publishing a library needs a paid plan.** On Starter the kit is a local file. It works there
as the place you design. You can also copy components from it and paste them into another
file, which brings their variables along as local copies. Use one kit file per team on
Starter, or upgrade to publish it once and let every file subscribe.

## What it creates

**Variables**, in four collections:

| Collection | Modes | What it holds |
| --- | --- | --- |
| `_Primitives` | `value` | Every distinct colour each theme paints, named after the first token that paints it (`light/rojo`). Hidden from publishing and from every picker. |
| `Color` | `light`, `dark` | The semantic colours (`ink`, `danger`, `accent`), each mode an alias into `_Primitives`. |
| `Density` | `comfortable`, `compact`, `spacious` | Everything `data-density` re-scales: control heights, padding, the type scale, icon sizes, plus the spacing steps (`space/2` is Tailwind's `2`) and the `--control-px` multiples the components use. |
| `Scale` | `value` | Font families, radii (zero), the cut width, containers, breakpoints, and code-only values (z-index, motion, line-height ratios, tracking, Archivo's width axis). |

Mode names are the code's attribute values (`data-theme="dark"`, `data-density="compact"`).
Every variable has WEB code syntax, so Dev Mode shows `var(--cloth-pale)` rather than a hex,
and scopes taken from the token export. A colour only appears in the pickers it is meant for.
Values Figma cannot apply as written (a z-index, a duration, a unitless line-height ratio) and
the primitives have no scopes, so they stay out of every picker. Their description says why.

**Effect styles** `cut`, `focus-ring`, `focus-ring-inset`, `elevation-raised` and
`elevation-overlay`, from the shadow tokens. The cut and the focus rings bind their colours to
`Color` variables, so they follow the theme. Elevation is translucent ink with no token of its
own, so it keeps the light theme's colour (effect styles have no modes).

**Components** on a page called `Mola UI`: Button, IconButton, Input, Field, SelectTrigger,
Checkbox, Radio, Switch, Badge, Chip, Callout, TabsTab and Panel, plus lucide icons as
`Icon/<name>` and a `_Slot` placeholder. They follow these rules:

- **Name identity.** A component is named after its code export. Its variant axes are the prop
  names, and their values are the code's exact strings (`variant=danger`, `size=sm`), read from
  `docs/ai/components.json`. An axis that is not a prop of that export (a Base UI or HTML prop,
  or Tabs' `variant` on a tab) says where it comes from in the component map.
- **States a designer needs but no prop sets** (`state=rest|hover|pressed|focus-visible`, a
  tab's `selected`) are marked `nonApi` in the map. Nobody should go looking for a `state` prop.
  Pressed is `:active` in code: the band closed with ink on a cut shape, the cut drawn inward on
  an edgeless one. Text fields have no pressed look, so they have no pressed variant.
  `disabled=true` is drawn at rest only, because a disabled control looks the same whatever
  the pointer does. It is stated, not faded: the `disabled` ground, muted ink and the keyline,
  and primary and danger buttons keep a thin band of their role.
- **Everything is bound.** Fills, effect colours, padding, gap, heights and font sizes are
  bound to variables, and the font family is bound to `font-ui`. No component carries a
  literal colour. The build fails if one would.
- **The cut is an effect, not a stroke.** In code the cut is
  `box-shadow: 0 0 0 var(--cut-w) var(--ink)`. It sits outside the box and takes no layout
  space, and the hover band and focus ring are more rings stacked on it. A Figma drop shadow
  with spread is the same thing. Its spread binds to `cut-w` and its colour to `ink`. An inside
  stroke would eat 1.5px of the control and could not stack the three rings of the hover band.
  Figma only draws spread on a node with a visible fill and clipped content, so the plugin sets
  both. A ghost button gets a fill at zero opacity.
- **Props become component properties.** Text props (`children`, `label`, `title`) are TEXT
  properties. Boolean props that show a part (`withArrow`, `dot`, `required`) are BOOLEAN
  properties. Slots are INSTANCE_SWAP properties with preferred values (Button's `icon` offers
  the lucide icons; Field's `children` offers Input and SelectTrigger; Panel's `children` is a
  `_Slot` to swap for your own content). A `has …` boolean shows or hides an optional part
  and is marked `nonApi`.
- **Descriptions** carry the import line, the props with their types, the do and don't from
  the usage guidance, and the Storybook link, which is also the component's documentation link.

The other component exports are listed as `pending` in [`component-map.json`](component-map.json).
That list is the kit's debt. A built entry's `notDrawn` lists the props it does not draw yet
(Button's `loading`, Callout's `actions`), each with what to do instead.

## Run it again after a change

When a token, a prop or a component's guidance changes:

```bash
npm run figma        # rebuilds figma/plugin/code.js and figma/component-map.json
```

Commit the result. CI fails if it is stale (`npm run figma:check`, part of `npm run check`, and
`figma/src/build.test.ts` in the unit suite). Then run the plugin again in the kit's file
(**Plugins → Development → Mola UI kit → Draw or update the kit**, no need to re-import).

A re-run finds everything by name and updates it in place, so ids stay the same. Designs
bound to a variable or using an instance follow the change. It never deletes anything. A
variable or variant that is no longer in the code is listed in the closing message for you to
remove by hand, because deleting it would silently detach whatever used it. Each variant's
insides are rebuilt on every run. Values you set through a component property survive,
because they live on the instance. A direct override on an inner layer does not, which is why
everything meant to change is a property.

## Limits

- Archivo's width axis (`--wdth-label`, 116 for the label caps) is applied through the font's
  `variationSettings` when the installed Archivo is the variable font. With a static Archivo
  the label falls back to the regular width. Figma has no variable scope for a font axis, so
  the `wdth-*` variables are for reference.
- Line height and letter spacing are set as percentages from the tokens, not bound to them.
  Figma reads a number variable on either as pixels, and the tokens are ratios and ems.
- Callout's seam is drawn as a solid band of its tone. In code it is the relleno strip.
- The plugin has been run against a fake Figma API in `figma/src/plugin.test.ts`, not yet in a
  real file. On the first real run, check that the hover band on a secondary Button reads as
  ink, gold, ink, and that the focus ring reads as ink, pale, ink. Figma draws the last effect
  on top, and the kit relies on that.
