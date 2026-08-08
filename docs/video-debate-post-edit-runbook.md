# Crux Video Debate — Post-Edit Operator Runbook

**Version:** 1.0 — first production run, rewritten from scratch

**Last updated:** 2026-08-08

**Owner:** Crux operator

**Target:** production only (`https://cruxdebate.site`). Nothing in this document describes a
localhost run. A debate that was assembled on localhost cannot be promoted by copying its objects
to a new prefix — the draft row, the media id and the manifest hash all belong to one database.
Start over from Section 1.

---

## 0. Machines, roles and one-time setup

Two machines. The split is absolute: **only transcription happens on the Linux box.** Editing,
FFmpeg, every `npm run video:*` script, the judge, R2 upload and the admin browser work all happen
on the MacBook.

| | **MAC** — MacBook (primary) | **LINUX** — remote, SSH only |
|---|---|---|
| Runs | Resolve, FFmpeg, cwebp, all Crux scripts, rclone, browser | `whisper-ctranslate2` and nothing else |
| Holds | the whole package directory | one scratch job directory, deleted afterward |
| Access | direct | `ssh` / `scp` only — assume no UI, no file manager |

Every command block below is tagged `[MAC]` or `[LINUX]`. Run it only on that machine.

### 0.1 Shell variables — MAC

Open one terminal and keep it for the whole run. Every later `[MAC]` block assumes these.

```bash
# [MAC]
export CRUX="$HOME/Desktop/crux"
export SLUG="<public-slug>"
export PKG="$HOME/video-debates/$SLUG"
export BUCKET="crux-video-debates"
export CRUX_ORIGIN="https://cruxdebate.site"
export VIDEO_PUBLIC_URL="https://video.cruxdebate.site"
export WHISPER_HOST="<user>@<linux-host>"     # anything ssh accepts
export MEDIA_ID=""                            # filled in at Section 3 — leave empty for now
```

### 0.2 One-time tooling — MAC

```bash
# [MAC]
brew install ffmpeg webp rclone
cd "$CRUX/backend" && npm install
```

`ffprobe` must be on `PATH` — the inspector shells out to it.

### 0.2a The rclone remote must actually reach R2

`rclone listremotes` proves nothing: it prints `r2:` for a remote that cannot connect. This machine's
`r2:` remote is configured as below — **the `endpoint` is the part everyone forgets**, and without it
rclone silently talks to AWS S3 instead of Cloudflare:

```ini
[r2]
type = s3
provider = Cloudflare
endpoint = https://<account-id>.r2.cloudflarestorage.com
region = auto
acl = private
env_auth = false
access_key_id = <R2_ACCESS_KEY_ID>
secret_access_key = <R2_SECRET_ACCESS_KEY>
```

Credentials are stored in the remote, so nothing needs exporting per session. To rebuild it from
`backend/.env` on another machine:

```bash
# [MAC]
cd "$CRUX"
envval() { grep -E "^$1=" backend/.env | head -1 | cut -d= -f2- | sed 's/[[:space:]]*#.*$//' | tr -d '"'"'"' '; }
rclone config update r2 type s3 provider Cloudflare region auto acl private env_auth false \
  endpoint "$(envval R2_ENDPOINT)" \
  access_key_id "$(envval R2_ACCESS_KEY_ID)" \
  secret_access_key "$(envval R2_SECRET_ACCESS_KEY)" \
  --non-interactive
```

**Prove the remote works before trusting any listing:**

```bash
# [MAC]
rclone size "r2:$BUCKET/" --contimeout 15s --retries 1 --low-level-retries 2
echo "exit=$?"
```

`exit=0` means R2 answered — only then does an empty result genuinely mean an empty bucket. Any
other exit code means the remote is broken and **an empty listing tells you nothing at all**.

Do not pipe this through `head` or `grep`: the pipe reports the filter's exit code, not rclone's,
and hides the failure completely.

Three failures worth recognising:

| What you see | What it means |
|---|---|
| `no EC2 IMDS role found`, `169.254.169.254: host is down` | no credentials — `env_auth = true` with nothing exported, so rclone fell through to EC2 instance metadata |
| nothing at all, exit 0, from an `lsd` | `$BUCKET` is unset, so the path collapsed to `r2:/video-debates/`. Check with `echo "[$BUCKET]"` |
| `GetBucketVersioning ... 403 AccessDenied` during a purge | harmless. The token is not scoped for that call; rclone logs it as `ERROR`, then proceeds as unversioned and deletes correctly |

### 0.3 One-time tooling — LINUX

```bash
# [LINUX]  (over ssh, once)
sudo apt update && sudo apt install -y ffmpeg python3-pip pipx
pipx install whisper-ctranslate2
whisper-ctranslate2 --help | head -5      # confirm it is on PATH
```

`whisper-ctranslate2` is the CTranslate2 backend: same CLI and same JSON shape as `openai-whisper`,
several times faster on CPU. If this build ever emits a different JSON shape, fall back to
`pipx install openai-whisper` and use the `whisper` command with identical flags.

### 0.4 Production `backend/.env` — MAC

The offline scripts import `src/config`, which loads `backend/.env` via `dotenv`. The judge needs
real credentials on the Mac:

```bash
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-...
LLM_MODEL=deepseek/deepseek-v4-flash:nitro       # the rest of Crux
VIDEO_JUDGE_LLM_MODEL=deepseek/deepseek-v4-pro   # this judge only; optional, this is the default
```

The video judge is the one caller that ignores `LLM_MODEL`. Its six calls decide a verdict that
gets published and must never be hand-corrected, so it runs on the stronger model while Arena
traffic stays on flash. Reasoning is disabled in the request body regardless of `LLM_REASONING` —
the runner needs a bare JSON object, not a thinking preamble.

This variable is only read on the Mac, by the script. The deployed backend never runs the judge, so
there is nothing to add to the production environment.

The R2 and `CLIENT_URL` values in `backend/.env` are **not** read by the packaging scripts. Only
`video:check-delivery` reads `R2_VIDEO_PUBLIC_URL` and `CLIENT_URL`, and it reads them from the
process environment with no `dotenv` — Section 12 passes them inline for exactly that reason. Do not
"fix" this by trusting the local `.env`, whose `CLIENT_URL` is `http://localhost:3000` and would
make the CORS check pass against the wrong origin.

### 0.5 Cloudflare dashboard — three settings on the `video.cruxdebate.site` zone

Do these once, in the dashboard, before the first upload. All three exist because of how the first
attempt failed.

**A. Browser Cache TTL must respect the origin — Caching → Configuration → Browser Cache TTL**

Set it to **Respect Existing Headers**. If it is pinned to a fixed value, Cloudflare rewrites the
`Cache-Control` it sends to browsers and the `--header-upload` value in 13.1 never survives to the
check. The `max-age=14400` seen on the failed run is exactly Cloudflare's 4-hour default, which is
what gets applied when the origin sends no header of its own — so this setting is the first thing to
confirm if `cache_control` still fails after a correct re-upload.

**B. Static CORS header — Rules → Transform Rules → Modify Response Header → Create rule**

| Field | Value |
|---|---|
| When incoming requests match | `URI Path` `starts with` `/video-debates/` |
| Then | **Set static** — `Access-Control-Allow-Origin` = `*` |

This is the permanent fix described in Section 20. Do not also set
`Access-Control-Allow-Credentials`; that combination is invalid and the check rejects it.

**C. Leave the R2 bucket CORS policy alone.** It is already correct, and once rule B is live the
echo stops mattering. For reference, it currently allows the apex, `www` and `localhost:3000` for
`GET`/`HEAD` with a `Range` request header and exposes `Content-Range`, `Content-Length` and
`Accept-Ranges`.

**Purging:** not needed for a new media id — new ids mean new URLs with no cache entries. Purge by
URL only when you have replaced bytes under a key that was already fetched.

---

## 1. Wipe the failed attempt

Do this once, before anything else. Two places hold state: Cloudflare R2 and the production
database. Both must be empty of this debate.

### 1.1 Delete the R2 prefixes — MAC

List what is actually there first — there are two media ids from the previous attempt, and you
should confirm both before deleting anything:

```bash
# [MAC]
rclone lsd "r2:$BUCKET/video-debates/"
```

Then purge each old media id, one command per id:

```bash
# [MAC]
rclone purge "r2:$BUCKET/video-debates/<old-media-id>/" --s3-directory-markers
rclone lsf -R "r2:$BUCKET/video-debates/"     # must print nothing at all
rclone size "r2:$BUCKET/"                     # must report 0 objects, 0 B
```

Three things about that command, each of which cost time on the first run:

**`--s3-directory-markers` is not optional.** Without it, `purge` deletes the four objects but can
leave a zero-byte key ending in `/`. That marker is invisible to `rclone ls` and uncounted by
`rclone size`, yet `rclone lsd` keeps showing the media id as if the wipe failed.

**Verify with `lsf -R`, never `lsd`.** `lsd` misleads in both directions — it prints nothing when the
remote cannot connect at all, and prints a prefix that holds no bytes. `lsf -R` lists real keys.

**`rclone rmdir` will not help.** On an S3 sub-prefix it is a no-op: it exits 0 and changes nothing.

Expect this on stderr, and ignore it:

```text
ERROR : Failed to read versioning status, assuming unversioned:
        operation error S3: GetBucketVersioning ... StatusCode: 403 ... AccessDenied
```

`purge` asks about bucket versioning first; the R2 API token is not scoped for that call. rclone logs
it at `ERROR` level but, as the message says, carries on and deletes correctly. It is noise.

**Never judge these commands by `$?` after a pipe.** `rclone ... | grep` or `| head` reports the exit
code of `grep`/`head`, not of rclone, and hides real failures. Read the follow-up listing instead.

The first run left two, each holding the same four objects and the same 527 MB — the localhost-era
`89b1bbf4-eb4c-4b4f-84a5-a746031e197d` and the failed production `e913ab9a-5575-4072-83c1-af557e7fe457`.
Both were purged on 2026-08-08 and the bucket now reports 0 objects and 0 B.

Purge every prefix you find. A media id that no production row references is not harmless clutter:
it holds half a gigabyte and guarantees confusion about which upload is live.

No Cloudflare cache purge is needed. These keys are being abandoned, not replaced, and the new run
gets a brand-new media id and therefore brand-new URLs.

### 1.2 Delete the production database rows

**There is no delete endpoint.** `backend/src/routes/admin.route.ts` exposes create, patch,
media-version, media/check, manifest, validate, preview, publish and unpublish — no destructive
route exists by design. Removing a draft is a deliberate manual act against production.

Connect to the production database (Railway: `railway connect`, or `psql "$PRODUCTION_DATABASE_URL"`).

**Look before you delete:**

```sql
-- [MAC, psql against PRODUCTION]
SELECT id, slug, status, media_id, draft_revision, created_at
FROM video_debates
ORDER BY id;
```

Then delete the row for the failed debate:

```sql
-- [MAC, psql against PRODUCTION]
DELETE FROM video_debates WHERE id = 1;      -- use the id you saw above
```

**That single statement is enough.** Both child tables declare
`REFERENCES video_debates(id) ON DELETE CASCADE` (migration `0018_create_video_debates.sql`), so
these go with it automatically:

| Table | How it clears |
|---|---|
| `video_debates` | the `DELETE` above |
| `video_debate_participants` | `ON DELETE CASCADE` |
| `video_debate_rounds` | `ON DELETE CASCADE` |

Nothing else stores video-debate state. Lifecycle audit entries and playback events are written with
`logger.info` only — there is no table behind them, so there is nothing else to clean.

Confirm the wipe:

```sql
-- [MAC, psql against PRODUCTION]
SELECT count(*) FROM video_debates;
SELECT count(*) FROM video_debate_participants;
SELECT count(*) FROM video_debate_rounds;
```

All three must be `0` (or must no longer contain your slug, if other debates exist).

The `slug` column is `UNIQUE`, so reusing the same slug is only possible after this delete. The
`SERIAL` id keeps counting — your new draft will be id 2 or higher, and that is fine.

---

## 2. Do not start until the edit is locked

Confirm every line before exporting. Anything unchecked here becomes a validator failure five
sections later, at which point the fix is a re-export.

- [ ] The three camera edits start at the same timeline zero.
- [ ] The three edits end at the same frame.
- [ ] Finished duration is at most `10:00.000` (`MAX_DURATION_MS = 600000`).
- [ ] The host mix contains every voice viewers should hear.
- [ ] Isolated FOR, AGAINST and host microphone tracks still exist, full length.
- [ ] Markers exist at every boundary: intro start/end, then per round first-turn start,
      second-turn start, grace start, grace end, then outro start/end — 2 + (5 × 4) + 2 in total.
- [ ] Each judged turn is `30.000 s` within ±100 ms (`MIN_JUDGED_TURN_MS` 29900,
      `MAX_JUDGED_TURN_MS` 30100).
- [ ] Round 1 opener matches the recorded coin toss; openers alternate after that.
- [ ] All five rounds remain in the edit, even if one side reached three wins early.

Snapshot the Resolve project now. Every later correction starts from this snapshot, never from a
newer timeline.

### 2.1 What the recording must have got right

Every one of these was learned by having it go wrong. They cannot be fixed after the fact:

- [ ] **Each mic hears only its own speaker.** Close-mic everyone and gate hard. Bleed does not
      merely add stray text — Whisper's word alignment collapses on quiet, distant speech and
      produces "words" lasting several seconds, and a multi-second word blocks every boundary near
      it. One 5.4-second `" time's"` was enough to make an entire round unplaceable.
- [ ] **The host is silent at every turn handover.** Between a round's two judged turns there is no
      non-judged window, so "your time starts now" spoken there has nowhere legal to sit and must
      be deleted from the transcript afterwards.
- [ ] **Host cues live in grace or intro**, never inside a judged turn.
- [ ] **Roughly 300 ms of clean silence at each planned boundary**, so the edge has a gap to land in.
- [ ] **Three different people.** One person covering two roles puts the same voice on two tracks;
      no boundary and no edit can separate them afterwards.

Expect Whisper to hallucinate during silence regardless — isolated tracks are quiet two-thirds of
the time, and `"Thank you."` and runs of `"..."` are its favourites. Section 12.0 finds them.

Write the marker times, in milliseconds from zero, into a scratch file. You will not turn them into
`boundaries.json` until Section 8 — the real boundaries must be snapped to word gaps that do not
exist yet.

---

## 3. Create the production draft — this is where the media id comes from

Never invent a prefix. The server generates the media id and the four object keys.

1. `[MAC]` Sign in as admin at `https://cruxdebate.site/admin/video-debates`.
2. **New draft** → slug, motion, host/FOR/AGAINST display names (optional Crux user ids), the five
   domains **in round order**, and the Round 1 opener from the coin toss.
3. Save. **Motion, the five domains and the Round 1 opener are immutable from this moment.** A
   mistake here means deleting the row again per Section 1.2 and starting this section over.
4. **Download debate.json**.
5. Copy the media id out of the `rclone` prefix shown on the draft panel and record it:

```bash
# [MAC]
export MEDIA_ID="<media-id-from-the-admin-panel>"
echo "$MEDIA_ID"
```

---

## 4. Build the package directory — MAC

```bash
# [MAC]
mkdir -p "$PKG"/{resolve,exports-resolve,publish,audio,metadata,transcript/raw,judgment/raw,output,checks}
mv ~/Downloads/debate.json "$PKG/metadata/debate.json"
```

Every path the scripts read is fixed in `backend/scripts/video-debate/paths.ts`. Renaming anything
breaks the run:

```text
publish/host.mp4              publish/for.mp4          publish/against.mp4
publish/poster.webp           metadata/debate.json     metadata/boundaries.json
metadata/media-probes.json    transcript/raw/for.json  transcript/raw/against.json
transcript/raw/host-isolated.json                      transcript/transcript.json
judgment/judgment.json        output/manifest.json     output/captions.vtt
```

Symlinks are rejected and paths may not escape the package root. Keep R2 and LLM credentials
outside this directory.

---

## 5. Export, remux and poster — MAC

### 5.1 Resolve export

All three from the **same in/out range**:

| Setting | Required value |
|---|---|
| Container / codec | MP4, H.264 |
| Resolution | 1280×720 exactly |
| Pixel format | `yuv420p` (4:2:0) |
| Video bitrate | 2.5 Mbps target — **must land between 2.0 and 3.0 Mbps** |
| Keyframe interval | 2 seconds — **max measured interval must be ≤ 2100 ms** |
| Frame rate | identical across all three |
| Audio | AAC, 128 kbps, **48 kHz** |
| Duration | identical within 100 ms; never above 600 s |

Audio routing — get this wrong and the transcript puts the host's words in a debater's mouth:

- `host-resolve.mp4` — complete **mixed** programme audio.
- `for-resolve.mp4` — **isolated** FOR microphone.
- `against-resolve.mp4` — **isolated** AGAINST microphone.
- `audio/host-isolated.wav` — **isolated** host microphone, full length, silence included.

### 5.2 Remux for faststart

Stream copy only; this re-encodes nothing and moves the `moov` atom in front of `mdat`. The
validator rejects any file without it (`media_faststart`).

```bash
# [MAC]
cd "$PKG"
ffmpeg -i exports-resolve/host-resolve.mp4     -c copy -movflags +faststart publish/host.mp4
ffmpeg -i exports-resolve/for-resolve.mp4      -c copy -movflags +faststart publish/for.mp4
ffmpeg -i exports-resolve/against-resolve.mp4  -c copy -movflags +faststart publish/against.mp4
```

Stop if FFmpeg reports a corrupt input, a missing stream or an incomplete output.

### 5.3 Poster

Author the artwork at **exactly 1600×900** — the inspector compares the dimensions literally, and
rescaling a different aspect ratio here will distort it.

```bash
# [MAC]
cwebp -q 82 "$PKG/exports-resolve/poster-src.png" -o "$PKG/publish/poster.webp"
ls -l "$PKG/publish/poster.webp"      # must be under 500000 bytes
```

Lower `-q` until it fits under 500 KB. Requirements: both debaters identified as FOR and AGAINST;
host may appear but must not read as a third side; **no winner and no score**; Crux design system,
light-mode share surface. The same file serves the archive card and the Open Graph preview.

---

## 6. Inspect the media — MAC

```bash
# [MAC]
cd "$CRUX/backend"
npm run video:inspect -- "$PKG"
```

Writes `metadata/media-probes.json` only when all four assets satisfy the V1 contract. Nothing
downstream works without this file, and the byte lengths it records are what the server later
compares against the real R2 objects.

Record the manual review in `checks/publish-checklist.md`:

```bash
# [MAC]
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=index,codec_type,codec_name,profile,pix_fmt,width,height,r_frame_rate,bit_rate,sample_rate,channels -of json "$PKG/publish/host.mp4"
```

Repeat for `for.mp4` and `against.mp4`, then confirm:

- [ ] H.264 / 1280×720 / `yuv420p` on all three.
- [ ] Video bitrate between 2 and 3 Mbps on all three.
- [ ] Frame rates match exactly; H.264 profiles match host.
- [ ] Longest and shortest durations differ by ≤ 100 ms; none exceeds 600 s.
- [ ] Host video carries the mixed audio; FOR and AGAINST are isolated and correctly labelled.
- [ ] All three begin and end on the same visible frame when played together.

A timing difference means a re-export. Never plan to hide an export offset with player-side offsets.

---

## 7. Extract transcription audio and ship it to Linux

### 7.1 Extract — MAC

```bash
# [MAC]
cd "$PKG"
ffmpeg -i publish/for.mp4     -vn -ac 1 -ar 16000 -c:a pcm_s16le audio/for.wav
ffmpeg -i publish/against.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le audio/against.wav
# host-isolated.wav comes from Resolve: the ISOLATED host mic, full length, silence included.
```

All three WAVs must span the **whole common timeline**. A WAV that begins at someone's first word
drifts that speaker's entire transcript.

Prove they are three different files before spending an hour of GPU-less compute:

```bash
# [MAC]
md5 audio/for.wav audio/against.wav audio/host-isolated.wav
```

Three identical checksums means an extraction pointed at the wrong MP4.

### 7.2 Ship to the Linux box — MAC

```bash
# [MAC]
ssh "$WHISPER_HOST" "mkdir -p ~/whisper-jobs/$SLUG/raw"
rsync -avP "$PKG/audio/" "$WHISPER_HOST:~/whisper-jobs/$SLUG/audio/"
```

Only the three WAVs travel. No video, no metadata, no credentials.

---

## 8. Transcribe — LINUX

```bash
# [LINUX]
cd ~/whisper-jobs/<slug>
whisper-ctranslate2 audio/for.wav audio/against.wav audio/host-isolated.wav \
  --model large-v3 \
  --device cpu --compute_type int8 --threads "$(nproc)" \
  --task transcribe --language en \
  --word_timestamps True \
  --output_format json --output_dir raw
```

Budget roughly 20–60 minutes per 10-minute track on CPU. Run it under `tmux` or `nohup` so an SSH
drop does not kill it:

```bash
# [LINUX]
tmux new -s whisper      # then run the command above; detach with Ctrl-b d
```

Rules that are not negotiable:

- **Set `--language` explicitly.** Auto-detect can flip mid-file.
- **Never `--task translate`.**
- **`--word_timestamps True` is required.** A boundary-crossing segment with no `words` array fails
  the merge outright with `unsplittable_boundary_segment`.
- **Do not rename the outputs.** The filename is the only thing that assigns speaker identity.

Check the shape of the first file before trusting the whole run:

```bash
# [LINUX]
head -c 400 raw/for.json
```

Expected — seconds (not milliseconds), and a `words[]` array carrying `word`:

```json
{ "segments": [ { "start": 31, "end": 33, "text": "…",
    "words": [ { "start": 31, "end": 31.6, "word": "Applied " } ] } ] }
```

### 8.1 Pull the results back — MAC

```bash
# [MAC]
rsync -avP "$WHISPER_HOST:~/whisper-jobs/$SLUG/raw/" "$PKG/transcript/raw/"
ls "$PKG/transcript/raw/"     # for.json  against.json  host-isolated.json
```

Then remove the scratch directory — the Linux box is a transcription appliance, not an archive:

```bash
# [MAC]
ssh "$WHISPER_HOST" "rm -rf ~/whisper-jobs/$SLUG"
```

---

## 9. Normalize the word timestamps — MAC

```bash
# [MAC]
cd "$CRUX/backend"
npm run video:normalize -- "$PKG"
```

Whisper takes segment `start`/`end` from token alignment but word timestamps from a separate
cross-attention alignment, so the two disagree by up to a few hundred milliseconds at segment edges.
The merge contract requires every word to lie inside its own segment. This widens each segment to
cover the words it already holds — widening only, so no word moves and no speech is dropped. It is
idempotent and rewrites `transcript/raw/*.json` in place.

Run it **before** Sections 10 and 11, so you write boundaries against, and correct, the same text
the merger will read.

---

## 10. Write `metadata/boundaries.json` — MAC

Now, not earlier. You need the normalized word times to place the edges.

Milliseconds from the common video start. Five round objects, numbered 1–5, `domain` strings
matching the draft **exactly**:

```json
{
  "version": 1,
  "duration_ms": 480000,
  "intro": { "start_ms": 0, "end_ms": 30000 },
  "rounds": [
    { "number": 1, "domain": "Education", "opener": "for",
      "for":     { "start_ms": 30000,  "end_ms": 60000 },
      "against": { "start_ms": 60000,  "end_ms": 90000 },
      "grace":   { "start_ms": 90000,  "end_ms": 115000 } },
    { "number": 2, "domain": "Economics & Business", "opener": "against",
      "against": { "start_ms": 115000, "end_ms": 145000 },
      "for":     { "start_ms": 145000, "end_ms": 175000 },
      "grace":   { "start_ms": 175000, "end_ms": 200000 } }
  ],
  "outro": { "start_ms": 455000, "end_ms": 480000 }
}
```

### The programme must be one contiguous partition

`timeline_partition` fires on any gap or overlap. Intro starts at 0; each round's **opener** turn
starts exactly where the previous grace ended (round 1's, where the intro ended); the second turn
starts exactly where the first ends; grace starts exactly where the second ends; the outro ends
exactly at `duration_ms`.

### Every judged turn is 30 s ± 100 ms

This is the constraint that makes boundary-writing harder than it looks:

- You cannot move one edge alone. Moving the edge between a round's two turns lengthens one and
  shortens the other, and both have only 100 ms of slack.
- What you *can* move freely is where a round's 60 s judged block **starts** — the preceding grace
  has no required length. **Slide the whole block; never stretch it.**
- A turn the host let run to 31 s cannot be represented at all. A full second of that debater's
  speech will land in grace, unjudged.

### Never take boundaries from the running order

Speech does not stop on a stopwatch. A boundary landing mid-word fails with
`unsplittable_boundary_segment`, because no window contains that word. Read the exact word times out
of the normalized `transcript/raw/*.json` and slide each round's block so **all three of its edges
fall in gaps between words**.

The host is the hard case: between a round's two judged turns there is no non-judged window, so the
host's "your time starts now" has nowhere legal to sit — inside a judged turn, only that turn's
debater may speak. Either keep the host silent between the two turns, or delete those procedural
lines in Section 11. They are not argument and must never reach the judge.

Check the file against the video twice. A wrong boundary silently moves a sentence between judged
and grace.

---

## 11. Correct the transcripts — MAC

Listen to each isolated track and fix misheard words, names and punctuation. Do **not** rewrite
grammar, improve phrasing, or add anything nobody said. Keep the original language.

**The trap:** a segment crossing a boundary is split at word timestamps, and the merger checks that
the segment's `text` still equals its `words[]` joined together. Editing `text` alone fails with
`corrected_split_requires_word_edits`. For boundary-crossing segments, edit the individual
`words[].word` values.

---

## 12. Merge, judge, build — MAC

### 12.0 Preflight first — always

`video:merge` is a validator: it stops at its **first** error. On the first real package
that meant discovering eighty-odd problems one re-run at a time. Run this instead, first:

```bash
# [MAC]
cd "$CRUX/backend"
npm run video:preflight -- "$PKG"
```

It walks the merger's own windows with the merger's own parser and reports everything at once, in
three groups:

| Group | What it means | How you fix it |
|---|---|---|
| **Boundary straddles** | a word the boundary cuts in half (`unsplittable_boundary_segment`) | the proposal below |
| **Foreign speech** | a word landing in a judged turn belonging to someone else (`speaker_window_mismatch`) | edit the raw JSON — no boundary can fix it |
| **Hallucinations** | punctuation-only, known Whisper filler, implausibly short | delete from the raw JSON |

Then it searches for boundaries that work: for each round it slides the whole 60 s judged block and
varies each turn inside the 30 s ±100 ms allowance until every edge lands between words, keeping the
programme contiguous. The result goes to `metadata/boundaries.proposed.json`. **It never overwrites
your `boundaries.json`** — review the proposal, then copy it across yourself:

```bash
# [MAC]
cd "$PKG/metadata"
cp boundaries.json boundaries.original.json
cp boundaries.proposed.json boundaries.json
```

Re-run preflight after applying. Moving the windows can expose foreign speech that was previously
sitting in a legal phase, so expect one or two more rounds of edit-and-recheck. Preflight exits
non-zero while anything is blocking.

If it reports *"Round N: no placement keeps both turns inside 30 s ±100 ms"*, somebody is speaking
across that round's handover. Between a round's two judged turns there is no non-judged window at
all, so the speech has to go — or the round has to be re-cut.

### 12.1 Merge

```bash
# [MAC]
cd "$CRUX/backend"
npm run video:merge -- "$PKG"
```

Writes `transcript/transcript.json` and `output/captions.vtt`. Verify:

- [ ] Every segment has one real speaker and start/end timestamps.
- [ ] Intro, grace and outro are never `judged: true`.
- [ ] No host segment is judged.
- [ ] Judged speech in each round comes only from FOR and AGAINST.

```bash
# [MAC]
npm run video:judge -- "$PKG"
```

Five isolated round calls plus one closing call. Raw responses land in `judgment/raw/`, the result
in `judgment/judgment.json`. Verify:

- [ ] Exactly five round results.
- [ ] Every round has one winner and a non-tied integer split summing to 100.
- [ ] Each side has 0–4 key points, each citing a real judged segment from the correct side and round.
- [ ] Grace, host speech and future rounds did not enter a round judgment.
- [ ] Final score matches the five winners; all five rounds judged, including any after a third win.

**Never hand-edit a winner, a split or a citation.** If a result is wrong, fix the transcript or the
boundaries and re-run, or use the runner's retry/tie-break path.

```bash
# [MAC]
npm run video:manifest -- "$PKG"
npm run video:validate -- "$PKG"
```

The builder combines `debate.json` + `boundaries.json` + `media-probes.json` + `transcript.json` +
`judgment.json` into `output/manifest.json`. The validator re-checks it offline — no model, no
network. A failure blocks upload: fix the source, never weaken the check.

---

## 13. Upload to R2 — MAC

### 13.1 Upload with the delivery headers

**The `--header-upload` flag is mandatory.** Without it the objects carry no `Cache-Control`,
Cloudflare stamps its own default (`max-age=14400`), and the admin **Check media** step fails with
`cache_control` on all three MP4s. `immutablePublicCache` in `backend/src/video-debates/videoStorage.ts`
requires `public`, `immutable` and `max-age >= 31536000`.

```bash
# [MAC]
cd "$PKG"
rclone copy publish/ "r2:$BUCKET/video-debates/$MEDIA_ID/" \
  --header-upload "Cache-Control: public, max-age=31536000, immutable" \
  --progress
rclone ls "r2:$BUCKET/video-debates/$MEDIA_ID/"
```

Exactly four objects, nothing else ever in this prefix:

```text
video-debates/<media-id>/host.mp4
video-debates/<media-id>/for.mp4
video-debates/<media-id>/against.mp4
video-debates/<media-id>/poster.webp
```

Never upload WAVs, transcripts, judge logs, the manifest or credentials here.

### 13.2 Do not open a media URL in a browser yet

**Read this before touching the new URLs.** Cloudflare caches the *first* response it sees for each
URL and does not vary its cache on `Vary: Origin` for video. A plain browser tab sends no `Origin`
header, R2 answers with no CORS headers, and Cloudflare then serves that stripped response to
everyone — including the server's check, which fails with `cors_origin`. That is exactly what
happened to `host.mp4` on the previous attempt.

So, for each new media id, in this order:

1. Run the delivery check below (it sends the correct `Origin`).
2. Run **Check media** in admin.
3. Only then open the preview page or any media URL directly.

**Once the Section 20 edge rule is in place this ordering stops mattering** — every response carries
the same static `Access-Control-Allow-Origin` and there is no variant left to poison. Until then,
treat the three steps above as strict.

### 13.3 Verify delivery from this host — MAC

```bash
# [MAC]
cd "$CRUX/backend"
R2_VIDEO_PUBLIC_URL="$VIDEO_PUBLIC_URL" CLIENT_URL="$CRUX_ORIGIN" \
  npm run video:check-delivery -- "$MEDIA_ID"
```

The env vars must be inline: this script reads `process.env` directly and loads no `.env`. Passing
them explicitly is also what stops the local `CLIENT_URL=http://localhost:3000` from validating the
wrong origin.

Every rule must print `PASS`. Expected on a correct upload:

```text
PASS range_status    status 206
PASS accept_ranges   (absent)
PASS content_range   bytes 0-0/176007260 …
PASS cache_control   public, max-age=31536000, immutable — needs public + immutable + max-age>=31536000
PASS cors_origin     https://cruxdebate.site — needs https://cruxdebate.site, or * without allow-credentials
PASS content_type    video/mp4 vs video/mp4
```

A `FAIL` next to `cf-cache-status=HIT` means this PoP holds a stale entry — purge that URL in
Cloudflare and re-run. `accept_ranges (absent)` is a pass: R2 advertises it on 200/HEAD, not on the
206, and the matching `Content-Range` is the real proof.

---

## 14. Submit and publish — MAC, in the admin browser

In this order. The server enforces it.

1. Open the draft at `https://cruxdebate.site/admin/video-debates`.
2. **Choose file** → `output/manifest.json`. Only this JSON travels through Crux; the video never
   does.
3. **Check media** — signed HEAD on all four objects plus a public range request. It compares
   `Content-Length` against the probe sizes in the manifest, so the manifest must land first. Every
   rule must pass; failures appear as `host.mp4 · <code>` under the buttons.
4. **Validate** — the server rebuilds the submission from its own rows and re-runs the same
   validator.
5. **Preview →** and complete Section 15 on desktop and a small phone.
6. **Publish**, once.

### If Check media fails

The codes come straight from `videoStorage.ts`. The common ones:

| Code | Meaning | Fix |
|---|---|---|
| `cache_control` | object has no `Cache-Control`, or the edge is serving a cached one | re-run 13.1 **with** `--header-upload`, then purge that URL |
| `cors_origin` | cached variant has no/wrong `Access-Control-Allow-Origin`, or a `*` paired with allow-credentials | purge the URL in Cloudflare, re-run 13.3 first, then Check media — see 13.2, and 20 for the permanent fix |
| `content_length` | uploaded bytes differ from the probe sizes in the manifest | the MP4s changed after `video:inspect`; re-run Section 6 onward |
| `content_type` | wrong stored MIME type | re-upload; rclone infers it from the extension |
| `head_status` | object missing at that key | wrong `MEDIA_ID`, or the upload did not complete |

---

## 15. Preview checklist — MAC

Desktop and a small phone, both:

- [ ] Poster, motion, participants and domains are correct.
- [ ] No video autoplays.
- [ ] One Play action starts all three tracks.
- [ ] Only the host track is audible; there is no echo.
- [ ] Active speaker becomes the large tile during judged statements.
- [ ] Grace uses the balanced FOR/AGAINST layout.
- [ ] Pause, seek and playback speed affect all three tracks.
- [ ] Visible sync holds at the beginning, middle and end.
- [ ] Transcript follows the playhead.
- [ ] Points appear only when their cited segment is reached.
- [ ] Each round ruling appears at that round's grace end, never earlier.
- [ ] Round pips and running score are correct.
- [ ] Rounds 4 and 5 play even after an earlier third win.
- [ ] Final verdict appears at Round 5's grace end.
- [ ] Seeking backward hides later points and rulings.
- [ ] Captions work and identify the current speaker.
- [ ] A deliberately blocked secondary angle degrades without stopping host playback.
- [ ] A host-track failure stops with the correct retry message.

Do not publish after a partial preview.

---

## 16. Verify after publishing — MAC

The public video routes sit behind `requireVideoPass`, so a signed-out window is not enough: you
must enter `VIDEO_DEBATE_PASSWORD` at the gate. This is what actually withholds the manifest,
rulings and verdict while the feature is unlisted.

1. Private window → enter the video password.
2. Confirm the debate appears in `/video-debates`.
3. Open the canonical detail page and play from the start.
4. Seek into a later round and verify the final-reveal boundary.
5. Confirm captions load.
6. Confirm the home band and any linked participant profiles.
7. Confirm the Open Graph preview uses the poster and canonical URL.
8. Record the URL and publication timestamp in `checks/publish-checklist.md`.

---

## 17. Corrections and rollback

### Metadata, transcript or judgment wrong

Unpublish → fix the source → re-run every dependent stage → resubmit the manifest → revalidate →
preview → republish. Never hand-edit a published winner or citation.

### Media wrong

Unpublish → **Rotate media id** in admin → upload all four objects under the new prefix **with
`--header-upload`** → re-run 13.3 → Check media → revalidate → republish → delete the old objects
only after the replacement is confirmed.

Never overwrite a published object key. Published media is served `immutable`, so an overwritten key
may keep serving the old bytes for a year.

### Starting completely over

Section 1. There is no delete endpoint; the `DELETE FROM video_debates WHERE id = …` plus the two
cascades is the whole operation.

---

## 18. Failure guide

| Symptom | Likely cause | Action |
|---|---|---|
| `cache_control` on all three MP4s | uploaded without `--header-upload` | re-upload per 13.1, purge those URLs |
| `cors_origin` on one object only | a no-`Origin` request populated the edge cache first | purge that URL, re-run 13.3, then Check media — never open media URLs before 13.2, and add the Section 20 rule to end this class of failure |
| `content_length` | MP4s changed after `video:inspect` | re-run Section 6 and rebuild the manifest |
| `422` in the browser console on Check media | the check refused; the codes are rendered under the buttons | read the list, not the console |
| `503 video_storage_unconfigured` | server R2 env missing or `publicUrl` is an `r2.dev`/API host | fix the deployed env |
| `unsplittable_boundary_segment` | a boundary lands mid-word, or word timestamps missing | run 12.0 and apply the proposal |
| `speaker_window_mismatch` | a word inside a judged turn belongs to another speaker — usually mic bleed or a host cue | run 12.0, delete the offending segments from the raw JSON |
| `corrected_split_requires_word_edits` | edited `text` without editing `words[].word` | edit the word entries on boundary-crossing segments |
| A "word" lasting seconds in the raw JSON | Whisper's alignment collapses on quiet or bleed audio, smearing one word across a wide span | that span blocks every boundary near it; the speech is almost always bleed — delete the segment |
| `timeline_partition` | a gap or overlap in the programme | make the phases contiguous, outro ending at `duration_ms` |
| Judged turn rejected | turn is outside 30 s ± 100 ms | slide the whole judged block; re-export if the recorded turn really overran |
| `video_bitrate` / `media_keyframe_interval` | export settings drifted | re-export at 2.5 Mbps with 2-second keyframes |
| `media_faststart` | remux skipped | re-run 5.2 with `-movflags +faststart` |
| Host words appear in a debater's transcript | the mixed audio was transcribed | use the isolated microphone |
| Transcript drifts progressively | a WAV does not span the full timeline | re-export aligned full-length audio |
| Three identical Whisper outputs | all extractions pointed at one MP4 | check `md5` in 7.1 and redo |
| Upload stops midway | network interruption | re-run the same `rclone copy`; it resumes by comparison |

---

## 19. Archive after publication

Keep together, off the delivery bucket: the locked Resolve project and sources; the three Resolve
exports and three canonical web exports; the isolated aligned WAVs; the exact boundary, transcript,
judgment and manifest JSON; raw Whisper and judge logs; the poster; the completed checklist; the
canonical URL and publication timestamp.

R2 is delivery storage, not an archive.

---

## 20. Recommended: retire the CORS cache trap with one edge rule

Section 13.2 is an ordering workaround for a structural weakness. Cloudflare cannot vary its cache
on `Origin` outside Enterprise plans, so the first request to each object pins that object's CORS
headers for everyone afterwards — and a request carrying no `Origin` pins a response with no CORS
headers at all. That is what broke `host.mp4`.

The durable fix makes every response identical regardless of who asks. In Cloudflare, on the
`video.cruxdebate.site` zone:

**Rules → Transform Rules → Modify Response Header → Create rule**

| Field | Value |
|---|---|
| When incoming requests match | `URI Path` `starts with` `/video-debates/` |
| Then | **Set static** — header `Access-Control-Allow-Origin`, value `*` |

Do **not** also set `Access-Control-Allow-Credentials`. A wildcard paired with credentials is
invalid per the Fetch standard, browsers refuse it, and `allowsCruxOrigin` in `videoStorage.ts`
rejects that combination on purpose.

Leave `Cache-Control` out of this rule. It belongs on the objects themselves, set by
`--header-upload` in 13.1, so it survives any later change to the CDN configuration.

After the rule is live, purge the affected URLs once and re-run 13.3. The check accepts `*` — no
code change is pending; `videoStorage.ts` and `check-delivery.ts` share one `allowsCruxOrigin`
predicate so the script and the server cannot disagree. With the rule in place, the ordering
discipline in 13.2 stops mattering: there is no longer a response variant worth poisoning.

Why `*` is safe here: these four objects are public media, and `ThreeStreamStage.tsx` requests them
with `crossOrigin="anonymous"`, which sends no cookies and no credentials. If the player is ever
changed to `crossOrigin="use-credentials"`, this rule must be removed — a wildcard cannot serve a
credentialed request.

---

## 21. Change Log

| Date | Version | Change | Reason / observed result |
|---|---|---|---|
| 2026-08-05 | 0.1 | Initial post-edit workflow | Written from the V1 design before implementation |
| 2026-08-08 | 1.0 | Full rewrite for the first production run | First real attempt failed at Check media with `cache_control` on all three MP4s and `cors_origin` on `host.mp4`. Root causes: `rclone copy` set no `Cache-Control`, and a no-`Origin` browser request poisoned the edge cache for `host.mp4`. Added the mandatory `--header-upload`, the ordering rule in 13.2, the pre-flight delivery check in 13.3, explicit MAC/LINUX machine tags, and the database wipe procedure in 1.2 |

## References

- [First-run operator walkthrough](./video-debate-operator-walkthrough.md)
- [Video debate product and system design](./video-debates.md)
- [Participant rules and format](./video-debate-participant-rules.md)
- [Cloudflare R2 with rclone](https://developers.cloudflare.com/r2/examples/rclone/)
- [FFmpeg MP4 `faststart`](https://ffmpeg.org/ffmpeg-formats.html)
- [whisper-ctranslate2](https://github.com/Softcatala/whisper-ctranslate2)
