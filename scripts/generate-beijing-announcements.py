r"""Generate and verify bundled Beijing recordings, never runtime TTS.

python scripts\generate-beijing-announcements.py --concurrency 6
python scripts\generate-beijing-announcements.py --verify
Requires edge-tts 7.3.1 (requirements-beijing-audio.txt), ffprobe, and ffmpeg. Only original
public phrase scripts and public station/service names are sent to Edge TTS.
Station/service names are recorded in Mandarin for all caption languages.
Mongolian scripts share Mongolia Mongolian recordings, not a China-region voice.
"""
import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import subprocess
import sys

TOOLS = Path(__file__).resolve().parent / ".beijing-tts-tools"
if TOOLS.is_dir():
    sys.path.insert(0, str(TOOLS))

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "beijing"
RATE = "-8%"


def inputs():
    network = json.loads((ROOT / "src" / "beijing" / "network-data.json").read_text(encoding="utf-8"))
    copy = json.loads((ROOT / "src" / "beijing" / "announcement-copy.json").read_text(encoding="utf-8"))
    items = []
    for language, script in copy.items():
        for key, text in script["phrases"].items():
            items.append((f"phrases/{language}/{key}.mp3", language, text, script["voice"]))
    for category, entries in [("stations", network["stations"]), ("lines", network["lines"])]:
        for entry in entries:
            # Retain the actual public name, including branch and through-service names.
            items.append((f"{category}/{entry['id']}.mp3", "zh-CN", entry["name"] + "。", copy["zh-CN"]["voice"]))
    if len({item[0] for item in items}) != len(items):
        raise RuntimeError("Recording IDs must be unique")
    return network, copy, items


def inspect(path, decode=True):
    if not path.is_file() or path.stat().st_size < 1000:
        raise RuntimeError(f"Missing or empty recording: {path}")
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name", "-of", "json", str(path)], check=True, capture_output=True, text=True)
    data = json.loads(result.stdout)
    duration = float(data["format"]["duration"])
    if not 0 < duration < 60 or not any(s["codec_name"] == "mp3" for s in data["streams"]):
        raise RuntimeError(f"Invalid MP3: {path}")
    if decode:
        subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(path), "-f", "null", "-"], check=True, capture_output=True)
    return {"durationSeconds": round(duration, 3), "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--concurrency", type=int, default=6)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--verify", action="store_true", help="Offline full decode/hash/catalog check; makes no TTS requests")
    args = parser.parse_args()
    if not 1 <= args.concurrency <= 8:
        parser.error("concurrency must be between 1 and 8")
    if not args.verify:
        import edge_tts
    network, copy, items = inputs()
    try:
        previous = json.loads((OUT / "manifest.json").read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        previous = {}
    entries = {}
    semaphore = asyncio.Semaphore(args.concurrency)

    async def generate(relative, language, text, voice):
        async with semaphore:
            path = OUT / relative
            url = f"/audio/beijing/{relative}"
            cached = previous.get("recordings", {}).get(url, {})
            stats = None
            matching = cached.get("recordingText") == text and cached.get("voice") == voice and previous.get("rate") == RATE
            if matching and not args.force:
                try:
                    stats = await asyncio.to_thread(inspect, path)
                    if stats["sha256"] != cached.get("sha256"):
                        raise RuntimeError(f"Recording hash changed: {path}")
                    if args.verify and (stats["bytes"] != cached.get("bytes") or stats["durationSeconds"] != cached.get("durationSeconds")):
                        raise RuntimeError(f"Recording size or duration metadata changed: {path}")
                except (RuntimeError, subprocess.CalledProcessError, KeyError, ValueError):
                    if args.verify:
                        raise
                    stats = None
            if stats is None:
                if args.verify:
                    raise RuntimeError(f"Missing or stale catalog entry: {url}")
                path.parent.mkdir(parents=True, exist_ok=True)
                partial = path.with_suffix(".partial.mp3")
                try:
                    for attempt in range(4):
                        try:
                            await edge_tts.Communicate(text, voice, rate=RATE, pitch="+0Hz", connect_timeout=10, receive_timeout=30).save(str(partial))
                            stats = await asyncio.to_thread(inspect, partial)
                            partial.replace(path)
                            break
                        except Exception:
                            if attempt == 3:
                                raise
                            await asyncio.sleep(2 ** attempt)
                finally:
                    partial.unlink(missing_ok=True)
            entries[url] = {"recordingLanguage": language, "recordingText": text, "voice": voice, **stats}
            if len(entries) % 25 == 0:
                print(f"Verified {len(entries)}/{len(items)} recordings", flush=True)

    results = await asyncio.gather(*(generate(*item) for item in items), return_exceptions=True)
    failures = [str(result) for result in results if isinstance(result, BaseException)]
    if args.verify:
        expected = {f"/audio/beijing/{item[0]}" for item in items}
        if previous.get("complete") is not True or previous.get("stationCount") != len(network["stations"]) or previous.get("serviceCount") != len(network["lines"]):
            failures.append("Manifest must declare the complete real network")
        for category in ["stations", "lines"]:
            expected_index = {entry["id"]: f"/audio/beijing/{category}/{entry['id']}.mp3" for entry in network[category]}
            if previous.get(category) != expected_index:
                failures.append(f"Manifest {category} index does not match real network identities")
        if set(previous.get("recordings", {})) != expected:
            failures.append("Manifest recording set does not match the complete network catalog")
        actual = {f"/audio/beijing/{path.relative_to(OUT).as_posix()}" for path in OUT.rglob("*.mp3")}
        if actual != expected:
            failures.append("Asset set contains missing or orphaned MP3s")
    else:
        OUT.mkdir(parents=True, exist_ok=True)
        manifest = {
            "version": 1, "generator": f"edge-tts {edge_tts.__version__}", "rate": RATE, "format": "MP3",
            "complete": not failures, "stationCount": len(network["stations"]), "serviceCount": len(network["lines"]),
            "notice": "Original public game announcement scripts, not official operator recordings. Generated online; bundled playback needs no TTS service or speechSynthesis. Every station and service name is spoken in Mandarin in every language. Traditional Mongolian captions share Mongolia Mongolian phrase speech, not an Inner Mongolia regional voice.",
            "locales": {language: {"phraseRecordingLanguage": "mn-Cyrl-MN" if language == "mn-Mong-CN" else language, "identityRecordingLanguage": "zh-CN"} for language in [*copy, "mn-Mong-CN"]},
            "stations": {entry["id"]: f"/audio/beijing/stations/{entry['id']}.mp3" for entry in network["stations"]},
            "lines": {entry["id"]: f"/audio/beijing/lines/{entry['id']}.mp3" for entry in network["lines"]},
            "recordings": dict(sorted(entries.items())),
        }
        # Keep completed recordings resumable after a partial generation failure.
        partial_manifest = OUT / "manifest.partial.json"
        partial_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        partial_manifest.replace(OUT / "manifest.json")
    if failures:
        raise RuntimeError(f"{len(failures)} recording validation/generation failures: " + "; ".join(failures[:8]))
    duration = sum(entry["durationSeconds"] for entry in entries.values())
    size = sum(entry["bytes"] for entry in entries.values())
    print(f"Verified {len(entries)} actual MP3s; {duration:.3f} seconds; {size} bytes; {len(network['stations'])} stations; {len(network['lines'])} services", flush=True)


if __name__ == "__main__":
    asyncio.run(main())
