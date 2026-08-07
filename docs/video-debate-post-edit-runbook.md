# Crux Video Debate — Post-Edit Operator Runbook

**Version:** 0.1 — initial operational draft

**Last updated:** 2026-08-05

**Owner:** Crux operator

Use this checklist after the DaVinci Resolve edit is complete. It starts at export and ends after
public verification. Update the Change Log whenever a real debate exposes a better setting,
missing check or failure mode.

The Crux admin page described here is part of the approved design but is not implemented yet. The
local transcript merger, judge runner, manifest builder and validator use the exact commands below.
Do not replace a failed validator or judge run with an unreviewed hand-edited result.

## 1. Do not start until the edit is locked

Confirm all of these:

- [ ] The three camera edits start at the same timeline zero.
- [ ] The three edits end at the same frame.
- [ ] The finished duration is no more than `10:00.000`.
- [ ] The host mix contains every voice viewers should hear.
- [ ] Isolated FOR, AGAINST and host microphone tracks still exist for transcription.
- [ ] Intro, ten judged statements, five grace periods and outro have final markers.
- [ ] Each judged statement is `30.000` seconds within the allowed 100 ms frame tolerance.
- [ ] Round 1 opener matches the recorded coin toss and opening sides alternate afterward.
- [ ] All five rounds remain in the edit, even if one side reached three wins early.

Duplicate or snapshot the Resolve project before continuing. Later fixes must start from this
locked version rather than an unknown newer timeline.

## 2. Create the Crux draft first

In the future `/admin/video-debates` page:

1. Create a new draft.
2. Enter the immutable motion.
3. Enter the public slug.
4. Add host, FOR and AGAINST display names and optional Crux profile links.
5. Enter the five domains in round order.
6. Enter the Round 1 opening side.
7. Save the generated opaque `media-id` in your production notes.
8. Export or copy the saved draft metadata to `metadata/debate.json`.

Do not make up an object prefix manually. The draft-generated `media-id` is the only prefix used
for that media version.

## 3. Create the local package

Use one directory per debate:

```text
video-debates/<slug>/
├── resolve/
│   └── locked-project-backup/
├── exports-resolve/
│   ├── host-resolve.mp4
│   ├── for-resolve.mp4
│   └── against-resolve.mp4
├── publish/
│   ├── host.mp4
│   ├── for.mp4
│   ├── against.mp4
│   └── poster.webp
├── audio/
│   ├── host-isolated.wav
│   ├── for.wav
│   └── against.wav
├── metadata/
│   ├── debate.json
│   └── boundaries.json
├── transcript/
│   ├── raw/
│   └── transcript.json
├── judgment/
│   ├── raw/
│   └── judgment.json
├── output/
│   ├── manifest.json
│   └── captions.vtt
└── checks/
    └── publish-checklist.md
```

Keep secrets and R2 credentials outside this directory.

## 4. Export the three web videos

Export all three from the exact same Resolve in/out range.

Required V1 settings:

| Setting | Required value |
|---|---|
| Container | MP4 |
| Video codec | H.264 |
| Resolution | 1280×720 |
| Target video bitrate | 2.5 Mbps per track |
| Pixel format | 4:2:0 |
| Keyframe interval | 2 seconds |
| Frame rate | Same source frame rate for all three |
| Audio codec / bitrate | AAC, 128 kbps |
| Audio sample rate | 48 kHz |
| Duration | Same for all three; maximum 10 minutes |

Audio routing:

- `host-resolve.mp4` — complete mixed programme audio.
- `for-resolve.mp4` — isolated FOR microphone.
- `against-resolve.mp4` — isolated AGAINST microphone.
- `host-isolated.wav` — isolated host microphone aligned to the same complete timeline, including
  silence when the host is not speaking.

Never use the host's mixed programme audio for transcription.

## 5. Move MP4 metadata to the front

Run a stream-copy remux. It does not re-encode the video; `+faststart` moves MP4 metadata to the
front for progressive browser playback.

```bash
ffmpeg -i exports-resolve/host-resolve.mp4 -map 0 -c copy -movflags +faststart publish/host.mp4
ffmpeg -i exports-resolve/for-resolve.mp4 -map 0 -c copy -movflags +faststart publish/for.mp4
ffmpeg -i exports-resolve/against-resolve.mp4 -map 0 -c copy -movflags +faststart publish/against.mp4
```

Do not continue if FFmpeg reports a corrupt input, missing stream or incomplete output.

## 6. Prepare the poster

Create `publish/poster.webp`:

- 1600×900 WebP, no more than 500 KB;
- motion readable at card size;
- both debaters identified as FOR and AGAINST;
- host may appear but must not look like a third side;
- no winner or final score on the pre-publication poster;
- use the Crux design system and light-mode share surface;
- verify the image is sharp and reasonably compressed before inspection.

The same poster is used for the archive card and Open Graph preview in V1.

## 7. Inspect all publication assets

From the repository's `backend/` directory, run the package inspector after all three canonical
MP4s and the poster exist:

```bash
npm run video:inspect -- "/absolute/path/to/video-debates/<slug>"
```

The command writes `metadata/media-probes.json` only after the three MP4s and poster satisfy the
V1 media contract. A failure blocks every downstream package command; correct the source asset and
rerun inspection.

Retain the manual FFprobe and playback review. Run this command for each canonical MP4:

```bash
ffprobe -v error -show_entries format=duration,size,bit_rate:stream=index,codec_type,codec_name,profile,pix_fmt,width,height,r_frame_rate,bit_rate,sample_rate,channels -of json publish/host.mp4
```

Repeat with `for.mp4` and `against.mp4`, then record the results in
`checks/publish-checklist.md`.

Verify:

- [ ] Video codec is H.264 for all three.
- [ ] Resolution is 1280×720 for all three.
- [ ] Pixel format is 4:2:0 for all three.
- [ ] Video bitrate is near the 2.5 Mbps target for all three.
- [ ] Frame rates match exactly.
- [ ] Longest and shortest durations differ by no more than 100 ms.
- [ ] No duration exceeds 600 seconds.
- [ ] Host video plays the complete mixed audio.
- [ ] FOR and AGAINST audio are isolated and correctly labelled.
- [ ] All three begin on the same visible frame/event when played together.
- [ ] All three end on the same visible frame/event.

If timing differs, return to Resolve and re-export all three. Do not plan to hide an export offset
with browser synchronization code.

## 8. Prepare transcription audio

Extract mono 16 kHz transcription WAVs from the isolated debater exports:

```bash
ffmpeg -i publish/for.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le audio/for.wav
ffmpeg -i publish/against.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le audio/against.wav
```

Export or copy the already aligned isolated host microphone to `audio/host-isolated.wav`. Confirm
that all three WAVs preserve the full common timeline rather than starting at each person's first
spoken word.

## 9. Write the boundary file

Create `metadata/boundaries.json` from the locked Resolve markers. Milliseconds are measured from
the common video start. This valid example shows the required shape; replace every example value
with the real edit:

```json
{
  "version": 1,
  "duration_ms": 480000,
  "intro": { "start_ms": 0, "end_ms": 30000 },
  "rounds": [
    {
      "number": 1,
      "domain": "Education",
      "opener": "for",
      "for": { "start_ms": 30000, "end_ms": 60000 },
      "against": { "start_ms": 60000, "end_ms": 90000 },
      "grace": { "start_ms": 90000, "end_ms": 115000 }
    },
    {
      "number": 2,
      "domain": "Economics & Business",
      "opener": "against",
      "against": { "start_ms": 115000, "end_ms": 145000 },
      "for": { "start_ms": 145000, "end_ms": 175000 },
      "grace": { "start_ms": 175000, "end_ms": 200000 }
    },
    {
      "number": 3,
      "domain": "Ethics & Philosophy",
      "opener": "for",
      "for": { "start_ms": 200000, "end_ms": 230000 },
      "against": { "start_ms": 230000, "end_ms": 260000 },
      "grace": { "start_ms": 260000, "end_ms": 285000 }
    },
    {
      "number": 4,
      "domain": "Society & Culture",
      "opener": "against",
      "against": { "start_ms": 285000, "end_ms": 315000 },
      "for": { "start_ms": 315000, "end_ms": 345000 },
      "grace": { "start_ms": 345000, "end_ms": 370000 }
    },
    {
      "number": 5,
      "domain": "Technology & AI",
      "opener": "for",
      "for": { "start_ms": 370000, "end_ms": 400000 },
      "against": { "start_ms": 400000, "end_ms": 430000 },
      "grace": { "start_ms": 430000, "end_ms": 455000 }
    }
  ],
  "outro": { "start_ms": 455000, "end_ms": 480000 }
}
```

Check the file against the video twice. A wrong boundary can make grace count or exclude a judged
sentence.

## 10. Transcribe the isolated speakers

With OpenAI Whisper installed locally, run all three aligned WAVs through `large-v3` with word
timestamps and JSON output:

```bash
whisper audio/for.wav audio/against.wav audio/host-isolated.wav --model large-v3 --word_timestamps True --output_format json --output_dir transcript/raw
```

Whisper does not assign participant roles for this workflow; the input filename supplies the
speaker identity.

Review the raw transcripts while listening to each isolated track:

- correct obvious misheard words, names and punctuation;
- do not rewrite grammar, improve phrasing or add a point the participant did not say;
- confirm timestamps remain relative to the full common timeline;
- preserve the original language rather than translating it unless the published debate is
  explicitly designed as a translation.

## 11. Merge and validate the transcript

From the repository's `backend/` directory, run:

```bash
npm run video:merge -- "/absolute/path/to/video-debates/<slug>"
```

The local Crux transcript tool:

1. read the three raw Whisper JSON files;
2. assign stable ids such as `for-0012`;
3. merge segments by common-timeline timestamp;
4. label each segment `intro`, `round`, `grace` or `outro`;
5. set `judged: true` only inside the two declared 30-second windows;
6. write `transcript/transcript.json` and `output/captions.vtt`.

The local VTT is a caption QA artifact. The public caption endpoint later renders the same content
from the validated transcript rather than reading this workstation file.

After the command succeeds, verify:

- [ ] Every segment has one real speaker and start/end timestamp.
- [ ] Intro, grace and outro are never judged.
- [ ] Every round contains judged speech only from FOR and AGAINST.
- [ ] No host segment is judged.
- [ ] Captions match the merged transcript.

## 12. Run the video judge

Keep provider credentials outside the debate package. From the repository's `backend/` directory,
run:

```bash
npm run video:judge -- "/absolute/path/to/video-debates/<slug>"
```

The local judge runner receives:

- immutable motion and five domains;
- `metadata/boundaries.json`;
- `transcript/transcript.json`.

It makes five isolated round calls, then one closing call, and writes:

```text
judgment/raw/       complete model responses and retry log
judgment/judgment.json
```

Review without changing the substantive result by hand:

- [ ] Exactly five round results exist.
- [ ] Every round has one winner and a non-`50–50` integer split summing to 100.
- [ ] Each side has zero to four key points.
- [ ] Every key point cites a real judged segment from the correct side and round.
- [ ] Grace, host speech and future rounds did not enter a round judgment.
- [ ] Final round score matches the five winners.
- [ ] All five rounds were judged, including rounds after a side's third win.
- [ ] Closing winner matches the computed round score.

If a result is invalid, correct the transcript or boundaries when they are wrong, then rerun. If
the inputs are correct, use the runner's defined retry/tie-break path. Never manually turn a draw
into `51–49`, change a winner or invent a cited point.

## 13. Build and validate the public manifest

The manifest builder combines:

```text
metadata/debate.json
metadata/boundaries.json
metadata/media-probes.json
transcript/transcript.json
judgment/judgment.json
```

From the repository's `backend/` directory, run both offline package commands:

```bash
npm run video:manifest -- "/absolute/path/to/video-debates/<slug>"
npm run video:validate -- "/absolute/path/to/video-debates/<slug>"
```

The builder writes `output/manifest.json` only after the complete design contract passes. The
validator reads the existing local artifacts without a model or network call. A failed check blocks
upload/publishing; do not remove the failing field or weaken the check to get a green file.

## 14. Upload web media directly to R2

Replace `<bucket>` and `<media-id>` with the configured bucket and the id created in Step 2:

```bash
rclone copy publish/ r2:<bucket>/video-debates/<media-id>/ --progress
```

Cloudflare recommends `rclone copy` for local R2 uploads; it can select multipart uploads for
large files. Railway is not involved.

Verify the four objects:

```bash
rclone ls r2:<bucket>/video-debates/<media-id>/
```

Expected keys:

```text
video-debates/<media-id>/host.mp4
video-debates/<media-id>/for.mp4
video-debates/<media-id>/against.mp4
video-debates/<media-id>/poster.webp
```

Do not upload raw sources, isolated WAVs, transcripts, judge logs or R2 credentials to the public
media prefix.

## 15. Submit and validate the draft

In `/admin/video-debates`:

1. Open the existing draft.
2. Mark media uploaded or run the object check.
3. Submit `output/manifest.json`.
4. Run server validation.
5. Resolve every error at its source.
6. Save the resulting `VALIDATED` state.

The server must confirm all four objects exist and the manifest is internally consistent before
the Publish action becomes available.

## 16. Preview before publication

Use the admin preview and complete this checklist on desktop and a small phone:

- [ ] Poster, motion, participants and domains are correct.
- [ ] No video autoplays.
- [ ] One Play action starts all three tracks.
- [ ] Only the host track is audible; there is no echo.
- [ ] Active speaker becomes the large tile during judged statements.
- [ ] Grace uses the balanced FOR/AGAINST layout.
- [ ] Pause, seek and playback speed affect all three tracks.
- [ ] Visible sync remains acceptable at the beginning, middle and end.
- [ ] Transcript follows the current playhead.
- [ ] Points appear only when their cited segment is reached.
- [ ] Each round ruling appears at that round's grace end, never earlier.
- [ ] Round pips and running score are correct.
- [ ] Round 4 and Round 5 play even after an earlier third win.
- [ ] Final verdict appears at Round 5's grace end.
- [ ] Seeking backward hides later points and rulings.
- [ ] Captions work and identify the current speaker.
- [ ] A deliberately blocked secondary angle degrades without stopping host playback.
- [ ] A host-track failure stops with the correct retry message.

Do not publish after a partial preview.

## 17. Publish and verify publicly

1. Click Publish once.
2. Open the canonical page in a signed-out/private browser window.
3. Confirm the debate appears in `/video-debates`.
4. Confirm the home feature when this debate should occupy it.
5. Confirm linked participant profiles show the appearance without ranked-stat changes.
6. Play from the start, seek into one later round and verify the final reveal boundary.
7. Check the Open Graph preview uses the correct poster and canonical URL.
8. Record the publication URL and timestamp in `checks/publish-checklist.md`.

## 18. Corrections and rollback

### Metadata, transcript or judgment problem

1. Unpublish first.
2. Correct the source transcript, boundary or metadata.
3. Rerun every dependent stage.
4. Revalidate and preview the entire debate.
5. Republish only after the checklist passes.

Do not silently hand-edit a published winner or point citation.

### Media problem

1. Unpublish first.
2. Return to the locked Resolve source and correct the export.
3. Generate a new opaque media id in admin.
4. Upload all four publish assets under the new prefix.
5. Revalidate sync, manifest and preview.
6. Republish with the new object keys.
7. Delete the old R2 objects only after the replacement is confirmed.

Never overwrite a published MP4 key. Published media uses immutable caching, so an overwritten key
may continue serving the old bytes.

## 19. Failure guide

| Symptom | Likely cause | Required action |
|---|---|---|
| Durations differ | Resolve ranges or export settings differ | Re-export all three from one range |
| One angle starts late | Edit is not truly aligned | Fix the edit; do not add a browser offset |
| Host words duplicate debaters in transcript | Mixed host audio was transcribed | Use the isolated host microphone |
| Transcript slowly drifts | WAV does not preserve the full edited timeline | Re-export aligned full-length isolated audio |
| Grace appears as judged | Boundary file or merger classification is wrong | Correct boundaries and rerun downstream stages |
| Judge returns `50–50` | Invalid non-draw result | Use the runner's retry/tie-break path |
| Point cites the wrong speaker | Invented or mis-resolved segment id | Drop or fix through sanitization and rerun |
| Upload stops midway | Network interruption | Rerun `rclone copy`; let it compare and continue |
| Safari shows a black MP4 | Range/ETag cache configuration | Verify strong ETags and Cloudflare MP4 cache rules |
| Old video persists after a fix | Published key was overwritten | Rotate the media id and use new object keys |

## 20. Archive after publication

Keep together:

- locked Resolve project and sources;
- three Resolve exports and three canonical web exports;
- isolated aligned WAVs;
- exact boundary, transcript, judgment and manifest JSON;
- raw Whisper and judge logs;
- poster;
- completed publish checklist;
- canonical URL and publication timestamp.

The public R2 bucket is delivery storage, not the only archive.

## 21. Change Log

Update this table after a real production lesson. Record what happened, not only the new setting.

| Date | Version | Change | Reason / observed result |
|---|---|---|---|
| 2026-08-05 | 0.1 | Initial post-edit workflow | Created from the approved V1 design before the first implementation |

## References

- [Video debate product and system design](./video-debate-design.md)
- [Participant rules and format](./video-debate-participant-rules.md)
- [Cloudflare R2 upload methods](https://developers.cloudflare.com/r2/objects/upload-objects/)
- [Cloudflare R2 with rclone](https://developers.cloudflare.com/r2/examples/rclone/)
- [FFmpeg MP4 `faststart`](https://ffmpeg.org/ffmpeg-formats.html)
- [OpenAI Whisper](https://github.com/openai/whisper)
