# Crux Frontend — UX/UI Audit

*Audited 2026-07-13 on branch `frontend-makeover` (HEAD `7c39448`). Read-only audit: code review of `frontend/` plus live inspection of the running dev server (desktop 1280px+ and 390px mobile viewports) across `/`, `/login`, `/register`, `/statement`, `/argument/CRX-1-A`, `/profile/1`.*

**Makeover direction (agreed):** audience = general consumers · vibe = sleek dark-tech · motion = tasteful accents (GSAP).

---

## 1. Stack & architecture

| Aspect | Finding |
|---|---|
| Framework | Next.js 16.2.7 (App Router) + React 19.2.4, TypeScript. `output: "standalone"`, `/api/*` rewrite proxy to the backend. |
| Styling | Tailwind CSS v4 (CSS-first config — no `tailwind.config.js`; all tokens in `frontend/app/globals.css` `@theme`). All styles are utility classes in JSX. Only two custom classes: `.perspective-grid`, `.technical-grid` (duplicates of each other). |
| Animation libraries | **None installed.** Only Tailwind utilities (`animate-pulse`, `animate-ping`, `animate-spin`, `transition-*`, `active:scale-95`). Greenfield for GSAP. |
| Icons / misc | `react-icons` (13+ mixed families), `react-markdown`, `axios`, `jwt-decode`. Root `package.json` declares `shadcn` but it's unused (no `components.json`). |
| Data | Server components fetch via `app/axios.server.ts`; client components via `app/axios.ts` (Bearer token from localStorage + 401→refresh interceptor). No global state library. |
| Dev server | `npm run dev` in `frontend/` → :3000. Backend Express on :8000; Postgres via `docker-compose.dev.yml`. Note: Docker compose references backend port 4001 while the backend defaults to 8000 — port drift worth fixing eventually. |

### Routes

| Route | File | Purpose |
|---|---|---|
| `/` | `app/page.tsx` | Arena home. 70/30 split: `ActiveArguments` (featured + trending/newest cards, tabs) + `ArenaSidebar` (trending topics, top debaters, system health). |
| `/login`, `/register` | `app/(auth)/*/page.tsx` | Themed auth forms (navbar/footer hidden via `ConditionalLayout`). Register has a marketing side panel. |
| `/statement` | `app/statement/page.tsx` | "Issue a Verdict" claim submission: domain picker, 35–120 char claim, two-step AI eligibility check → broadcast. |
| `/argument/[id]` | `app/argument/[id]/page.tsx` | Debate arena: big serif statement headline, affirmative/negative probability bar, The Case For/Against columns (AI analysis + comments), fixed-bottom `ArgumentInput`. |
| `/profile/[id]` | `app/profile/[id]/page.tsx` | User head info, reputation bar chart, active statements, CTA banner. |
| `/leaderboard`, `/about`, `/rules`, `/archive` | stubs | "Coming Soon" placeholders — but `/leaderboard` is linked in the main nav and footer, `/archive` is linked from search results. |
| `/argument`, `/profile` (no id) | redirect to `/` | — |

### Reusable components (`app/_components/`)

- **Layout:** `ConditionalLayout`, `Navbar`, `Footer`, `SearchBar` (debounced modal search — well built).
- **Arena cards:** `MainTrendingArenaCard`, `TrendingArenaCard`, `NewestCard` — three near-identical avatar + domain + headline + probability-bar cards that should share one base. `ThesisCard` (CTA), `ActiveArguments` + tab components, sidebar trio (`TrendingTopics`, `TopDebaters`, `SystemHealth` + card children).
- **Argument:** `ArgumentHeader`, `ArgumentProbability`, `ArgumentArena`, `TheCaseFor` / `TheCaseAgainst` (copy-paste duplicates differing only in color/side), `UserCommentCard`, `ArgumentInput`.
- **Statement:** `StatementForm`, `StatementHeader`, `CruxAIRoleInfo`.
- **Profile:** `UserHeadInfo`, `ReputationBreakdown`, `ActiveStatements`, `Challenge`.
- **Dead code:** `DebateHistory` + `HistoryItem` (imported in `profile/[id]/page.tsx` but never rendered), `HighStakesTab` (renders literal debug text, unreachable — tab exists in JSX but not in `tabList`), commented-out search/notification markup in `Navbar.tsx:39-57`.

### Design tokens (`app/globals.css` `@theme`)

- **Palette (Material-3-style dark ramp):** background/surface `#131314`; surface containers `#0e0e0f → #1c1b1c → #201f20 → #2a2a2b → #353436`; text `#e5e2e3`; muted `--color-outline #859399`, `--color-outline-variant #3c494e`.
- **Accents:** primary cyan `#a4e6ff` (+ `primary-container #00d1ff`), secondary red `#ffb3b2` (+ `secondary-container #ff525d`), tertiary amber `#ffd690`/`#f9b400`, error `#ffb4ab`.
- **Radius:** `--radius/-lg/-xl: 0px` — deliberately sharp; only pills (`radius-full`) are round.
- **Fonts declared:** `--font-headline: "Newsreader", serif`, `--font-body: "Manrope", sans-serif`, `--font-label: "Space Grotesk", monospace`.
- **Critical gap:** **Manrope and Space Grotesk are never loaded** (no `next/font` import anywhere), so `font-body` renders system sans and `font-label` renders system mono. `layout.tsx` loads Geist/Geist_Mono but nothing references them. Newsreader is re-instantiated per-component ~11–13 times instead of once, and `font-headline` (used on register/statement headers) falls back to generic `serif` — a *different* serif than the `newsreader.className` usages.
- **Breakpoints/spacing/type scale:** Tailwind defaults; usage skews to extremes — `text-[9px]`/`text-[10px]` tracked-out mono labels vs `text-4xl`–`text-8xl` italic serif headlines.

---

## 2. Live observations (dev server)

- **Home** is the strongest page: clear hierarchy (featured card → trending grid → CTA), coherent dark-terminal identity, cyan/red duotone reads as affirmative/negative.
- **Argument page** has the best single moment in the app: the huge serif headline with italic cyan keyword ("AI should be granted *legal personhood*.") over the full-width probability bar.
- **Profile page** looks unfinished: the reputation "chart" renders as one giant flat cyan slab (degenerate with sparse data), and Active Statements is a huge solid `#a4e6ff` block that's ~70% empty space.
- **Register page** card sits in the upper-left with a large dead void below/right — the absolutely-positioned background layers sit in a `<main>` without `min-h-screen relative` (login does it correctly), so the page reads as broken-centered.
- **Mobile (390px) is broken in the navbar:** the search box overlaps the Crux logo, "NEW STATEMENT" wraps to two lines, and the profile icon is clipped off the right edge. Root cause: `SearchBar.tsx:66` `lg:min-w-150` (600px) plus no responsive collapse for the nav row.
- **Every avatar on every page is the same grayscale stock face** (one hotlinked Google-hosted placeholder URL for all users); comment cards on the argument page show *empty* gray squares where an icon/avatar should be.
- Console is clean (only "input should have autocomplete" hints on password fields).

---

## 3. STRENGTHS (preserve these)

1. **A real, committed identity already exists** — dark near-black surfaces, sharp 0px corners, left-accent-border cards, tracked-out uppercase mono labels, big italic serif headlines. This is rare; the makeover should *refine* it, not replace it. It's already 70% of the way to "sleek dark-tech."
2. **Semantic token system** — the M3-style ramp in `globals.css` means most components use `bg-surface-container-low`, `text-outline`, `border-outline-variant` etc. Recoloring the app is nearly a one-file change.
3. **Cyan vs red is information design, not decoration** — affirmative/negative mapping is consistent across probability bars, case columns, and labels. A genuine product asset.
4. **The featured-card hierarchy on home** (`MainTrendingArenaCard` at `text-4xl` serif with the live bar) gives the feed a clear entry point.
5. **SearchBar UX** is genuinely good: 300ms debounce, `AbortController`, loading + empty + no-results states, grouped results. Best-engineered component in the app.
6. **The argument-page hero** (serif statement + keyword highlight + full-width probability bar) is the app's signature moment and the natural anchor for hero motion.
7. **Sensible App Router split** — server components fetch on the server for `/`, `/argument/[id]`, `/profile/[id]`; auth pages are isolated in a route group with chrome hidden.
8. Existing micro-details worth keeping: `active:scale-95` press feedback, grayscale→color avatar hover, `hover:translate-x-1` arrow nudge on login.

## 4. WEAKNESSES (specific)

1. **The typography system is only ⅓ wired up** — the single biggest visual-fidelity issue. `Manrope` (body) and `Space Grotesk` (label) are declared in `globals.css:55-57` but never loaded; the terminal-label aesthetic currently renders in default system mono. Geist is loaded in `layout.tsx` but unused. Newsreader is instantiated in ~11 files without a CSS variable, so `font-headline` usages (e.g. `register/page.tsx:54`, `StatementHeader.tsx:7`) render a *different* generic serif than `newsreader.className` usages. The Navbar/Footer logos use a third serif (`font-serif`).
2. **Mobile navbar is broken** (see live observations) — `SearchBar.tsx:66` + `Navbar.tsx` row never collapses.
3. **Profile page reads unfinished**: `ReputationBreakdown` degenerates into a flat cyan slab with sparse data (`Math.max(...data)` also throws on empty); `Challenge`/`ActiveStatements` are large flat `bg-primary` slabs with mostly empty space; `bg-noise` class (`Challenge.tsx:10`) doesn't exist so the intended texture never renders.
4. **Register page layout is unbalanced** — card floats top-left with a dead void (missing `min-h-screen relative` on `register/page.tsx:43-46`; compare `login/page.tsx:43` which is correct).
5. **Copy is hostile to general consumers.** "NOM DE GUERRE / FULL NAME", "ENCRYPTION KEY (PASSWORD)", "IDENTIFY YOUR INTERFACE (EMAIL)", "INITIALIZE THESIS", "New to the protocol?". Fun flavor for a dev audience, opaque for consumers. Keep the arena *theme*, drop the jargon *labels* on functional elements (especially form fields).
6. **No loading/error/empty states at the page level.** No `loading.tsx`, `error.tsx`, or `not-found.tsx` anywhere. Server pages 500 on API failure (`argument/[id]/page.tsx:11-12`, `profile/[id]/page.tsx:11`). `StatementForm` leaves `loading:true` forever if the AI call fails (`StatementForm.tsx:65-116`). `NewestTab.tsx:47` renders a literal `0` when the list is empty (`cardsData.length && ...`).
7. **Stub pages are reachable from primary nav** — "Leaderboard" in the navbar and footer leads to "Coming Soon!" in default styling; `/archive` (linked from search results) renders the word "Archive".
8. **Dead template residue** — `material-symbols-outlined` spans wrapping react-icons everywhere (font never loaded), invalid classes (`text-md` at `UserCommentCard.tsx:74`, `grayscale-60` at `TopDebatersCard.tsx:22`), commented-out markup in `Navbar.tsx`, orphaned `DebateHistory`/`HighStakesTab`, metadata description `"Nitesh OP in the Chat!"` (`layout.tsx:18`).
9. **Bug:** `ArgumentProbability.tsx:21` divider position `left: \`${affirmativeProbability}\`` is missing the `%` unit — the white marker positions in px, not percent.
10. **Disabled ≠ disabled:** `StatementForm.tsx:187` submit uses a literal `disabled` string class; disabled and enabled states look identical.

## 5. INCONSISTENCIES

1. **Button paddings for the same primary-CTA style:** `px-4 py-2` (Navbar), `px-10 py-3` (ThesisCard), `py-4` (login), `py-5` (register), `px-10 py-4` (Challenge), `px-12 py-4` (StatementForm), `px-6 py-2 text-[10px]` (MainTrendingArenaCard) vs `px-8 py-4 text-xs` (ArgumentInput). Seven variants of one button.
2. **Letter-spacing drift on identical label styles:** `tracking-widest` vs `tracking-[0.2em]` vs `tracking-[0.25em]` vs `tracking-[0.3em]`.
3. **Three serifs for one brand** (Newsreader via className, generic `serif` via `font-headline` fallback, Tailwind `font-serif` on logos) — see Weakness #1.
4. **Token bypass in newer components:** `bg-neutral-950` (Navbar/Footer), `bg-zinc-900`/`border-neutral-700`/`text-gray-400/500` (SearchBar), `bg-[#0a0f12]` (AI-analysis panels), `text-stone-600`/`text-neutral-600` placeholders — all sidestep the semantic palette.
5. **Probability-bar colors differ per page:** home bars use saturated `#00d1ff`/`#ff525d` (primary-container/secondary-container); the argument page bar uses soft `#a4e6ff`/pink. Same data element, two intensities.
6. **Radius system violated only by SearchBar:** trigger is `rounded-md` (0.375rem — the only soft-cornered control in the app) while its modal's `rounded-xl` is themed back to 0px. Inconsistent in both directions.
7. **Ad-hoc shadows, six different values, no scale:** `0_0_20px rgba(164,230,255,0.05)`, `inset_0_0_20px .03`, `0_0_10px .3`, `0_0_20px rgba(255,82,93,0.1)`, `0_0_15px rgba(0,209,255,0.1)`, `0_0_15px rgba(255,255,255,0.8)`.
8. **Duplicated-but-divergent cards:** `TrendingArenaCard` vs `NewestCard` (heading `text-xl` vs `text-2xl`, domain label `text-[10px]` vs `text-[12px]`); `TheCaseFor` vs `TheCaseAgainst` duplicate a huge markdown style block verbatim.
9. **White CTA outlier:** home "INITIALIZE THESIS" is a white/on-surface button while every other primary action is cyan.
10. **Icon families:** 13+ react-icons sets mixed (`cg`, `io`, `md`, `lu`, `go`, `ci`, `di`, `fa`, `tb`, `ri`, `vsc`, `hi2`, `fi`) — mismatched stroke weights and metaphors.

## 6. ANIMATION OPPORTUNITIES (GSAP) — ranked impact vs effort

Setup assumption for all items: `gsap` + `@gsap/react` (`useGSAP`), ScrollTrigger where noted, and **every** animation registered inside `gsap.matchMedia()` with a `(prefers-reduced-motion: reduce)` branch that skips to end state.

| # | Opportunity | Where | Impact | Effort |
|---|---|---|---|---|
| 1 | **Probability-bar draw + % count-up** — bars grow from 0 to value with `power3.out`, numbers tick up (`textContent` snap). This animates the product's signature data element everywhere it appears. | `ArgumentProbability`, `MainTrendingArenaCard`, `TrendingArenaCard`, `NewestCard` | High | Small |
| 2 | **Home feed entry stagger** — featured card leads, trending grid follows (`y: 24, opacity: 0`, `stagger: 0.06`), sidebar cascades after. One `useGSAP` in `ActiveArguments` + one in `ArenaSidebar`. | `/` | High | Small |
| 3 | **Argument-page hero reveal** — statement headline reveals per-line (SplitText or manual line wrap), keyword highlight sweeps in, then the probability bar draws (item 1) as the finale of one timeline. | `ArgumentHeader` | High | Medium |
| 4 | **Micro-interactions** — card hover lift + accent-border glow (tween, not CSS jump), like-button pop (`scale` keyframes on the count), CTA hover sheen. Small `gsap.to` handlers; respects existing `active:scale-95`. | cards, `UserCommentCard`, buttons | Medium | Small |
| 5 | **Tab content transition** — trending↔newest crossfade + 12px slide on tab switch instead of instant swap. | `ActiveArguments` | Medium | Small |
| 6 | **Search modal choreography** — backdrop fade + panel scale-in (0.98→1), results list soft stagger *on open only* (never per keystroke). | `SearchBar` | Medium | Small |
| 7 | **Case-columns scroll reveal** — For/Against columns slide in from their respective sides once, on scroll into view (ScrollTrigger, `once: true`); AI key-points stagger. | `ArgumentArena`, `TheCaseFor/Against` | Medium | Medium |
| 8 | **Auth-page entrance** — card rise + fade, grid background subtle drift/parallax, "SYSTEM_READY" ticker draw. Sets the tone at first touch. | `/login`, `/register` | Medium | Small |
| 9 | **New-comment insertion** — when a comment posts, it enters its column with a height+fade tween and the probability bar re-tweens to the new split (live-arena feel). | `ArgumentArena`, `ArgumentInput` flow | Medium | Medium |
| 10 | **Route transitions** — brief exit/enter fades between pages via a template/transition wrapper. App Router makes this the fiddliest item; do last, keep under 200ms. | global | Low–Medium | Large |

## 7. ANIMATION ANTI-OPPORTUNITIES (do not animate)

- **`ArgumentInput` typing/submit path** — it's the core loop; posting a comment must feel instant. The insertion animation (opp. 9) happens in the *list*, never delaying the input reset.
- **Search results per keystroke** — results re-render every debounce tick; staggering them repeatedly would strobe. Animate the modal open only.
- **Form validation/errors** (login, register, statement) — errors must appear immediately; no slide-ins on field errors.
- **Navigation clicks** — never gate route changes behind an exit animation longer than ~150–200ms; consumers read that as slowness.
- **Probability bars on live data updates** — animate on first paint (and on explicit new-comment events), but don't re-tween on every poll/refresh or the numbers feel untrustworthy.
- **Persistent loops** — the existing `animate-pulse`/`animate-ping` status dots are already borderline; don't add more infinite motion, and pause all of it under `prefers-reduced-motion`.
- **Dense comment lists** — beyond the single-item insertion, no scroll-linked effects inside columns of user text.

## 8. ASSET GAPS

- **Avatars:** one hotlinked Google-hosted placeholder (`app/_utils/constants.ts`) used for *every* user on every card — same grayscale face for "Nitesh Kumar", "Vector Shift", "Logic Lord". Needs local/default avatar system (e.g. generated initials/identicons in the brand style). Comment cards show *empty* gray boxes (`UserCommentCard.tsx:50-53` renders an icon-less span).
- **Register hero:** another hotlinked `lh3.googleusercontent.com` image with `data-alt` instead of `alt`.
- **No `next/image` anywhere** — all raw `<img>`, no optimization/lazy-loading.
- **No logo asset** — wordmark is styled text in three different serifs; no SVG mark, no OG/social image, no `apple-touch-icon`; duplicate favicons (`app/favicon.ico` + `public/favicon.ico`).
- **Icons:** 13+ mixed react-icons families; standardize on one set (e.g. Phosphor) with one stroke weight. Dead `material-symbols-outlined` wrappers throughout.
- **Metadata:** title is bare "Crux"; description is `"Nitesh OP in the Chat!"`.
- **Texture:** `bg-noise` (Challenge.tsx:10) references a non-existent utility — the intended grain never ships; the flat cyan slabs on profile need it most.

## 9. ACCESSIBILITY NOTES

- **Contrast risks (fg on bg):** `#859399` metadata labels at `text-[10px]` uppercase on `#1c1b1c` (borderline for that size); `text-stone-600 #57534e` placeholders on `#353436` inputs (fails); `text-outline/50` placeholder in `ArgumentInput.tsx:49` (fails); `text-neutral-500/600` fine print on near-black (low); `text-[10px]` error messages (legible color, too small).
- **Keyboard/semantics:** search opener is a `<div onClick>` with no role/tabIndex/keyboard handler (`SearchBar.tsx:67-74`); footer "social" buttons are non-focusable `<div>`s (`Footer.tsx:38-47`); Navbar is a `<div>` not `<nav>`; no `<main>` landmark in the shared layout (only register has one); no skip-to-content link.
- **Focus:** no global `:focus-visible` styling; `focus:outline-none` without full replacement on search input (`SearchBar.tsx:87`) and statement textarea (`StatementForm.tsx:153`); links/cards rely on browser defaults against near-black.
- **Alt text:** missing (`TopDebatersCard.tsx:21-25`, register hero) or wrong — every avatar is `alt="Aurelius_X"` or `alt="Dr. Aris Thorne"` regardless of the actual user.
- **Labels:** `ArgumentInput` and search input have placeholder-only labeling; password inputs lack `autocomplete` attributes (console flags this).
- **Motion:** zero `prefers-reduced-motion` handling today (perpetual pulse/ping dots run for everyone). **Every GSAP addition must go through `gsap.matchMedia()` with a reduced-motion branch**; also gate the existing pulse/ping utilities.

## 10. TOP-10 PRIORITIZED MAKEOVER LIST

Ranked for: general consumers · sleek dark-tech · tasteful motion accents.

1. **Wire up the real typography system** — load Manrope + Space Grotesk via `next/font`, expose all three fonts as CSS variables in `layout.tsx`, map them to `--font-headline/body/label` in `@theme`, delete the ~11 per-component Newsreader instantiations, drop unused Geist. Single biggest visual jump in the app. **[high impact / small effort]**
2. **Fix mobile: navbar collapse + responsive sweep** — cap/collapse the search bar (icon-only below `lg`), stack the nav row, clamp the `text-7xl/8xl` headlines, verify the fixed `ArgumentInput` on small screens. The app is currently broken for phone users — fatal for a consumer audience. **[high / medium]**
3. **GSAP foundation + signature motion** — install `gsap` + `@gsap/react`; central `matchMedia` reduced-motion pattern; ship opportunities 1–3 (probability-bar draws + count-ups, home feed stagger, argument hero timeline). **[high / medium]**
4. **Unify the component system** — one `Button` (primary/secondary/ghost; one padding + tracking scale), merge `TheCaseFor`/`TheCaseAgainst` into `CaseColumn side=`, base `ArenaCard` under the three feed cards, delete dead code (`DebateHistory`, `HighStakesTab`, `material-symbols` wrappers, commented markup, invalid classes) and fix the `ArgumentProbability` `%` bug. Prerequisite for consistent polish + hover motion. **[high / medium]**
5. **Page-level states** — `loading.tsx` skeletons (home, argument, profile), `error.tsx`, branded `not-found.tsx`; fix `StatementForm` stuck-spinner path and `NewestTab` literal-`0` empty state; give disabled buttons a real disabled look. Makes it feel finished. **[high / medium]**
6. **Color + surface discipline** — migrate `neutral/zinc/gray/stone` and hex literals to tokens; pick one probability-bar color pair (lean toward the softer argument-page pair, desaturated); define 2–3 tokenized glow shadows; fix the white-CTA outlier; add the missing noise texture so profile's flat cyan slabs get depth. **[medium / small]**
7. **Accessibility pass** — `<nav>`/`<main>`/skip link, real `<button>`s for search trigger + footer icons, global `:focus-visible` style, correct alt text, input labels + `autocomplete`, bump the failing placeholder/fine-print contrast, `prefers-reduced-motion` for existing pulse/ping. Cheap, high-trust. **[high / small]**
8. **Asset system** — brand-styled default avatars (initials on surface-container, cyan/red ring by stance) replacing the single hotlinked face; local register hero; `next/image` everywhere; one icon family; favicon/OG/meta cleanup (kill "Nitesh OP in the Chat!"). **[medium / medium]**
9. **Consumer copy pass** — keep the arena flavor in headlines ("Issue a Verdict", "The Case For"), replace jargon on functional elements: form labels become "Email", "Password", "Full name"; "INITIALIZE THESIS" → "Start a debate"; "New to the protocol?" → "New to Crux?". **[medium / small]**
10. **Finish or hide stub pages** — at minimum a branded "coming soon" treatment for `/leaderboard` (it's in primary nav) and remove/disable footer links to `/rules`, `/about`, `/archive` until real; ideally ship a simple real leaderboard (data already exists in `TopDebaters`). **[medium / medium–large]**

Remaining GSAP items (micro-interactions, tab/search/auth choreography, comment insertion, route transitions) slot in after #3 as polish passes, in the order given in section 6.
