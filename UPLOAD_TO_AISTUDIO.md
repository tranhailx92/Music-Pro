# Music-Pro Playable Product Patch — AUDITED REVISION

Base independently rechecked against GitHub `main` commit:
`1542974a0274d41791bd2209521eff139d3b83f1`

## IMPORTANT FOR AI STUDIO

This ZIP already contains the source changes completed and audited by ChatGPT.

**Do not rewrite, refactor, auto-fix, redesign, regenerate, or improve these files.**
AI Studio should only:
1. upload/extract the ZIP preserving relative paths;
2. overwrite existing files where paths match;
3. run `npm run lint`;
4. run `npm run build`;
5. if either command fails, STOP and report the exact unedited error log to ChatGPT. Do not edit code automatically.

No package dependency needs to be added for this revision.

## New files
- `src/music/score-timeline.ts`
- `src/music/midi-export.ts`
- `src/music/musicxml-transform.ts`
- `src/music/score-id.ts`
- `src/audio/synth.ts`
- `src/audio/playback-engine.ts`
- `src/audio/offline-render.ts`
- `src/components/ScorePlayer.tsx`
- `src/components/ScoreQuickEdit.tsx`
- `src/components/ResultWorkspace.tsx`
- `tests/music/score-timeline.test.ts`
- `tests/music/midi-export.test.ts`
- `tests/music/musicxml-transform.test.ts`
- `tests/music/playback-helpers.test.ts`
- `tests/music/score-id.test.ts`
- `docs/implementation/PLAYABLE_PRODUCT_PLAN.md`
- `docs/implementation/PLAYABLE_PRODUCT_AUDIT.md`

## Replacement files
- `src/contexts/AudioContext.tsx`
- `src/components/NowPlayingBar.tsx`
- `src/components/MusicXMLViewer.tsx`
- `src/views/ComposeView.tsx`
- `src/views/RunsView.tsx`
- `src/services/runs.ts`
- `src/types.ts`
- `src/App.tsx`

## What this patch delivers
- Real deterministic browser playback from MusicXML instead of the old mock 180-second timer.
- Play / pause / seek / stop through the global player.
- Rolling look-ahead scheduling so a full 3–4 minute arrangement is not scheduled into Web Audio at once.
- Multi-part ScoreTimeline with tempo map, time signatures, measure map, chords, voices, backup/forward, ties, staves, transposition metadata, and basic percussion playback mapping.
- Standard MIDI File Type-1 export directly from the MusicXML master, including MIDI channel 10 for percussion parts.
- Offline WAV **demo** rendering directly in the browser.
- Result Workspace for Lead Sheet and final arrangement.
- Best-effort OSMD cursor synchronization at current-measure level.
- Quick edits for ±1 semitone, global BPM, and Undo; Playback/MIDI/WAV consume the edited MusicXML.
- Namespace-aware MusicXML edit element creation and schema-safe `<pitch>` ordering for inserted `<alter>`.
- MusicXML / MIDI / WAV download from Composer and History.
- Lyria remains an optional Studio Version and is not required for score playback.
- Composer no longer requires Firebase just to open/use.
- A Firestore history-save failure no longer turns a successful arrangement into a false composition failure.
- Existing Core Composer / validator / SongDNA / model routing / Lyria server bridge are untouched.

## Important quality boundary

The deterministic Score Preview/WAV layer uses a lightweight Web Audio synthesizer. It is intended for checking and using the exact composition (notes/rhythm/tempo), not as a studio-quality sampled-instrument renderer. A SoundFont/SF2 playback layer is the next planned audio-quality milestone; Lyria remains the optional AI Studio Version.

## Verification performed on this audited revision
- Strict TypeScript typecheck of music/audio/test modules: PASS.
- Strict typecheck of changed React integration files against interface stubs: PASS.
- ScoreTimeline pure timing/numbering/dynamics tests: PASS.
- MIDI encoding / Type-1 / percussion-channel tests: PASS.
- Playback helper tests: PASS.
- Score identity tests: PASS.
- Pure pitch/transposition/key-signature tests: PASS.
- Delivered TS/TSX file inventory: 23 files; all covered by the two compile checks above.
- Placeholder scan (`TODO/TBD/FIXME/HACK`): PASS / none.
- Protected Core paths (`composer`, validator, SongDNA, server/model routing): not included in ZIP.

Full repository `npm run lint` and `npm run build` must still be run after upload because this isolated audit workspace does not contain the repository's full `node_modules` tree.

## After upload — manual smoke test
1. Open Composer without Firebase configured: Composer must still open.
2. Generate/use a valid Lead Sheet and press **Nghe bản nhạc**.
3. Verify Play/Pause/Seek/Stop and global Now Playing update in real time.
4. Verify current measure follows playback on the OSMD score.
5. Download `.mid`; open it in MuseScore/DAW and verify tempo/notes.
6. Download `_demo.wav`; play it outside Music-Pro.
7. Generate Step 4 arrangement and repeat playback/export checks.
8. Use −1 semitone, +1 semitone, BPM edit, and Undo; verify score/playback/MIDI/WAV follow the edited MusicXML.
9. With Firebase absent, Step 4 remains successful and only History persistence is unavailable.
10. With Firebase available, open History and play/export a saved score.
11. Lyria OFF must not disable MusicXML playback/MIDI/WAV.
12. Repeat playback and WAV smoke on iPhone/iPad Safari.

## Deliberately not changed in this patch
- `server/music/composer.ts`
- `server/music/musicxml-validator.ts`
- `server/music/song-dna.ts`
- Gemini model routing/fallback policy
- Lyria production bridge
- `package.json`

See `docs/implementation/PLAYABLE_PRODUCT_AUDIT.md` for the full roadmap cross-check and remaining milestones.
