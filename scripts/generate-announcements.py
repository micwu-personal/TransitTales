"""Rebuild original transit sentence MP3s. Requires existing edge-tts 7.2.8 and ffprobe.

Run from the project root: python scripts\\generate-announcements.py
Only the original public announcement text is sent to Microsoft Edge's speech
service. No source files, credentials, or environment contents are uploaded.
Generated MP3s play locally on browsers without a speech synthesis dependency.
Traditional Mongolian captions explicitly share mn-Cyrl-MN Mongolia Mongolian
recordings; they never trigger a separate traditional-script or Mandarin voice.
Manifest locales describe captions and aliases, while recordingText is speech.
"""
import argparse
import asyncio
import json
from pathlib import Path
import re
import subprocess

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "transit"
STOPS = {
    "coral": ["harbor", "market", "central", "museum", "garden"],
    "blue": ["north", "library", "central", "stadium", "riverside", "airport"],
}


def announcement_copy():
    source = (ROOT / "src" / "rush" / "announcements.ts").read_text(encoding="utf-8")
    match = re.search(r"export const ANNOUNCEMENT_COPY = (\{.*?\}) as const;", source, re.S)
    if not match:
        raise RuntimeError("Cannot find JSON-compatible announcement copy")
    return json.loads(match.group(1))


def recording_language(language, copy):
    canonical = copy[language].get("recordingLanguage", language)
    if canonical not in copy or copy[canonical].get("recordingLanguage", canonical) != canonical:
        raise RuntimeError(f"Invalid canonical recording locale: {language}")
    if copy[language]["voice"] != copy[canonical]["voice"]:
        raise RuntimeError(f"Aliased voice must match the canonical recording: {language}")
    return canonical


def captions(language, copy):
    script = copy[language]
    for line, stations in STOPS.items():
        for station in stations:
            for kind in ["next", "approaching", "terminus", "arriving"]:
                text = script[kind].replace("{station}", script["stations"][station]).replace("{line}", script["lines"][line])
                key = f"{kind}-{line}-{station}"
                yield key, text
                if station == "central":
                    transfer = "blue" if line == "coral" else "coral"
                    yield f"{key}-transfer-{transfer}", text + script["transfer"].replace("{transferLine}", script["lines"][transfer])
    for kind in ["pass-through", "safety"]:
        yield kind, script[kind]


def recordings(copy):
    # Generate only canonical scripts: never send traditional captions to another language's voice.
    canonical_languages = dict.fromkeys(recording_language(language, copy) for language in copy)
    for language in canonical_languages:
        for key, text in captions(language, copy):
            yield language, key, text, copy[language]["voice"]


def inspect(path):
    if not path.exists() or path.stat().st_size == 0:
        raise RuntimeError(f"Empty or missing recording: {path}")
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name", "-of", "json", str(path)], check=True, capture_output=True, text=True)
    data = json.loads(probe.stdout)
    duration = float(data["format"]["duration"])
    if duration <= 0 or not any(s["codec_name"] == "mp3" for s in data["streams"]):
        raise RuntimeError(f"Invalid MP3: {path}")
    return round(duration, 3)


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--concurrency", type=int, default=6)
    parser.add_argument("--force", action="store_true", help="Regenerate existing validated recordings")
    args = parser.parse_args()
    if not 1 <= args.concurrency <= 12:
        parser.error("concurrency must be between 1 and 12")
    semaphore = asyncio.Semaphore(args.concurrency)
    entries = {}
    copy = announcement_copy()
    try:
        previous = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        previous = {}

    async def generate(language, key, text, voice):
        async with semaphore:
            path = OUT / language / f"{key}.mp3"
            path.parent.mkdir(parents=True, exist_ok=True)
            duration = None
            url = f"/audio/transit/{language}/{key}.mp3"
            cached = previous.get("recordings", {}).get(url, {})
            if not args.force and cached.get("text") == text and cached.get("voice") == voice and previous.get("rate") == "-8%":
                try:
                    duration = await asyncio.to_thread(inspect, path)
                except (RuntimeError, subprocess.CalledProcessError, KeyError, ValueError):
                    pass
            if duration is None:
                partial = path.with_suffix(".partial.mp3")
                try:
                    for attempt in range(4):
                        try:
                            await edge_tts.Communicate(text, voice, rate="-8%", pitch="+0Hz").save(str(partial))
                            duration = await asyncio.to_thread(inspect, partial)
                            partial.replace(path)
                            break
                        except Exception:
                            if attempt == 3:
                                raise
                            await asyncio.sleep(2 ** attempt)
                finally:
                    partial.unlink(missing_ok=True)
            url = f"/audio/transit/{language}/{key}.mp3"
            entries[url] = {"language": language, "text": text, "recordingLanguage": language, "recordingText": text, "voice": voice, "durationSeconds": duration, "bytes": path.stat().st_size}
            print(f"OK {language}/{key} {duration}s", flush=True)

    await asyncio.gather(*(generate(*item) for item in recordings(copy)))
    locales = {}
    for language in copy:
        canonical = recording_language(language, copy)
        locales[language] = {
            "recordingLanguage": canonical,
            "fallback": language != canonical,
            "notice": "Mongolia Mongolian recording with traditional Mongolian captions; not an Inner Mongolia regional voice." if language != canonical else "Native locale recording.",
            "announcements": {
                key: {"captionText": text, "asset": f"/audio/transit/{canonical}/{key}.mp3"}
                for key, text in captions(language, copy)
            },
        }
    manifest = {"version": 2, "generator": "edge-tts 7.2.8", "rate": "-8%", "format": "MP3", "notice": "Original fictional transit announcements. Speech generated online; playback uses bundled local recordings. Browser autoplay policies still apply. Caption locales may explicitly share a canonical spoken recording; text and recordingText always describe actual speech.", "locales": locales, "recordings": dict(sorted(entries.items()))}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Verified {len(entries)} full-sentence MP3 recordings", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
