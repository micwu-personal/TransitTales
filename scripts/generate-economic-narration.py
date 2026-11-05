r"""Generate the economic game's approved prerecorded voices, never runtime TTS.

python scripts\generate-economic-narration.py --validate
python scripts\generate-economic-narration.py --concurrency 6
python scripts\generate-economic-narration.py --verify

Install requirements-economic-audio.txt only for generation. ffprobe and ffmpeg
are required for full MP3 validation. Only the game's original public narration
scripts are sent to Edge. Content recognition is a separate, local operation.
"""
import argparse
import asyncio
import hashlib
import json
import math
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
LANGUAGES = ("zh", "en", "ja", "mn")
GENDERS = ("boy", "girl")
MAX_DURATION_SECONDS = 60
TOOLS = ROOT / "scripts" / ".economic-tts-tools"
if TOOLS.is_dir():
    sys.path.insert(0, str(TOOLS))


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def write_json_atomic(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_name(path.name + ".partial")
    try:
        temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def load_inputs(catalog_path, profiles_path):
    catalog = read_json(catalog_path)
    config = read_json(profiles_path)
    if catalog.get("version") != 1 or not isinstance(catalog.get("scripts"), list) or not catalog["scripts"]:
        raise ValueError("Narration catalog must contain a nonempty version-1 scripts list")
    if config.get("version") != 1 or config.get("styleApproved") is not True:
        raise ValueError("Approved version-1 voice profiles are required")
    profiles = config.get("profiles", {})
    if set(profiles) != set(LANGUAGES):
        raise ValueError("Exactly four spoken languages are required; both Mongolian scripts share mn audio")
    for language in LANGUAGES:
        if set(profiles[language]) != set(GENDERS):
            raise ValueError(f"Both approved genders are required: {language}")
        for gender in GENDERS:
            profile = profiles[language][gender]
            if set(profile) != {"voice", "rate", "pitch"} or not all(isinstance(v, str) for v in profile.values()):
                raise ValueError(f"Invalid voice profile: {language}/{gender}")
            if not profile["voice"].startswith(language + "-") or not profile["voice"].endswith("Neural"):
                raise ValueError(f"Voice language mismatch: {language}/{gender}")
            if not re.fullmatch(r"[+-]\d+%", profile["rate"]) or not re.fullmatch(r"[+-]\d+Hz", profile["pitch"]):
                raise ValueError(f"Invalid rate/pitch: {language}/{gender}")
    entries = {}
    ids = set()
    for script in catalog["scripts"]:
        identifier = script.get("id")
        if not isinstance(identifier, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.:/-]{0,159}", identifier):
            raise ValueError("Script IDs must be unique bounded semantic identifiers")
        if identifier in ids:
            raise ValueError(f"Duplicate script ID: {identifier}")
        ids.add(identifier)
        text = script.get("text", {})
        if not isinstance(text, dict):
            raise ValueError(f"All four spoken texts are required: {identifier} (text must be an object)")
        if set(text) != set(LANGUAGES):
            missing = sorted(set(LANGUAGES) - set(text))
            unexpected = sorted(set(text) - set(LANGUAGES))
            raise ValueError(f"All four spoken texts are required: {identifier}; missing={missing}, unexpected={unexpected}")
        for language in LANGUAGES:
            sentence = text[language]
            if not isinstance(sentence, str) or not sentence.strip() or len(sentence) > 2000:
                raise ValueError(f"Empty or excessively long script: {identifier}/{language}")
            if re.search(r"\{[^{}]+\}|\$\{", sentence):
                raise ValueError(f"Unresolved spoken template: {identifier}/{language}")
            for gender in GENDERS:
                profile = profiles[language][gender]
                identity = {"language": language, "gender": gender, "text": sentence, **profile}
                digest = hashlib.sha256(json.dumps(identity, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")).hexdigest()
                key = f"{language}|{gender}|{identifier}"
                entries[key] = {"file": f"{language}/{gender}/{digest[:32]}.mp3", **identity}
    return config, dict(sorted(entries.items()))


def inspect(path):
    if not path.is_file() or path.stat().st_size < 1000:
        raise ValueError(f"Missing or empty recording: {path}")
    response = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_name", "-of", "json", str(path)], check=True, capture_output=True, text=True)
    data = json.loads(response.stdout)
    duration = float(data["format"]["duration"])
    if not math.isfinite(duration) or not 0 < duration <= MAX_DURATION_SECONDS or not any(s.get("codec_name") == "mp3" for s in data.get("streams", [])):
        raise ValueError(f"Invalid or unbounded MP3: {path}")
    subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(path), "-f", "null", "-"], check=True, capture_output=True)
    return {"durationSeconds": round(duration, 3), "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}


def matching_entry(actual, expected):
    return isinstance(actual, dict) and all(actual.get(key) == value for key, value in expected.items())


def unique_assets(entries):
    assets = {}
    for key, entry in entries.items():
        group = assets.setdefault(entry["file"], {"entry": entry, "keys": []})
        if group["entry"] != entry:
            raise ValueError("Content-address collision")
        group["keys"].append(key)
    return assets


def make_manifest(config, entries, complete, catalog_sha, generator):
    return {
        "version": 1, "complete": complete, "format": "MP3", "generator": generator,
        "catalogSha256": catalog_sha, "profiles": config["profiles"],
        "notice": config["notice"] + " Full MP3 decode/hash verification is not pronunciation certification. See the independent recognition report for content checks. No browser speech synthesis or live speech service is used during play.",
        "recordings": dict(sorted(entries.items())),
    }


async def run(args):
    config, expected = load_inputs(args.catalog, args.profiles)
    assets = unique_assets(expected)
    if args.validate:
        print(json.dumps({"scriptCount": len(expected) // 8, "recordingKeys": len(expected), "uniqueMp3s": len(assets), "spokenLanguages": list(LANGUAGES), "voiceProfiles": 8}, ensure_ascii=False), flush=True)
        return
    selected = {relative: group for relative, group in assets.items() if (not args.language or group["entry"]["language"] in args.language) and (not args.gender or group["entry"]["gender"] in args.gender) and (not args.id or any(key.split("|", 2)[2] in args.id for key in group["keys"]))}
    if not selected:
        raise ValueError("Selection matched no catalog recordings")
    if args.id and not set(args.id).issubset({key.split("|", 2)[2] for key in expected}):
        raise ValueError("Selection contains an unknown script ID")
    manifest_path = args.output / "manifest.json"
    try:
        previous = read_json(manifest_path)
    except FileNotFoundError:
        previous = {}
    previous_entries = previous.get("recordings", {})
    if not isinstance(previous_entries, dict):
        raise ValueError("Existing recording manifest is invalid")
    catalog_sha = hashlib.sha256(args.catalog.read_bytes()).hexdigest()
    entries = {key: actual for key, actual in previous_entries.items() if key in expected and matching_entry(actual, expected[key]) and actual.get("decodeVerified") is True}
    if args.verify:
        if previous.get("version") != 1 or previous.get("complete") is not True or previous.get("profiles") != config["profiles"] or previous.get("catalogSha256") != catalog_sha or set(previous_entries) != set(expected):
            raise ValueError("Manifest must match the complete current catalog and approved profiles")
        if len(selected) != len(assets):
            raise ValueError("--verify checks the entire catalog; do not combine it with selection options")
        actual_files = {path.relative_to(args.output).as_posix() for path in args.output.rglob("*.mp3")}
        if actual_files != set(assets):
            raise ValueError("Asset set has missing or orphaned MP3s")
        generator = previous.get("generator", "unknown")
    else:
        import edge_tts
        if edge_tts.__version__ != "7.3.1":
            raise ValueError("Generation requires pinned edge-tts 7.3.1; see requirements-economic-audio.txt")
        generator = "edge-tts " + edge_tts.__version__
        args.output.mkdir(parents=True, exist_ok=True)
        if shutil.disk_usage(args.output).free < 32 * 1024 * 1024:
            raise ValueError("Less than 32 MiB free; avoid exhausting this shared disk")
    failures = []
    completed = 0
    semaphore = asyncio.Semaphore(args.concurrency)
    if not args.verify:
        write_json_atomic(manifest_path, make_manifest(config, entries, False, catalog_sha, generator))

    async def process(relative, group):
        nonlocal completed
        async with semaphore:
            expected_entry = group["entry"]
            path = args.output / relative
            temporary = path.with_suffix(".partial.mp3")
            cached = next((entries[key] for key in group["keys"] if key in entries), None)
            try:
                stats = None
                if cached and not args.force:
                    try:
                        stats = await asyncio.to_thread(inspect, path)
                        if any(stats[field] != cached.get(field) for field in stats):
                            raise ValueError(f"Recording metadata/hash changed: {relative}")
                    except (ValueError, OSError, subprocess.CalledProcessError, KeyError):
                        if args.verify:
                            raise
                        stats = None
                if stats is None:
                    if args.verify:
                        raise ValueError(f"Missing or stale recording: {relative}")
                    if shutil.disk_usage(args.output).free < 32 * 1024 * 1024:
                        raise ValueError("Disk budget exhausted; completed recordings remain resumable")
                    path.parent.mkdir(parents=True, exist_ok=True)
                    for attempt in range(4):
                        try:
                            await edge_tts.Communicate(expected_entry["text"], expected_entry["voice"], rate=expected_entry["rate"], pitch=expected_entry["pitch"], connect_timeout=10, receive_timeout=30).save(str(temporary))
                            stats = await asyncio.to_thread(inspect, temporary)
                            temporary.replace(path)
                            break
                        except Exception:
                            if attempt == 3:
                                raise
                            await asyncio.sleep(2 ** attempt)
                    content_status = "pending"
                else:
                    content_status = cached.get("contentReview", "pending")
                for key in group["keys"]:
                    entries[key] = {**expected[key], **stats, "decodeVerified": True, "contentReview": content_status}
                completed += 1
                if completed % 25 == 0 and not args.verify:
                    write_json_atomic(manifest_path, make_manifest(config, entries, False, catalog_sha, generator))
                if completed % 25 == 0:
                    print(f"Decoded and hashed {completed}/{len(selected)} unique MP3s", flush=True)
            except Exception as error:
                failures.append(f"{relative}: {type(error).__name__}: {error}")
            finally:
                temporary.unlink(missing_ok=True)

    await asyncio.gather(*(process(relative, group) for relative, group in selected.items()))
    # A selected generation cannot certify missing or tampered unselected assets.
    for relative, group in assets.items():
        if relative in selected:
            continue
        cached = next((entries[key] for key in group["keys"] if key in entries), None)
        path = args.output / relative
        try:
            intact = cached is not None and path.is_file() and path.stat().st_size == cached.get("bytes") and hashlib.sha256(path.read_bytes()).hexdigest() == cached.get("sha256")
        except OSError:
            intact = False
        if not intact:
            for key in group["keys"]:
                entries.pop(key, None)
    complete = not failures and set(entries) == set(expected)
    if not args.verify:
        write_json_atomic(manifest_path, make_manifest(config, entries, complete, catalog_sha, generator))
        if complete:
            # Prune only this generator's obsolete content-addressed recordings.
            for path in args.output.rglob("*.mp3"):
                if re.fullmatch(r"[0-9a-f]{32}", path.stem) and path.relative_to(args.output).as_posix() not in assets:
                    path.unlink()
    if failures:
        raise RuntimeError(f"{len(failures)} failures; completed assets are retained: " + "; ".join(failures[:8]))
    if args.verify and not complete:
        raise ValueError("Catalog validation did not produce a complete recording set")
    verified_files = {entry["file"]: entry for entry in entries.values()}
    print(json.dumps({"complete": complete, "recordingKeys": len(entries), "uniqueMp3s": len(verified_files), "bytes": sum(entry["bytes"] for entry in verified_files.values()), "durationSeconds": round(sum(entry["durationSeconds"] for entry in verified_files.values()), 3), "contentVerifiedByDecode": False}, ensure_ascii=False), flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=ROOT / "src" / "economic" / "narration-catalog.json")
    parser.add_argument("--profiles", type=Path, default=ROOT / "scripts" / "economic-voice-profiles.json")
    parser.add_argument("--output", type=Path, default=ROOT / "public" / "audio" / "economic")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--validate", action="store_true", help="Validate scripts/profiles only; no network or audio tools")
    mode.add_argument("--verify", action="store_true", help="Full offline MP3 decode/hash/catalog validation")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--language", action="append", choices=LANGUAGES)
    parser.add_argument("--gender", action="append", choices=GENDERS)
    parser.add_argument("--id", action="append")
    parser.add_argument("--concurrency", type=int, default=6)
    args = parser.parse_args()
    if not 1 <= args.concurrency <= 8:
        parser.error("concurrency must be between 1 and 8")
    if args.verify and args.force:
        parser.error("--verify cannot be combined with --force")
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
