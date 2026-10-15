# Bundled Beijing announcements

These are original game announcement scripts, **not official operator recordings**. Playback uses packaged MP3 files and one reusable media element; it does not depend on browser `speechSynthesis`, installed device voices, or a runtime TTS service.

## Coverage and spoken languages

The complete catalog contains **2,052 MP3 recordings**: **1,546 complete Mandarin sentences**, plus the existing **426 station names**, **28 service names**, and **52 phrase parts** (13 each in English, Mandarin, Japanese, and Mongolia Mongolian). The verified audio totals 64,045,728 bytes (64.05 MB) and 10,674.288 seconds across the whole catalog. Recordings load individually when needed, not as a full-catalog download. The manifest records every exact speech script, voice, speaking rate, byte count, duration, and SHA-256 hash.

Station and service identities use their actual public Chinese names and **are spoken in Mandarin in every caption language**. This deliberately avoids inventing unverified English, Japanese, or Mongolian pronunciations. Both Mongolian caption scripts use the same `mn-MN-YesuiNeural` Mongolia Mongolian phrase speech, not a China-region voice. Native-language editorial/pronunciation review is still recommended.

**Mandarin plays one complete recorded sentence per event**, at a natural speaking rate. There is no separate “线路。” label or media reload between words and identities. Boarding welcomes passengers onto the actual service; approaching uses “列车运行前方是…站”; arrivals use “…站到了”; interchange notices name other services at the same real station node, never the current service or a separate external walking connection. Station names already ending in 站 do not gain a second suffix. The two through-services retain both public service names. Completing a passenger journey does not falsely announce a train terminus or ask every passenger to get off.

These are original Beijing-style scripts, not an exact recreation of every operator, train model, or historical recording. See the [historical Line 1 educational transcript](https://chinomandarin.com/en/practice-mandarin-chinese-metro-beijing/) for phrasing context; no third-party operator audio was copied. English, Japanese, and Mongolia Mongolian retain localized phrase parts plus Mandarin identities, including possible pauses between parts. That mixed-language pronunciation policy remains explicit.

Gameplay cannot interrupt an active logical announcement. Only the newest waiting announcement is retained and starts automatically after it ends. Speed never suppresses station identity announcements. Natural punctuation pauses and a short pause between separate announcements remain; the claim is not sample-gapless playback across events.

## Integration

`DeviceVoice` is retained as a compatibility name for prerecorded playback:

```ts
const voice = new DeviceVoice(language, onChange);
voice.offer(caption, seconds, speed, { kind, stationId, lineId });
// Call directly in a genuine Board/enable/retry click or tap:
voice.enable();
```

Descriptor kinds: `board`, `ride`, `transfer`, `walk`, `stop`, `ready`, `complete` (`boarding`/`arrival` remain aliases). For the journey model, use `nextStation` for ride/walk, otherwise `station`, and `nextLineId` as `lineId`. `ready` needs no identities; `complete` may omit them. Other events require a real station; board/ride/stop pairings must name a service that actually stops there. Invalid identities fail visibly rather than substituting fictional audio.

Always use public `offer`, not `queue.offer`, so `enable()` and `replay(caption?)` retain the latest structured descriptor. Offering while off updates that descriptor without playing. `enable(caption?)`/`replay(caption?)` replace active and pending speech and retry within the current user gesture. `mute()` persists `beijing-voice-muted=true`; `enable()` clears that opt-out. Respect the saved opt-out when automatically activating on Board. `setLanguage` cancels stale active/pending recordings but preserves an enabled reusable media element; then offer the new localized snapshot. `suspend()` cancels on exit and clears the saved descriptor; `dispose()` permanently stops playback.

Expose captions regardless of audio availability. `status` is `off`, `ready`, or `unavailable`; `audioState`, `recordingText`, `queue.enabled`, `queue.active`, and `queue.pending` provide playback detail. Blocked, missing, or stalled media aborts the whole logical sentence and disables automatic playback until explicit retry. Test physical Safari/iPad speakers and autoplay policy before deployment; desktop Chromium and emulated touch checks cannot guarantee every device's media policy.

## Reproduce and verify

Run from the repository root with Python, ffprobe, and ffmpeg available. Generation sends only the original public phrase scripts and public station/service names to Microsoft Edge TTS. The October 2026 Edge compatibility fix requires the pinned 7.3.1 revision (older 7.2.8 returns HTTP 403):

```powershell
python -m pip install --target scripts\.beijing-tts-tools -r scripts\requirements-beijing-audio.txt
python scripts\generate-beijing-announcements.py --concurrency 6
python scripts\generate-beijing-announcements.py --verify --concurrency 6
npx vitest run tests\beijing-voice.test.ts tests\beijing-announcements.test.ts tests\beijing-mandarin.test.ts
node tests\beijing-voice.browser.cjs
```

`src\beijing\mandarin-copy.json` owns the original full-sentence templates, spoken service names, and speaking rate. `scripts\beijing_mandarin_catalog.py` combines them with the real network and deduplicates identical sentences by their text hash. The generated `src\beijing\mandarin-announcements.json` is the runtime context/text/URL catalog. `--prepare` refreshes only that catalog without a TTS package or request; normal generation refreshes the catalog and recordings together. Do not manually edit generated text, URLs, or manifest hashes.

Generation uses at most eight concurrent requests (six by default), retries bounded failures, verifies full MP3 decode, and atomically saves a resumable manifest. Only after successful generation does it remove obsolete, generated hash-named Mandarin clips; unrelated filenames are not pruned. Cache matching includes each recording’s speaking rate. `--force` regenerates matching recordings. `--verify` makes **no TTS requests**, requires no TTS Python package, and checks the generated catalog, exact asset set, hashes, sizes, durations, and full decode; the tests additionally verify complete-sentence text, real interchange services, MP3 headers, locale mapping, and service coverage. Bundled MP3 files are served by the same static host as the game, including Vite deployments under a base path.
