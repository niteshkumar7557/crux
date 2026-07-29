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
right for an engraving and punishing for a feed of text. There are no shadows
anywhere in the system; elevation is paper tone and hairlines.

**`--ink-faint` is already 16% alpha.** Never write `border-ink-faint/30` — that
renders at 5% and the hairline vanishes. Use the token bare.

**`--scrim` is not `ink` at low alpha.** Ink inverts between themes, so a cream
scrim over a dark page lifts the backdrop instead of dimming it.

Rules:
- **No pure black, no pure white, no gradients, no texture/noise overlays.**
- Laurel gold is reserved for *earned* things: numerals, prizes, MVP, tiers.
- FOR is always green-family, AGAINST always terracotta — never red/green
  stoplight pairs; the draw band is always visible on split bars.
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
- Borders are hairlines (`--ink-faint`); no shadows, no glows, flat surfaces
  only. Elevation is expressed by paper tone (`paper` → `band` → `plate`).
- Buttons: pill, Space Grotesk uppercase; solid = ink-on-paper inverted;
  outline = hairline + `ink-wash` hover; hover lifts `-2px`.

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
