# Crux — Design System

**"Debate-hall editorial."** In force app-wide: every page runs on these tokens.

This file owns colour, type, shape, motion, iconography and voice. **It owns no game rules** — if
it appears to contradict [`game-theory.md`](./game-theory.md), the spec wins. For where the code
lives, see [`codebase-guide.md`](./codebase-guide.md).

Two things separate the landing from the product, both deliberate: **engravings** and **heavy
scroll motion** stay on `/`. The product is set in type and palette alone (§4, §6).

---

## §1 The idea

Crux is a debating society rebuilt as a modern web app, and the design says so: warm cream paper,
deep forest ink, condensed poster headlines, serif body copy, and 19th-century engravings mounted
on **specimen plates**. Light mode is a printed charter read in daylight; dark mode is *the archive
at night* — the same cream plates glowing against green-black walls. Formal enough for an
intellectual platform, animated enough to feel alive.

---

## §2 Colour

Semantic CSS variables in `frontend/app/globals.css`, flipped by `<html data-theme="light|dark">`.
Tailwind utilities map through `@theme` (`bg-paper`, `text-ink`, `text-laurel`, `bg-side-for`…).

Because the theme is an attribute rather than the `dark` class or a media query, Tailwind's
built-in `dark:` variant is **rebound** in `globals.css` via `@custom-variant`. It works as
expected; it just is not the stock implementation.

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
| `--laurel-bright` | the one lifted gold, for emphasis on gold | `#c9a227` | `#d4ac3a` |
| `--for` (`side-for`) | FOR camp | `#2f6b4f` | `#63a882` |
| `--against` (`side-against`) | AGAINST camp | `#9c4a34` | `#c97757` |
| `--draw` (`side-draw`) | draw band | `#857a55` | `#a2966c` |
| `--plate-ink` | text *on* plates (constant) | `#244134` | `#244134` |
| `--bubble-own` (`bg-bubble-own`) | the viewer's own chat bubble, DM panel only | `#244134` | `#2f5241` |
| `--bubble-own-ink` | text on it (constant) | `#f3edda` | `#f3edda` |
| `--metal-gold` / `-silver` / `-bronze` | podium places, season titles | `#8f6e1f` / `#6b7478` / `#8c5a2f` | `#d4ac3a` / `#c9d1d4` / `#d09a6a` |
| `--scrim` (`bg-scrim`) | modal overlays | `rgba(20,35,28,.45)` | `rgba(4,9,7,.7)` |

**Three paper tones carry elevation in the product: `paper → band → raised`.** `plate` is not one
of them — it stays cream in dark mode by design, which is right for an engraving and punishing for
a feed of text.

**`--ink-faint` is already 16% alpha.** Never write `border-ink-faint/30` — that renders at 5% and
the hairline vanishes. Use the token bare.

**`--scrim` is not `ink` at low alpha.** Ink inverts between themes, so a cream scrim over a dark
page lifts the backdrop instead of dimming it.

**`--bubble-own` is not `ink` either, for the same reason.** The system's inverted `solid`
treatment is right for a button and wrong for a block of message text: at night ink *is* cream, so
a user's own messages would become the brightest thing on a dark screen. The token is a forest fill
with cream text in both themes, so the bubble keeps one identity instead of flipping. **Anything
that fills a large area rather than a control should be checked the same way before reaching for
`ink`.**

**Rules:**

- **No pure black, no pure white, no gradients, no texture or noise overlays.**
- **Laurel gold is reserved for *earned* things**: numerals, prizes, MVP, tiers. It is never
  decoration.
- **FOR is always green-family, AGAINST always terracotta** — never a red/green stoplight pair.
- **The draw band is marked on the debate page's probability bar only** (`MotionProbability`), not
  on the arena feed's `ScoreBar`. It is a rule about how a debate *ends*, so it belongs where a
  debate is read and acted on, and where the bar is tall enough to carry a marking. Repeated across
  a dozen feed cards it just rules the page. `DRAW_MARGIN` lives in `_utils/drawBand.ts` — one
  number, so the bar and the verdict cannot disagree.
- Theme is stored in `localStorage("crux-theme")` and stamped on `<html>` **before paint** by a
  script in `app/layout.tsx`. Default is the system preference.

---

## §3 Typography

| Role | Face | Usage |
|---|---|---|
| Display | **Anton** (`--font-display`, `.display-type`) | headlines, big numbers, stamps — always uppercase, `line-height 0.94`, `letter-spacing 0.015em` |
| Serif | **Newsreader** (`--font-headline` *and* `--font-body`) | body copy, ledes, motion claims, *italic lowercase asides inside display headlines* (the signature type move), roman numerals |
| Label | **Space Grotesk** (`--font-label`) | eyebrows, buttons, captions, data — uppercase, tracked `0.2–0.3em`, tiny sizes |

**Three faces, no more.**

- **To swap the display font:** change the `Anton` import in `frontend/app/layout.tsx` (e.g. to
  `Oswald`, `League_Gothic`, `Archivo_Black`) and keep `variable: "--font-anton"`. Done.
- **Scale (fluid):** hero `clamp(3.2rem, 9.5vw, 8rem)`; section titles `clamp(2.4rem, 6vw, 4.6rem)`;
  article titles `clamp(2rem, 4.6vw, 3.6rem)`; serif lede `1.125–1.25rem/1.55`; labels
  `0.62–0.72rem`.
- **Mixed headline pattern:** `EVERY ARGUMENT` (Anton) + `deserves` (Newsreader italic, lowercase,
  ink-soft) + `A VERDICT` (Anton).
- **The motion on a debate page is the one `h1` that is not Anton.** It is Newsreader roman with the
  keyword lifted in laurel italic. A motion is a sentence someone is on the hook for, and condensed
  uppercase poster type turns an argument into a headline shouting at the reader. Section titles
  announce; a motion is written and signed. **Don't "fix" it back to the display face.**
  It is also the one headline set at a **fixed two-step scale** rather than a clamp
  (`text-5xl md:text-7xl`, bold, `tracking-tight`) — an owner's call for the poster weight of the
  claim, taken knowingly against the fluid rule above. `motion/[id]/loading.tsx` hand-mirrors its
  line box, so the two move together or the page jumps vertically on reload.
- **The two case titles are framed, not filled** — a hairline box in the side's colour with the
  label face inside at `text-lg`, tracked `0.28em`. Reversed-out type at that size turned the
  column headers into two blocks of solid camp colour competing with the arguments under them.
- **A debate column is set in Space Grotesk, not the serif** — the Crux AI panel and the arguments
  alike. It is the one place the label face carries running prose, and it earns it: the column is a
  screenful of short statements, which scan better in the label face than in an italic serif.
  Arguments carry **no quotation marks** — the avatar, the handle and the card already say whose
  words they are — and sit at `text-ink`, the darkest text in the column, so the debating outranks
  the analysis reading it.
- Because both voices share a face, **the surface is what separates the machine from the
  debaters**: the AI panel is `bg-raised` + a side-tinted cast + a ruled header; an argument is a
  flat `bg-band` card with a person attached. Strip that shell and the panel needs another way to
  say it is not a person.
- **Generated images set body copy in Space Grotesk**, because only Newsreader's italic cut is on
  disk in `app/_fonts/`. Dropping a `Newsreader-Regular.woff` there and repointing `BODY` in
  `_utils/ogFonts.ts` would finish the job.

---

## §4 Imagery — the specimen plates

**The product ships no engravings at all.** They are a landing device. Behind the login the system
runs on type, palette and hairlines alone — the pages people open many times a day stay fast and
quiet, and the plates keep their impact by being rare. The one thing that crosses over is the
**arch**, which is geometry rather than imagery: profile portraits and podium avatars wear it.

All engravings live in `frontend/public/landing/` (green ink on cream, no text inside the images).
Two rules make them work everywhere:

1. **`.engraving` = `mix-blend-mode: multiply`** — erases each image's slightly different cream
   background into whatever paper it sits on.
2. **Every image sits on a plate** (`bg-plate` + a hairline). Portrait subjects get **arched tops**
   (`.plate-arch` — the arena-door arch, the system's signature shape); landscape plates are
   rectangles; big plates carry a caption strip (`PLATE III · FORTY-EIGHT HOURS`, Space Grotesk,
   tracked). Plates stay cream in dark mode — that is the whole dark-mode concept.

Inventory: orators ×2 (hero), quarrel, quill + seal, hourglass, fencers, scales, herald, laurel
wreath, bust, medals ×3, amphitheater (full-bleed), doors (final CTA), manicule (spare ornament).

---

## §5 Shape and surfaces

- **Corners are square everywhere except two shapes** — **pills** (buttons, `rounded-full`) and
  **arches** (plates, the footer seal).

  *One narrow third:* the chat bubbles and avatars in the **Talk to the developer** panel, which are
  drawn the way a messaging app draws them — `rounded-[1.15rem]`, closing to `0.3rem` on the
  sender's side between stacked bubbles, with circular portraits. It is at least the right family of
  exception: a single-line bubble at that radius *is* a pill. The corner overrides are inline
  `style`, not `rounded-tr-*` utilities, because an all-corners `rounded-*` and a per-corner one
  write the same shorthand and the winner depends on their order in the generated sheet. **This does
  not generalise** — a second rounded surface needs its own reason.

- **Borders are hairlines** (`--ink-faint`); no glows. Elevation is paper tone.

- **The cast — the one depth effect, and it is never black.** A surface that belongs to a camp casts
  that camp's colour: `shadow-cast-for` is forest, `shadow-cast-against` is terracotta, each with a
  `-deep` step for hover. `shadow-cast` is the ink-tinted neutral, for overlays that belong to no
  camp. Tokens are `--cast-for` / `--cast-against` / `--cast-neutral` (+ `-soft`) in `globals.css`.

  Where it is used:
  - the **Crux AI panel** on a debate — resting, `shadow-cast-{side}`;
  - an **argument card under the cursor** — `hover:shadow-cast-{side}-deep`;
  - the **side-lock dialog** — the side being committed to;
  - the **points slip and the composer's error notice** — neutral;
  - the **two navbar dropdowns** (notifications, talk-to-the-developer) — neutral, and at the
    `-deep` step **at rest**. `-deep` is the hover step everywhere else, but these hang under a
    blurred paper navbar over a page within a shade of their own surface, and the resting cast left
    both reading as part of the page rather than above it.

  Three rules keep it working:

  1. **Shallow and low-alpha.** ~10–16px of throw at ≤0.32 alpha in light. The cast means "this sits
     above the page", not "this floats in space" — a heavy one reads as a bruise under the panel.
  2. **Dark mode casts the same hues taken down *below* the page tone** (`rgba(10,38,25,.72)` for
     FOR), because `--for` *lightens* at night and a light shadow on green-black glows instead of
     shading.
  3. **Anything carrying a cast sits on `bg-raised`,** not `bg-paper`: a shadow under a surface no
     lighter than the page reads as a hole punched in it.

     *One exception:* the **notification panel** sits on `bg-band`, one step down, in both themes. On
     `raised` it was a sheet of near-white rows whose only separation was the hairline between them,
     and the rows needed a surface to sit on more than the panel needed to be the lightest thing on
     screen. It does not read as a hole: the hairline border plus the neutral cast carry the
     elevation. Don't copy it to a third surface without the same reason.

  Everything else in the product is flat paper and hairlines. The cast means "this is above the
  page", so it is worth nothing once it is everywhere.

- **The one black exception: `shadow-podium`.** The leaderboard champion is a card standing in front
  of two cards it is touching, and the ink-tinted cast is too shallow to separate them — so that
  single card gets a longer, truly black throw (`--cast-podium`, .32 light / .62 dark, `-deep` on
  hover). It still obeys rules 2 and 3. **Nothing else may use it**; if a second consumer appears,
  the rule was wrong and this note should be revisited rather than copied.

- **Buttons** (`ui/Button`): pill, Space Grotesk uppercase, tracked. Variants are `solid`
  (ink-on-paper inverted), `outline` (hairline + `ink-wash` hover), and the two camp outlines `for`
  / `against`. Sizes `sm|md|lg|bare`. Hover **lifts `-2px`** — it never scales. Nothing here has the
  depth to justify being pressed into the page.

- **Avatars are square** everywhere except the DM panel, and fall back to **ink initials** on a
  raised chip when there is no image. Never tint a fallback with laurel — that gold is earned.

- **`backdrop-filter` traps `position: fixed` children.** A blurred or transformed ancestor becomes
  their containing block, so a `fixed inset-0` modal inside the debate composer (`backdrop-blur-xl`)
  fills the composer rather than the viewport. Overlays go through `ui/Portal`, which renders them at
  `<body>`. The same applies to any `filter`, `transform`, `perspective` or `will-change` ancestor.

---

## §6 Motion

Registered per section component via `useGSAP` + `ScrollTrigger`, scoped refs, all reveals
`once: true`.

### On the landing

| Moment | Behaviour |
|---|---|
| Hero load | headline lines rise staggered → orator plates fade up → lede/CTAs; statues then drift ±14px forever (sine, slow) |
| Everything else | `[data-reveal]` fade-and-rise (30px, `power3.out`, 0.9s) at `top 86%` |
| Loop I→II→III | hairline rule draws across, scrubbed to scroll |
| Quarrel / amphitheater | slow parallax drift, scrubbed |
| **The clock** | scrubbed 48:00:00 → 00:00:00 as you scroll the section; "LOCKED — READ FOREVER" stamps in at zero |
| Verdict split bar | sweeps 50% → 58% on entry, draw band always marked |
| The doors | scale 0.92 → 1.06 scrubbed — you walk toward the light |

Rules: transforms and opacity only; `prefers-reduced-motion` gets everything static-visible, checked
in every section; content is fully readable with JS disabled (the `.landing` class gates the hidden
initial states, and the page ships a `<noscript>` override).

### In the product — quiet, with three earned moments

The landing's scroll choreography does **not** cross over. Pages used many times a day get the
`[data-reveal]` fade-and-rise on lists, `-2px` hover lifts, and CSS transitions. Exactly three
things animate, because in each one something is actually at stake:

| Moment | Where | Behaviour |
|---|---|---|
| The split settling | `arena/ScoreBar` via `useScoreBarReveal` | both halves start level and settle onto the real split |
| The stamp | `motion/VerdictBanner` | the ruling lands from 1.35× — a verdict is an act, not an arrival |
| The count-up | `ui/PointsPopup` | the award ticks up in laurel |

The count-up sits inside an `aria-live` region, so the ticking numeral is `aria-hidden` and a static
`sr-only` line carries the announcement — otherwise a screen reader reads the award ~30 times.

**Entrance animations run once per page per session** (`_utils/animateOnce.ts`, `sessionStorage`).
Playing the leaderboard's stagger again on every visit turns a flourish into a toll on the content.
Interaction feedback is never gated.

---

## §7 The mark

**The braced door.** The arena arch, with the two cases crossed inside it so that they reach the
walls — the crossing is the bracing that holds the door up, not a symbol laid on top of it. `crux`
is Latin for cross, and the decisive point is where two cases meet.

That anchoring is load-bearing, not decorative. A small symmetric X floating clear of the frame is
the anatomy of a checkbox cross, and reads as "closed" or "denied". Reaching the frame turns it into
structure. **If the mark is ever redrawn, the braces must keep touching the arch.**

| Variant | Where | Why |
|---|---|---|
| `LogoMark` — outlined | navbars, footer, login masthead, landing seal, touch icon | hairline weight, sits with the rest of the system |
| `LogoSolid` — filled, braces knocked out | favicon only (`icon.svg`) | a hairline dies at 16px on a background we don't control |
| `Logo` — mark + wordmark | the default lockup | wordmark stays Newsreader italic; only the mark is drawn |

One ink throughout — everything is `currentColor`, so the mark is forest on cream in light and cream
on green-black in dark with no variant.

The touch icon deliberately uses the **outlined** variant despite being an "icon": at 60–120pt the
filled version's knocked-out braces grow dominant enough that the tile starts to read as an
envelope.

The wordmark is type, not vectors — deliberate. Newsreader italic reads well and is already one of
the three faces; drawing custom letterforms is a separate job with a real chance of being worse.

---

## §8 Iconography

**Phosphor** via `react-icons/pi` — thin strokes that sit well beside engravings. Used sparingly:
arrows, seal-check, lock, prohibit, heart, sun/moon. Never decorative icon grids; the engravings
carry the imagery.

---

## §9 Accessibility

- **Keyboard focus is visible everywhere** — a 2px ink outline at 2px offset, set once in
  `globals.css`. A component that ships its own ring opts out with `data-focus-ring="self"`. The
  opt-out has to be an attribute: the rule is unlayered, so it outranks anything in Tailwind's
  `utilities` layer no matter how specific, and a `focus:outline-none` on the element does nothing
  against it.
- **A skip-to-content link** is the first focusable element on every page that ships the shared
  chrome.
- **Cursors are restored once, globally.** Tailwind v4's preflight resets buttons to
  `cursor: default`, which makes controls read as dead. Every control in this app is a pointer
  control, so `globals.css` restores it for `button`, `[role="button"]`, `summary` and `select`
  rather than class by class — a new button is then correct by default.
- **`prefers-reduced-motion`** is honoured in every animated section, and smooth scrolling is behind
  it too.
- Colour is never the only signal: sides carry labels, the verdict carries text, the draw band
  carries a marking.

---

## §10 Voice

Formal but alive; the register of a courtroom that enjoys itself. **Every rule is stated with its
real number** (+25 MVP, cap at 7, −5 season-only) — transparency is a product requirement
(game-theory §19), so marketing copy quotes the actual constants. Buttons say what they do ("Enter
the arena", "Claim your name"). No hype adjectives.

---

## §11 Page anatomy of `/`

Nav (sticky, blurred paper) → Hero (orators + mixed headline) → The Problem (quarrel) → Order of
Proceedings (I·II·III) → Articles I–V (motion / camps / clock / duel / verdict, alternating exhibits:
pass-fail cards, side-lock dialog, countdown, score arithmetic cards, split bar + payout table) →
Record & tiers (bust) → Seasons & prizes (medals) → The Stage (amphitheater full-bleed) → Fair by
design + The Bench (herald) → The Doors (CTA) → Footer (laurel seal).

---

## §12 Where it all lives

| Concern | File |
|---|---|
| Tokens, utilities, the rebound `dark:` variant, focus and cursor rules | `frontend/app/globals.css` |
| Fonts + the pre-paint theme script | `frontend/app/layout.tsx` |
| Chrome | `_components/Navbar.tsx`, `Footer.tsx`, `ConditionalLayout.tsx` (`noNavRoutes` = `/`, `/login`, `/register` — those ship their own) |
| Primitives | `_components/ui/` — `Button`, `Avatar`, `ThemeToggle`, `PointsPopup`, `Pagination`, `Skeleton`, `Reveal`, `Portal`, `AutoGrowTextarea`, `LikeButton`, `Logo` |
| Landing | `frontend/app/page.tsx`; sections in `_components/landing/` (`ui.tsx` holds PillButton, Eyebrow, SectionHead, Plate, Section, reveals) |
| Draw-band geometry | `_utils/drawBand.ts` — read by both split bars, so the feed and the debate page cannot disagree |
| Debate page geometry | `_components/motion/debateLayout.ts` — the arena, the sticky composer and the route skeleton are siblings, so their shared gutter and shell live here or they drift and the page jumps sideways on load |
| The mark | `_components/ui/Logo.tsx` owns the path data; `app/icon.svg`, `app/apple-icon.tsx` and `app/opengraph-image.tsx` are generated from it |
| Generated images | `_components/motion/verdictCard.ts` mirrors the palette as hex (satori cannot read CSS variables) and uses the **light** values on purpose — a certificate is a document you keep. `_utils/brandMark.ts` does the same for the mark, as a data URI, because satori has no mask support. Both are hand-synced with `globals.css` and `Logo.tsx`. |
