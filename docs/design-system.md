# Crux Design System — "Debate-Hall Editorial"

**Status: in force, app-wide.** Every page runs on these tokens; the old dark
Material palette is gone from the codebase. Reference inspiration: the Butterfly
Conservation site (warm cream + deep green + specimen illustration), chosen by
the owner.

Two things separate the landing from the product, both deliberate:
**engravings** and **heavy scroll motion** stay on `/`. The product is set in
type and palette alone (§4, §6).

---

## 1. The idea in one paragraph

Crux is a debating society rebuilt as a modern web app, and the design says so:
warm cream paper, deep forest ink, condensed poster headlines, serif body copy,
and 19th-century engravings mounted on **specimen plates**. Light mode is a
printed charter read in daylight; dark mode is *the archive at night* — the
same cream plates glowing against green-black walls. It is formal enough for an
intellectual platform and animated enough (GSAP scroll work) to feel alive to
students.

## 2. Color

Semantic CSS variables in `frontend/app/globals.css`, flipped by
`<html data-theme="light|dark">`. Tailwind utilities map through `@theme`
(`bg-paper`, `text-ink`, `text-laurel`, `bg-side-for`…).

| Token | Role | Light | Dark |
|---|---|---|---|
| `--paper` (`bg-paper`) | page background | `#f3edda` | `#0f1a15` |
| `--paper-plate` (`bg-plate`) | specimen plates — **landing only** | `#faf6e8` | `#efe7d0` (stays cream) |
| `--paper-band` (`bg-band`) | alternate bands, cards | `#ece4cb` | `#14231c` |
| `--paper-raised` (`bg-raised`) | second elevation step in the product | `#faf6e8` | `#1b2c24` |
| `--ink` (`text-ink`) | primary text | `#244134` | `#ece5d0` |
| `--ink-soft` | secondary text | `#52685b` | `#a3b2a4` |
| `--ink-faint` | hairlines, borders | ink @ 16% | cream @ 16% |
| `--ink-wash` | whisper fills | ink @ 6% | cream @ 5% |
| `--laurel` (`text-laurel`) | gold — prizes, MVP, numerals | `#8f6e1f` | `#d4ac3a` |
| `--for` (`side-for`) | FOR camp | `#2f6b4f` | `#63a882` |
| `--against` (`side-against`) | AGAINST camp | `#9c4a34` | `#c97757` |
| `--draw` (`side-draw`) | draw band | `#857a55` | `#a2966c` |
| `--plate-ink` | text *on* plates (constant) | `#244134` | `#244134` |
| `--metal-gold/silver/bronze` | podium places, season titles | `#8f6e1f` / `#6b7478` / `#8c5a2f` | `#d4ac3a` / `#c9d1d4` / `#d09a6a` |
| `--scrim` (`bg-scrim`) | modal overlays | `rgba(20,35,28,.45)` | `rgba(4,9,7,.7)` |

**Three paper tones carry elevation in the product: `paper → band → raised`.**
`plate` is not one of them — it stays cream in dark mode by design, which is
right for an engraving and punishing for a feed of text. Elevation is paper
tone and hairlines — see §5 for the one narrow exception (`shadow-cast`).

**`--ink-faint` is already 16% alpha.** Never write `border-ink-faint/30` — that
renders at 5% and the hairline vanishes. Use the token bare.

**`--scrim` is not `ink` at low alpha.** Ink inverts between themes, so a cream
scrim over a dark page lifts the backdrop instead of dimming it.

Rules:
- **No pure black, no pure white, no gradients, no texture/noise overlays.**
- Laurel gold is reserved for *earned* things: numerals, prizes, MVP, tiers.
- FOR is always green-family, AGAINST always terracotta — never red/green
  stoplight pairs.
- **The draw band is marked on the debate page's probability bar only**
  (`MotionProbability`), not on the arena feed's `ScoreBar`. It is a rule about
  how a debate *ends*, so it belongs where a debate is read and acted on, and
  where the bar is tall enough to carry a marking. Repeated across a dozen feed
  cards it just ruled the page. `DRAW_MARGIN` still lives in
  `_utils/drawBand.ts` — one number, so the bar and the verdict cannot
  disagree.
- Theme is stored in `localStorage("crux-theme")` and stamped on `<html>`
  before paint by a script in `app/layout.tsx` (default: system preference).

## 3. Typography

| Role | Face | Usage |
|---|---|---|
| Display | **Anton** (`--font-display`, `.display-type`) | headlines, big numbers, stamps — always uppercase, `line-height 0.94`, `letter-spacing 0.015em` |
| Serif | **Newsreader** (`--font-newsreader`, `font-headline` *and* `font-body`) | body copy, ledes, motion claims, *italic lowercase asides inside display headlines* (the signature type move), roman numerals |
| Label | **Space Grotesk** (`--font-label`) | eyebrows, buttons, captions, data — uppercase, tracked `0.2–0.3em`, tiny sizes |

- **Three faces, no more.** Manrope used to carry app body copy; it retired when
  the system rolled out, and `--font-body` now points at Newsreader. Generated
  OG images set body copy in Space Grotesk instead, because only Newsreader's
  italic cut is on disk in `app/_fonts/` — drop a `Newsreader-Regular.woff`
  there and repoint `BODY` in `_utils/ogFonts.ts` to finish the job.
- **To swap the display font:** change the `Anton` import in
  `frontend/app/layout.tsx` (e.g. to `Oswald`, `League_Gothic`,
  `Archivo_Black`), keep `variable: "--font-anton"` — done.
- Scale (fluid): hero `clamp(3.2rem, 9.5vw, 8rem)`; section titles
  `clamp(2.4rem, 6vw, 4.6rem)`; article titles `clamp(2rem, 4.6vw, 3.6rem)`;
  serif lede `1.125–1.25rem/1.55`; labels `0.62–0.72rem`.
- Mixed headline pattern: `EVERY ARGUMENT` (Anton) + `deserves` (Newsreader
  italic, lowercase, ink-soft) + `A VERDICT` (Anton).
- **The motion on a debate page is the one h1 that is not Anton.** It is
  Newsreader roman with the keyword lifted in laurel italic. Anton was tried
  there and rejected by the owner: a motion is a sentence someone is on the
  hook for, and condensed uppercase poster type turns an argument into a
  headline shouting at the reader. Section titles announce; a motion is
  written and signed. Don't "fix" it back to the display face.
- **A debate column is set in Space Grotesk, not the serif** — the Crux AI
  panel and the arguments alike. It is the one place the label face carries
  running prose rather than eyebrows, and it earns it: the column is a
  screenful of short statements, which scan better in the label face than in
  the italic serif that used to hold them. Arguments carry **no quotation
  marks** — the avatar, the handle and the card already say whose words they
  are — and sit at `text-ink`, the darkest text in the column, so the debating
  outranks the analysis reading it.
- Because both voices now share a face, **the surface is what separates the
  machine from the debaters**: the AI panel is `bg-raised` + side-tinted cast +
  a ruled header, an argument is a flat `bg-band` card with a person attached.
  Strip that shell and the panel needs another way to say it is not a person.

## 4. Imagery — the specimen plates

**The product ships no engravings at all.** They are a landing device. Behind
the login the system runs on type, palette and hairlines alone — the pages
people open many times a day stay fast and quiet, and the plates keep their
impact by being rare. The one thing that crosses over is the **arch**, which is
geometry rather than imagery: profile portraits and podium avatars wear it.

All engravings live in `frontend/public/landing/` (green ink on cream, no text
inside images). Two rules make them work everywhere:

1. **`.engraving` = `mix-blend-mode: multiply`** — erases each image's slightly
   different cream background into whatever paper it sits on.
2. **Every image sits on a plate** (`bg-plate` + `border-[#24413440]`): portrait
   subjects get **arched tops** (`.plate-arch` — the arena-door arch, the
   system's signature shape); landscape plates are rectangles; big plates carry
   a caption strip: `PLATE III · FORTY-EIGHT HOURS` (Space Grotesk, tracked).
   Plates stay cream in dark mode — that's the whole dark-mode concept.

Inventory: orators ×2 (hero), quarrel, quill+seal, hourglass, fencers, scales,
herald, laurel wreath, bust, medals ×3, amphitheater (full-bleed), doors
(final CTA), manicule (spare ornament).

## 5. Shape & surfaces

- Corners: **square** everywhere except two shapes — **pills** (buttons,
  `rounded-full`) and **arches** (plates, the footer seal).
- Borders are hairlines (`--ink-faint`); no glows. Elevation is expressed by
  paper tone (`paper` → `band` → `plate`).
- **The cast — the one depth effect, and it is never black.** A surface that
  belongs to a camp casts that camp's colour: `shadow-cast-for` is forest,
  `shadow-cast-against` is terracotta, each with a `-deep` step for hover.
  `shadow-cast` is the ink-tinted neutral, for overlays that belong to no camp.
  Tokens are `--cast-for` / `--cast-against` / `--cast-neutral` (+ `-soft`) in
  `globals.css`. Where it is used:
  - the **Crux AI panel** on a debate — resting, `shadow-cast-{side}`;
  - an **argument card under the cursor** — `hover:shadow-cast-{side}-deep`;
  - the **side-lock dialog** — the side being committed to;
  - the **points slip and the composer's error notice** — neutral.

  Three rules keep it working:
  1. **Shallow and low-alpha.** ~10–16px of throw at ≤0.32 alpha in light. The
     cast means "this sits above the page", not "this floats in space" — a
     heavy one reads as a bruise under the panel and was rejected once already.
  2. **Dark mode casts the same hues taken down below the page tone**
     (`rgba(10,38,25,.72)` for FOR), because `--for` *lightens* at night and a
     light shadow on green-black glows instead of shading.
  3. **Anything carrying a cast sits on `bg-raised`,** not `bg-paper`: a shadow
     under a surface no lighter than the page reads as a hole punched in it.

  Everything else in the product is still flat paper and hairlines — the cast
  means "this is above the page", so it is worth nothing once it is everywhere.

  **The one black exception: `shadow-podium`.** The leaderboard champion is a
  card standing in front of two cards it is touching, and the ink-tinted cast
  is too shallow to separate them — so that single card gets a longer, truly
  black throw (`--cast-podium`, .32 light / .62 dark, `-deep` on hover). It
  still obeys rules 2 and 3: theme-aware, and on `bg-raised`. Nothing else in
  the product may use it; if a second consumer appears, the rule was wrong and
  this note should be revisited rather than copied.
- Buttons: pill, Space Grotesk uppercase; solid = ink-on-paper inverted;
  outline = hairline + `ink-wash` hover; hover lifts `-2px`.
- **`backdrop-filter` traps `position: fixed` children.** A blurred or
  transformed ancestor becomes their containing block, so a `fixed inset-0`
  modal inside the debate composer (`backdrop-blur-xl`) fills the composer
  rather than the viewport. Overlays go through `ui/Portal`, which renders them
  at `<body>`; the same applies to any `filter`, `transform`, `perspective` or
  `will-change` ancestor.

## 6. Motion (GSAP)

Registered once per section component via `useGSAP` + `ScrollTrigger`, scoped
refs, all reveals `once: true`. Full inventory on the landing page:

| Moment | Behavior |
|---|---|
| Hero load | headline lines rise staggered → orator plates fade up → lede/CTAs; statues then drift ±14px forever (sine, slow) |
| Everything else | `[data-reveal]` fade-and-rise (30px, `power3.out`, 0.9s) at `top 86%` |
| Loop I→II→III | hairline rule draws across, scrubbed to scroll |
| Quarrel / amphitheater | slow parallax drift, scrubbed |
| **The clock** | scrubbed 48:00:00 → 00:00:00 as you scroll the section; "LOCKED — READ FOREVER" stamps in at zero |
| Verdict split bar | sweeps 50% → 58% on entry, draw band always marked |
| The doors | scale 0.92 → 1.06 scrubbed — you walk toward the light |

Rules: transforms + opacity only; `prefers-reduced-motion` gets everything
static-visible (checked in every section); content is fully readable with JS
disabled (`landing-js` class gates the hidden initial states).

### In the product — quiet, with three earned moments

The landing's scroll choreography does **not** cross over. Pages used many
times a day get the existing `[data-reveal]` fade-and-rise on lists, `-2px`
hover lifts, and CSS transitions. Exactly three things animate, because in each
one something is actually at stake:

| Moment | Where | Behavior |
|---|---|---|
| The split settling | `arena/ScoreBar` via `useScoreBarReveal` | both halves start level and settle onto the real split |
| The stamp | `motion/VerdictBanner` | the ruling lands from 1.35× — a verdict is an act, not an arrival |
| The count-up | `ui/PointsPopup` | the award ticks up in laurel |

The count-up sits inside an `aria-live` region, so the ticking numeral is
`aria-hidden` and a static `sr-only` line carries the announcement — otherwise
a screen reader reads the award ~30 times.

## 6b. The mark

**The braced door.** The arena arch, with the two cases crossed inside it so
that they reach the walls — the crossing is the bracing that holds the door up,
not a symbol laid on top of it. `crux` is Latin for cross, and the decisive
point is where two cases meet.

That anchoring is load-bearing, not decorative. A small symmetric X floating
clear of the frame is the anatomy of a checkbox cross, and an earlier draft read
as "closed" and "denied". Reaching the frame turns it into structure. **If the
mark is ever redrawn, the braces must keep touching the arch.**

| Variant | Where | Why |
|---|---|---|
| `LogoMark` — outlined | navbars, footer, login masthead, landing seal, touch icon | hairline weight, sits with the rest of the system |
| `LogoSolid` — filled, braces knocked out | favicon only (`icon.svg`) | a hairline dies at 16px on a background we don't control |
| `Logo` — mark + wordmark | the default lockup | wordmark stays Newsreader italic; only the mark is new |

One ink throughout — everything is `currentColor`, so the mark is forest on
cream in light and cream on green-black in dark with no variant (§4).

The touch icon deliberately uses the **outlined** variant despite being an
"icon": at 60–120pt the filled version's knocked-out braces grow dominant
enough that the tile starts to read as an envelope.

## 7. Iconography

**Phosphor** via `react-icons/pi` (thin strokes that sit well beside
engravings). Used sparingly: arrows, seal-check, lock, prohibit, heart,
sun/moon. Never decorative icon grids — the engravings carry the imagery.

## 8. Voice

Formal but alive; the register of a courtroom that enjoys itself. Every rule is
stated with its real number (+25 MVP, cap at 5, −5 season-only) — transparency
is a product requirement, so marketing copy quotes the actual constants from
`docs/game-theory.md`. Buttons say what they do ("Enter the arena", "Claim your
name"). No hype adjectives.

## 9. Page anatomy of `/`

Nav (sticky, blurred paper) → Hero (orators + mixed headline) → The Problem
(quarrel) → Order of Proceedings (I·II·III) → Articles I–V (motion / camps /
clock / duel / verdict, alternating exhibits: pass-fail cards, side-lock
dialog, countdown, score arithmetic cards, split bar + payout table) → Record
& tiers (bust) → Seasons & prizes (medals) → The Stage (amphitheater
full-bleed) → Fair by design + The Bench (herald) → The Doors (CTA) → Footer
(laurel seal).

## 10. Files

- **Tokens/utilities:** `frontend/app/globals.css` — the whole palette, the
  `dark:` variant rebound onto `[data-theme]`, and four utility classes
  (`.engraving`, `.plate-arch`, `.display-type`, the landing reveal gate).
- **Fonts + theme script:** `frontend/app/layout.tsx`
- **Chrome:** `_components/Navbar.tsx`, `Footer.tsx`, `ConditionalLayout.tsx`
  (`noNavRoutes` = `/`, `/login`, `/register` — those ship their own chrome)
- **Primitives:** `_components/ui/` — `Button` (pill), `Avatar`, `ThemeToggle`
  (shared with the landing nav), `PointsPopup`, `Pagination`, `Skeleton`,
  `Reveal`, `AutoGrowTextarea`
- **Landing:** `frontend/app/page.tsx`; sections in `_components/landing/`
  (`ui.tsx` holds PillButton, Eyebrow, SectionHead, Plate, Section, reveals)
- **Shared rules:** `_utils/drawBand.ts` — the draw-band geometry both split
  bars read, so the feed and the debate page cannot disagree about where a
  draw begins.
- **The mark:** `_components/ui/Logo.tsx` owns the path data. `app/icon.svg`
  (favicon), `app/apple-icon.tsx` and `app/opengraph-image.tsx` are generated
  from it — the three PNGs they replaced had drifted to the old cyan palette,
  which is precisely what a generated asset cannot do.
- **Generated images:** `_components/motion/verdictCard.ts` mirrors the palette
  as hex because satori cannot read CSS variables. It uses the **light**
  values on purpose — a certificate is a document you keep.
  `_utils/brandMark.ts` does the same for the mark, as a data URI: satori has
  no mask support, so the mark reaches generated images as an `<img>` rather
  than as JSX. Both files are hand-synced with `globals.css` and `Logo.tsx`.

## 11. Changelog

- **2026-07-29 — rolled out app-wide.** The landing's system now runs
  everywhere; the old Material palette, the cyan glow shadows, the grid
  backdrops and Manrope are all deleted. Nine phases, spec in
  `docs/superpowers/specs/2026-07-29-app-wide-design-rollout-design.md`.
- **2026-07-29 — landing built** at `/`, old home moved to `/arena`.

- **2026-07-29 — the mark.** "The braced door" (§6b), wired into both navbars,
  the footer, the login masthead and the landing seal. `icon.png`,
  `apple-icon.png` and `opengraph-image.png` deleted in favour of generated
  equivalents; the site OG card was still the old dark cyan design.

### Still open

- **`Newsreader-Regular.woff`** for `app/_fonts/`, so generated images can set
  body copy in the same serif as the site (see §3).
- **The wordmark is still type, not vectors.** Deliberate — Newsreader italic
  reads well and is already one of the three faces. Drawing custom letterforms
  is a separate job with a real chance of being worse.
