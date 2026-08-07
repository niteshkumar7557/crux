# Crux Video Debate — First-Run Operator Walkthrough

**Status:** working notes, not committed. Written for the first real production run on an Ubuntu
workstation with a 4 GB NVIDIA card (Whisper on CPU).

This is the practical companion to [`video-debate-post-edit-runbook.md`](./video-debate-post-edit-runbook.md).
The runbook is the authoritative checklist and starts at export; this file starts at "I am about to
record" and adds the Ubuntu setup, the exact commands, and the traps that are only visible from the
code. Where the two disagree, the runbook wins.

---

## Phase 0 — Prerequisites (once)

### A. Apply the migration

The video tables have never been created on any database. The admin page will not work until:

```bash
cd backend && npm run db:migrate:dev   # applies 0018_create_video_debates.sql
```

### B. Configure R2

Without these, every video route returns `503 video_storage_unconfigured`. In `backend/.env`:

```bash
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_VIDEO_BUCKET=<bucket>
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_VIDEO_PUBLIC_URL=https://<your-video-domain>   # custom domain, never *.r2.dev
CLIENT_URL=https://cruxdebate.site                # checked as the CORS origin
```

In production the store refuses a `publicUrl` that is an `r2.dev` host, an R2 API host, or the same
origin as the endpoint.

### C. Ubuntu tooling

```bash
sudo apt update && sudo apt install -y ffmpeg python3-pip pipx
ffprobe -version                    # the inspector shells out to ffprobe; it must be on PATH
pipx install whisper-ctranslate2    # CPU-fast Whisper, same CLI and JSON as openai-whisper
sudo apt install -y rclone && rclone config    # add an "r2" S3 remote
```

**On the 4 GB card:** `large-v3` does not fit comfortably, so CPU is the right call.
`whisper-ctranslate2` (CTranslate2 backend) is several times faster than `openai-whisper` on CPU
for identical output. Budget roughly 20–60 minutes per 10-minute track depending on cores. If that
is too slow, try `--model distil-large-v3` on CPU; only if desperate, `--device cuda
--compute_type int8` with `distil-large-v3` on the 4 GB card.

### D. Configure the judge LLM

Six small JSON calls per debate — not worth running locally. In `backend/.env`:

```bash
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-...
LLM_MODEL=<a strong instruct model>
```

For a local runner instead: llama.cpp's server on `--port 8080`, then
`LLM_BASE_URL=http://localhost:8080/v1` and `LLM_API_KEY=local` (any non-empty string — the
provider refuses to run without one). The request sends
`response_format: {"type":"json_object"}`, so the server must honour it.

---

## Phase 1 — Recording day

No timestamps are written yet. The job is to record so that timestamps are *possible* later.

1. **Three cameras, four audio captures:** isolated host mic, isolated FOR mic, isolated AGAINST
   mic, plus the mixed programme audio. The isolated tracks are what get transcribed — transcribing
   the mix puts the host's words in a debater's mouth.
2. **One continuous take.** Do not stop between rounds; aligning three cameras across takes is the
   biggest single source of pain.
3. **Sync clap** in frame of all three cameras before the intro.
4. **Record the coin toss.** It decides the Round 1 opener; openers alternate after that
   (R1/R3/R5 toss winner, R2/R4 the other side).
5. **Per round** the host: announces round number and domain → gives the start signal → runs a
   **30.000-second** timer → calls cutoff → runs grace → closes the round.
6. **All five rounds run**, even after a side has already taken three. No exceptions.
7. Finished programme stays under **10:00.000** — a hard validator limit.

---

## Phase 2 — Edit in DaVinci Resolve

**This is where timestamps are born.** Everything downstream reads them.

1. Cut all three angles on one timeline, identical zero, identical last frame.
2. Place a **marker at every boundary**: intro start/end, and per round the first-turn start,
   second-turn start, grace start, grace end, then outro start/end. That is 2 + (5 × 4) + 2.
3. Every judged turn must be **30.000 s ± 100 ms**. Check each one against the marker readout.
4. Lock and snapshot the project. Later fixes start from this version, never a newer timeline.

Record the marker times in milliseconds from zero; they go into `boundaries.json` in Phase 7.

---

## Phase 3 — Create the Crux draft *before* exporting

The media prefix comes from the server, not from you.

1. Start the app, sign in as admin, open **`/admin/video-debates`**.
2. **New draft** → slug, motion, host/FOR/AGAINST display names (+ optional Crux user ids), the five
   domains **in round order**, and the Round 1 opener from the coin toss.
3. Motion, domains and opener are **immutable** after save. A mistake means a new draft.
4. **Download debate.json**, and note the `rclone` prefix on the panel. That `media-id` is the only
   prefix this media version will ever use.

---

## Phase 4 — Build the package directory

```bash
mkdir -p ~/video-debates/<slug>/{resolve,exports-resolve,publish,audio,metadata,transcript/raw,judgment/raw,output,checks}
mv ~/Downloads/debate.json ~/video-debates/<slug>/metadata/debate.json
```

Every path the scripts read is fixed — `publish/host.mp4`, `metadata/boundaries.json`,
`transcript/raw/for.json` and so on. Do not rename anything.

---

## Phase 5 — Export and remux

Export all three from the **same in/out range**: MP4, H.264, 1280×720, ~2.5 Mbps, 4:2:0, 2-second
keyframes, identical frame rate, AAC 128 kbps at 48 kHz.

Audio routing: `host-resolve.mp4` carries the **mixed** programme audio; `for-` and
`against-resolve.mp4` carry their **isolated** mics.

```bash
cd ~/video-debates/<slug>
ffmpeg -i exports-resolve/host-resolve.mp4    -map 0 -c copy -movflags +faststart publish/host.mp4
ffmpeg -i exports-resolve/for-resolve.mp4     -map 0 -c copy -movflags +faststart publish/for.mp4
ffmpeg -i exports-resolve/against-resolve.mp4 -map 0 -c copy -movflags +faststart publish/against.mp4
```

Then make `publish/poster.webp` — 1600×900, under 500 KB, both debaters labelled FOR and AGAINST,
**no winner or score on it**.

---

## Phase 6 — Inspect the media

```bash
cd ~/crux/backend
npm run video:inspect -- "$HOME/video-debates/<slug>"
```

Writes `metadata/media-probes.json` only when all four assets satisfy the V1 contract. On failure,
fix the source export and re-run — nothing downstream works without this file.

---

## Phase 7 — Extract transcription audio, then write the timestamps

```bash
cd ~/video-debates/<slug>
ffmpeg -i publish/for.mp4     -vn -ac 1 -ar 16000 -c:a pcm_s16le audio/for.wav
ffmpeg -i publish/against.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le audio/against.wav
# host: export the ISOLATED host mic from Resolve, full length, silence included
#       -> audio/host-isolated.wav
```

All three WAVs must span the **whole common timeline**, including leading silence. A WAV that starts
at someone's first word drifts the entire transcript.

Now write `metadata/boundaries.json` from the Resolve markers (milliseconds from zero):

```json
{
  "version": 1,
  "duration_ms": 480000,
  "intro": { "start_ms": 0, "end_ms": 30000 },
  "rounds": [
    { "number": 1, "domain": "Education", "opener": "for",
      "for":     { "start_ms": 30000, "end_ms": 60000 },
      "against": { "start_ms": 60000, "end_ms": 90000 },
      "grace":   { "start_ms": 90000, "end_ms": 115000 } }
  ],
  "outro": { "start_ms": 455000, "end_ms": 480000 }
}
```

Five round objects, numbered 1–5. The merger enforces one **contiguous** programme: intro starts at
0, each round's opener turn starts exactly where the previous grace ended, second turn starts where
the first ends, grace starts where the second ends, and the outro ends exactly at `duration_ms`.
`domain` strings must match the draft exactly.

Check it against the video twice. A wrong boundary silently moves a sentence between judged and
grace.

**Every judged turn must last 30 s ± 100 ms** (`MIN_JUDGED_TURN_MS`/`MAX_JUDGED_TURN_MS`). This is
the constraint that makes boundary-writing harder than it looks, so plan around it:

- You cannot move one edge on its own. Moving the edge between a round's two turns lengthens one and
  shortens the other, and both have only 100 ms of slack.
- What you *can* move freely is where a round's 60 s judged block **starts**, because the preceding
  grace has no required length. Slide the whole block; don't stretch it.
- Give the buzzer real authority while recording. A turn the host let run to 31 s cannot be
  represented at all — a full second of that debater's speech will land in grace, unjudged.

**Do not write boundaries at whole seconds taken from the running order.** Speech does not stop on a
stopwatch. A boundary landing mid-word fails with `unsplittable_boundary_segment`, because no window
contains that word. After Phase 8, read the exact word times out of the raw whisper JSON and slide
each round's block so all three of its edges fall in gaps between words.

The host is the hard case. Between a round's two judged turns there is **no** non-judged window, so
the host's "your time starts now" has nowhere legal to sit — inside a judged turn only that turn's
debater may speak. Either keep the host silent between the two turns, or delete those procedural
lines in Phase 9. They are not argument and must never reach the judge.

---

## Phase 8 — Transcribe

```bash
cd ~/video-debates/<slug>
whisper-ctranslate2 audio/for.wav audio/against.wav audio/host-isolated.wav \
  --model large-v3 \
  --device cpu --compute_type int8 --threads $(nproc) \
  --task transcribe --language en \
  --word_timestamps True \
  --output_format json --output_dir transcript/raw
```

Produces `transcript/raw/for.json`, `against.json` and `host-isolated.json`. The **filename supplies
the speaker identity** — do not rename them.

Set `--language` explicitly (auto-detect can flip mid-file). Never use `--task translate`. Avoid VAD
filtering unless you have verified timestamps stay absolute.

**Verify the first file's shape** before trusting the run:

```json
{ "segments": [ { "start": 31, "end": 33, "text": "…",
    "words": [ { "start": 31, "end": 31.6, "word": "Applied " } ] } ] }
```

Seconds (not milliseconds), and `words[].word`. If the build emits something else, fall back to
`pipx install openai-whisper` and the `whisper` command with the same flags.

**Confirm the three WAVs really are three different files** before you spend an hour transcribing:

```bash
md5sum audio/*.wav          # macOS: md5 audio/*.wav
```

Three identical checksums means an extraction was pointed at the wrong MP4, and one speaker's
transcript will be a copy of another's.

---

## Phase 8b — Normalize the word timestamps

```bash
cd ~/crux/backend
npm run video:normalize -- "$HOME/video-debates/<slug>"
```

Whisper takes segment `start`/`end` from the decoder's token alignment but word timestamps from a
separate cross-attention alignment, so the two disagree by up to a few hundred milliseconds at
segment edges. The merge contract requires every word to lie inside its own segment. This widens each
segment's span to cover the words it already holds — only widening, so no word moves and no speech is
dropped. It is idempotent, and it rewrites `transcript/raw/*.json` in place.

Run it **before** Phase 9, so you correct the same text the merger will read.

---

## Phase 9 — Correct the transcripts

Listen to each isolated track and fix misheard words, names and punctuation. Do **not** rewrite
grammar or add anything nobody said. Keep the original language.

**The trap:** a segment that crosses a boundary (starts judged, ends in grace) is split at word
timestamps, and the merger checks that the segment's `text` still matches its `words[]` joined
together. Editing `text` without editing the matching `words[].word` entries fails with
`corrected_split_requires_word_edits`. For boundary-crossing segments, edit the individual `word`
values.

A boundary-crossing segment with **no** `words` array fails outright
(`unsplittable_boundary_segment`). That is why word timestamps are non-negotiable.

---

## Phase 10 — Merge

```bash
cd ~/crux/backend
npm run video:merge -- "$HOME/video-debates/<slug>"
```

Writes `transcript/transcript.json` and `output/captions.vtt`. Verify: intro/grace/outro are never
`judged: true`, no host segment is judged, and judged speech in each round comes only from FOR and
AGAINST.

---

## Phase 11 — Judge

```bash
npm run video:judge -- "$HOME/video-debates/<slug>"
```

Five isolated round calls plus one closing call. Raw responses land in `judgment/raw/`, the result
in `judgment/judgment.json`.

Review: exactly five rounds; every round a non-tied integer split summing to 100; each side 0–4
points; every point citing a real judged segment from the correct side and round; final score
matching the five winners; all five rounds judged including any after a third win.

**Never hand-edit a winner, a split or a citation.** If it is wrong, fix the transcript or the
boundaries and re-run, or use the runner's retry/tie-break path.

---

## Phase 12 — Build and validate the manifest

```bash
npm run video:manifest -- "$HOME/video-debates/<slug>"
npm run video:validate -- "$HOME/video-debates/<slug>"
```

The builder combines `debate.json` + `boundaries.json` + `media-probes.json` + `transcript.json` +
`judgment.json` into `output/manifest.json`. The validator re-checks it offline, with no model and
no network. A failure blocks upload — fix the source, never weaken the check.

---

## Phase 13 — Upload to R2

```bash
cd ~/video-debates/<slug>
rclone copy publish/ r2:<bucket>/video-debates/<media-id>/ --progress
rclone ls  r2:<bucket>/video-debates/<media-id>/
```

Exactly four objects: `host.mp4`, `for.mp4`, `against.mp4`, `poster.webp`. Never upload WAVs,
transcripts, judge logs, the manifest or credentials to this prefix.

---

## Phase 14 — Publish from `/admin/video-debates`

In this order — the server enforces it:

1. Open the draft.
2. **Choose file** → `output/manifest.json`. Only this JSON travels through Crux; the video never
   does.
3. **Check media** — signed HEAD on all four objects plus a public range request. It compares
   Content-Length against the submitted probe sizes, so the manifest has to land first.
4. **Validate** — the server rebuilds the submission from its own rows and re-runs the same
   validator.
5. **Preview →** and walk the Section 16 checklist in the runbook, on desktop and a small phone.
6. **Publish**, once.
7. Verify signed out: `/video-debates`, the detail page, captions, the home band, linked profiles,
   the Open Graph preview.

### Corrections

- **Metadata / transcript / judgment wrong:** unpublish → fix the source → re-run every dependent
  stage → resubmit → revalidate → preview → republish.
- **Media wrong:** unpublish → **Rotate media id** → upload all four objects under the new prefix →
  revalidate → republish → delete old objects only after the replacement is confirmed.

Never overwrite a published object key. Published media uses immutable caching, so the old bytes may
keep serving.

---

## Known state before the first run

- Nothing in this pipeline has been run against real media, so expect the first pass to surface
  rough edges in the inspector's bitrate and keyframe checks.
- Workstream D Tasks 7–9 are unperformed: the R2 `curl` header/range/CORS checks, the five-browser
  matrix, the pre/post-publication economy snapshots, and the unpublish rehearsal. Runbook
  Sections 16–17 are those checks — do them **before** the first real publish.
- The `express.json` 1 MB ceiling has not been exercised with an oversized body against a running
  API.
