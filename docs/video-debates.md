# Video debates

The feature guide. If you are picking this branch up cold, read this before the code.

[`design-system.md §16`](./design-system.md) owns how the page looks;
[`video-debate-redesign-design.md`](./video-debate-redesign-design.md) records why the current
shape was chosen. This file is the map.

---

## §1 What a video debate is

**Two people argue a motion on camera, an AI judges it, and the result is published as a
programme.** Five rounds, each in its own domain. In every round both sides speak once and are
judged; then a grace period runs, and at the end of that grace period the round is ruled. Five
round rulings make the verdict.

**It is editorial and unranked.** A video debate touches **no Arena record, no logic score, no
leaderboard position and no season standing.** Nothing here pays out. This is the single most
common misunderstanding about the feature, which is why the page says "Editorial · Unranked" above
the motion and repeats it in a full sentence underneath.

It is also, right now, **unlisted and password-gated** — see §6.

Three video files make one programme: `host`, `for`, `against`. The host carries the audio and the
clock; the other two are silent camera angles kept on the host's time.

---

## §2 Every file, and what it owns

### The local pipeline — `backend/scripts/video-debate/`

Run by hand, on the editor's machine, before anything reaches the server.

| File | Owns |
|---|---|
| `paths.ts` | where a programme's working files live |
| `io.ts` | reading and writing those files |
| `provider.ts` | the transcription provider call |
| `normalize-transcript.ts` | one provider's output → the common segment shape |
| `merge-transcript.ts` | three per-speaker transcripts → one ordered transcript |
| `inspect-media.ts` | real durations and dimensions of the three files |
| `judge.ts` | runs the judging prompts and collects the rulings |
| `build-manifest.ts` | assembles the manifest from all of the above |
| `validate-package.ts` | the final local check before upload |

### The server — `backend/src/`

| File | Owns |
|---|---|
| `video-debates/manifest.types.ts` | the manifest's TypeScript shape |
| `video-debates/manifest.logic.ts` | validating a submitted manifest, field by field |
| `video-debates/lifecycle.logic.ts` | which status transitions are legal |
| `video-debates/judgment.logic.ts` | judge inputs, narrowing the model's reply, the result |
| `video-debates/transcript.logic.ts` | transcript normalisation on the server side |
| `video-debates/captions.logic.ts` | rendering the transcript as WebVTT |
| `video-debates/public.logic.ts` | **what crosses the wire** — rows → public JSON |
| `video-debates/telemetry.logic.ts` | narrowing one untrusted playback event |
| `video-debates/videoStorage.ts` | R2 upload, verification and delivery checks |
| `video-debates/access.logic.ts` | the password check and the pass token |
| `middlewares/videoPass.ts` | the gate on every public route |
| `controllers/videoDebate.controller.ts` | every handler, public and admin |
| `routes/videoDebate.route.ts` | the public routes |
| `routes/admin.route.ts` | the admin routes, behind `requireRole("admin")` |

### The reader's page — `frontend/app/`

| File | Owns |
|---|---|
| `video-debates/[slug]/page.tsx` | the route: fetch, gate, metadata, JSON-LD |
| `video-debates/page.tsx` | the archive list |
| `video-debates/types.ts` | the response contracts, duplicated at the HTTP boundary |
| `video-debates/access.ts` | reading the pass cookie, recognising a 401 |
| `_components/video-debates/VideoDebateExperience.tsx` | composition and telemetry |
| `_components/video-debates/ThreeStreamStage.tsx` | the three `<video>` tiles |
| `_components/video-debates/PlayerControls.tsx` | the one control surface |
| `_components/video-debates/SegmentedTimeline.tsx` | the programme drawn as its real structure |
| `_components/video-debates/ScoreRail.tsx` | the sticky running score |
| `_components/video-debates/RoundRecords.tsx` | the list of rounds + the final verdict |
| `_components/video-debates/RoundRecord.tsx` | one round |
| `_components/video-debates/KeyArguments.tsx` | the two-column clash, shared |
| `_components/video-debates/VerdictTakeover.tsx` | the portal, scrim and focus trap |
| `_components/video-debates/VerdictPanel.tsx` | what the takeover says |
| `_components/video-debates/VideoDebateGate.tsx` | the password form |
| `_components/video-debates/verdictGate.logic.ts` | when a verdict interrupts |
| `_components/video-debates/timeline.logic.ts` | phase, layout and reveals from the playhead |
| `_components/video-debates/sync.logic.ts` | drift arithmetic, no video involved |
| `_components/video-debates/playbackController.ts` | three elements driven as one |
| `_components/video-debates/useSynchronizedVideos.ts` | the React wiring |
| `_components/video-debates/mediaTelemetry.ts` | fire-and-forget health beacons |
| `_components/video-debates/videoMetadata.ts` | page metadata and the VideoObject |

---

## §3 How a programme gets published

```
  three camera files
        │
        ▼
  transcribe each speaker          provider.ts → normalize-transcript.ts
        │
        ▼
  merge into one transcript        merge-transcript.ts
        │
        ▼
  judge the five rounds            judge.ts
        │
        ▼
  build + validate the package     build-manifest.ts → validate-package.ts
        │
        ▼
  create a draft                   POST /admin/video-debates
        │
        ▼
  upload media to R2, verify       videoStorage.ts
        │
        ▼
  PUT the manifest, validate       manifest.logic.ts
        │
        ▼
  publish                          lifecycle.logic.ts
        │
        ▼
  the page                         GET /video-debates/:slug  (gated)
```

**The media is immutable once published.** Replacing it means a new media version, not an
overwrite, so a cached URL can never serve different bytes than the manifest describes.

---

## §4 The manifest

One JSON document describing the whole programme. `PlaybackManifestV1`:

```jsonc
{
  "version": 1,
  "duration_ms": 496000,
  "timeline": [ /* intro, five rounds, outro — in order */ ],
  "transcript": [ /* every spoken segment, with ids and times */ ],
  "rounds":  [ /* one result per round */ ],
  "final":   { /* the verdict */ }
}
```

A round in `timeline` says **when** things happen:

```jsonc
{
  "type": "round",
  "number": 1,
  "domain": "Technology & AI",
  "opener": "for",                              // who speaks first
  "for":     { "start_ms": 52000,  "end_ms": 118000 },
  "against": { "start_ms": 118000, "end_ms": 184000 },
  "grace":   { "start_ms": 184000, "end_ms": 199920 }   // ruled at end_ms
}
```

The matching entry in `rounds` says **what happened**:

```jsonc
{
  "number": 1,
  "winner": "for",
  "for_score": 55,
  "against_score": 45,
  "ruling": "For side shows AI can check more facts…",
  "points": {
    "for":     [ { "segment_id": "for-r1-0001", "text": "AI can check more facts…" } ],
    "against": [ { "segment_id": "agn-r1-0003", "text": "AI repeats old biases…" } ]
  }
}
```

**`points[].segment_id` is the join.** It points at a `transcript` segment, and that segment's
`start_ms` is *when the argument appears on the page*. This is why the transcript stays in the
manifest even though the reader never sees it — deleting it would take the progressive reveal
with it.

---

## §5 The reveal model — the rule most likely to be broken

**One number decides everything on screen: the host's playhead, in milliseconds.**

`revealAt(manifest, currentMs)` recomputes, from scratch, every time:

- which rounds have been ruled (`currentMs >= round.grace.end_ms`),
- the running score,
- which key arguments have been said yet,
- whether the final verdict is earned.

`layoutAt(manifest, currentMs)` does the same for the stage arrangement.

**Nothing is remembered.** That is the whole design. Because a reveal is a pure function of the
clamped playhead, seeking backwards *un-reveals* precisely what seeking forwards revealed, with no
extra code and nothing to keep in sync.

> **If you add a `useState` that accumulates revealed rounds, you break this.** A monotonic
> "revealed" set cannot un-reveal, so a viewer who scrubs back sees the outcome of a round they are
> about to watch. Every component here takes the reveal as a prop and renders it; none of them
> remembers.

The one thing that *is* edge-triggered rather than derived is the verdict takeover, because
"stop the programme now" is an event, not a state. It lives in `verdictGate.logic.ts` and is still
pure — the caller passes both ends of the step, so nothing is stored:

```ts
verdictCueAt(manifest, previousMs, currentMs, playing) → { kind: "round", round } | { kind: "final" } | null
```

It fires only on **forward playback**: the step must be positive, smaller than
`MAX_PLAYBACK_STEP_MS`, and `playing` must be true. That threshold is what separates playback from
a scrub — otherwise dragging the timeline across five rounds would throw five overlays.
**`MAX_PLAYBACK_STEP_MS` is display-only and is not a game constant; it must never reach `/rules`.**

---

## §6 The access gate

The feature is being shown to a few people before it is announced, so it is both **unlisted** and
**password-gated**.

**Unlisted** means the landing feature, the profile appearances and the sitemap entries are all
removed, and both routes carry `robots: { index: false, follow: false }`. The components are still
on disk, unrendered — restoring them is a one-line change.

**Gated** means:

| Piece | Where |
|---|---|
| The password | `VIDEO_DEBATE_PASSWORD` in the backend environment |
| The check | `access.logic.ts` — SHA-256 both sides, then `timingSafeEqual` |
| The pass | a `crux_video_pass` cookie: a JWT with `scope: "video-debate"`, 30 days, `httpOnly` |
| The gate | `requireVideoPass` on **every** route in `videoDebate.route.ts` |
| The form | `VideoDebateGate.tsx`, posting to `/api/video-debates/access` |

Four things are deliberate:

1. **It fails closed.** No password configured means nobody gets in, in *every* environment
   including local development. Forgetting the variable looks like a broken feature — that is the
   accepted cost of never accidentally shipping this open.
2. **A wrong password and a misconfigured server answer identically.** Both are `401`. A stranger
   learns nothing.
3. **The scope claim is load-bearing.** An ordinary user token is signed with the same secret;
   without checking `scope`, any logged-in user's token would open the programme.
4. **The gate form posts through the `/api` rewrite, not to the API host** — `Set-Cookie` has to
   land on the frontend origin or the browser will never send it back. Server components must
   forward the cookie by hand (`videoPassHeaders()`), because `serverApi` talks to the API directly
   and inherits nothing.

### What the gate does not protect

**The video files are public.** `debate.media[role]` are absolute URLs to public R2 objects on a
custom domain, and anyone holding one can fetch it without a password. The gate protects the page,
the manifest, the rulings, the key arguments and the verdict — not the bytes. Signed URLs would be
separate work. **Do not describe the media as private.**

---

## §7 Running one

**Local setup.** Put `VIDEO_DEBATE_PASSWORD=something` in `backend/.env`, or every video-debate
page will refuse you too. The variable is documented in `.env.example`.

**Sharing with a viewer.** Send them the password out of band and the URL. They enter it once; the
cookie lasts 30 days.

**Publishing.** Follow [`video-debate-operator-walkthrough.md`](./video-debate-operator-walkthrough.md)
for the step-by-step, and [`video-debate-post-edit-runbook.md`](./video-debate-post-edit-runbook.md)
for fixing a published programme.

**Previewing before publication.** `/admin/video-debates/[id]/preview` renders the exact same
`VideoDebateExperience` a reader gets — including the verdict takeovers — behind the admin guard
rather than the password.

---

## §8 Things that will surprise you

- **Never put a `<noscript>` block on this page.** Browsers parse `<noscript>` contents as raw text
  when scripting is enabled, so React's streaming markers inside it never become real DOM nodes,
  and its reveal script throws once per marker. The page shipped 165 uncaught `TypeError`s a load
  for exactly this reason. The host video carries native `controls` until hydration instead.
- **`play()` rejects with `AbortError` whenever a `pause()` supersedes it**, and the controller
  pauses the group routinely while waiting on a seek. That rejection is not a media failure; it
  used to degrade a healthy angle to "Angle unavailable" for the rest of the programme.
- **The three tiles never leave the DOM and never change order in it.** Only their grid placement
  changes — unmounting a `<video>` would drop its buffer and its place in the programme.
- **Followers are muted, and the controller re-asserts it** on every `volumechange`. The host owns
  the audio.
- **The sides are FOR/AGAINST in the product and `affirmative`/`negative` elsewhere in the
  database.** The video feature uses `for`/`against` throughout.
- **`ScoreRail` measures `[data-navbar]` with its own copy of the ten lines in
  `motion/StickyMotion`.** Deliberate duplication while the two pages are owned separately; a third
  consumer is the signal to extract it.
