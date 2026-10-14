# Bundled Beijing announcements

These are original game announcement scripts, **not official operator recordings**. Playback uses packaged MP3 files and one reusable media element; it does not depend on browser `speechSynthesis`, installed device voices, or a runtime TTS service.

## Coverage and spoken languages

The complete catalog contains **506 MP3 recordings**: all **426 station names**, all **28 service names**, and **52 phrase parts** (13 each in English, Mandarin, Japanese, and Mongolia Mongolian). Total recorded duration is **1,051.488 seconds**; MP3 payload is **6,308,928 bytes**. The manifest records every exact speech script, voice, byte count, duration, and SHA-256 hash.

Station and service identities use their actual public Chinese names and **are spoken in Mandarin in every caption language**. This deliberately avoids inventing unverified English, Japanese, or Mongolian pronunciations. Both Mongolian caption scripts use the same `mn-MN-YesuiNeural` Mongolia Mongolian phrase speech, not a China-region voice. Native-language editorial/pronunciation review is still recommended.

A logical announcement joins localized phrase parts with recorded station/service identities. Gameplay cannot interrupt any of its parts. There may be natural short pauses between MP3 parts; this is not sample-gapless audio. Only the newest waiting announcement is retained and it starts automatically after the entire active announcement ends. Speed never suppresses station identity announcements.

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
npx vitest run tests\beijing-voice.test.ts tests\beijing-announcements.test.ts
node tests\beijing-voice.browser.cjs
```

Generation uses at most eight concurrent requests (six by default), retries bounded failures, verifies full MP3 decode, and atomically saves a resumable manifest. `--force` regenerates matching recordings. `--verify` makes **no TTS requests**, requires no TTS Python package, and checks the exact catalog, hashes, sizes, durations, and full decode; the tests additionally verify manifest text, headers, locale mapping, and service coverage. Bundled MP3 files are served by the same static host as the game, including Vite deployments under a base path.
