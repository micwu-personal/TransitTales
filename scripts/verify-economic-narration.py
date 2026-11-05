r"""Independently recognize economic MP3s with an already installed local model.

python scripts\verify-economic-narration.py --model C:\path\to\local\ct2-model
python scripts\verify-economic-narration.py --model C:\path\to\mongolian-model --language mn --model-name Blgn94/whisper-small-mn-v2

Requires faster-whisper, numpy, and ffmpeg. No audio is uploaded, models are not
fetched, and source captions are never supplied as recognition prompts. Exact
normalized text mismatches remain review findings, not claimed pronunciation
errors. Use --strict to fail on any mismatch; --verify-report validates cached
report provenance without recognizing unchanged recordings again.
"""
import argparse
import difflib
import hashlib
import json
from pathlib import Path
import re
import subprocess
import unicodedata

ROOT = Path(__file__).resolve().parent.parent
LANGUAGES = ("zh", "en", "ja", "mn")
NORMALIZATION_VERSION = 2
NORMALIZATION = {
    "zh": {"10": "十", "6": "六", "4": "四", "2": "两"},
    "ja": {"10": "十", "6": "六", "4": "四", "2": "二", "わたし": "私", "きょうだい": "兄弟", "おつり": "お釣り"},
    "en": {"it's": "it is", "let's": "let us", "don't": "do not", "10": "ten", "6": "six", "4": "four", "2": "two"},
    "mn": {},
}


def normalize(text, language):
    if language not in LANGUAGES:
        raise ValueError("Unsupported spoken language")
    text = unicodedata.normalize("NFKC", text).lower().replace("’", "'")
    for source, replacement in NORMALIZATION[language].items():
        if source.isdecimal():
            # Unlike the old audition comparator, aliases must be whole numbers.
            text = re.sub(r"(?<!\d)" + re.escape(source) + r"(?!\d)", replacement, text)
        else:
            text = text.replace(source, replacement)
    if language in ("en", "mn"):
        return " ".join("".join(c for c in text if unicodedata.category(c)[0] in "LN" or c.isspace()).split())
    return "".join(c for c in text if unicodedata.category(c)[0] in "LN")


def distance(left, right):
    row = list(range(len(right) + 1))
    for index, a in enumerate(left, 1):
        updated = [index]
        for j, b in enumerate(right, 1):
            updated.append(min(updated[-1] + 1, row[j] + 1, row[j - 1] + (a != b)))
        row = updated
    return row[-1]


def compare(reference, transcript, language, has_speech=True):
    expected = normalize(reference, language)
    observed = normalize(transcript, language)
    errors = distance(expected, observed)
    result = {
        "reference": reference, "transcript": transcript,
        "normalizedReference": expected, "normalizedTranscript": observed,
        "characterErrors": errors, "referenceCharacters": len(expected),
        "characterErrorRate": round(errors / max(1, len(expected)), 6),
        "strictTextMatch": bool(has_speech and expected and observed and errors == 0),
        "requiresHumanReview": not bool(has_speech and expected and observed and errors == 0),
        "differences": [{"operation": tag, "expected": expected[i:j], "recognized": observed[k:l]} for tag, i, j, k, l in difflib.SequenceMatcher(a=expected, b=observed, autojunk=False).get_opcodes() if tag != "equal"],
    }
    if language in ("en", "mn"):
        result["wordErrors"] = distance(expected.split(), observed.split())
        result["referenceWords"] = len(expected.split())
        result["wordErrorRate"] = round(result["wordErrors"] / max(1, result["referenceWords"]), 6)
    return result


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        while block := stream.read(1024 * 1024):
            digest.update(block)
    return digest.hexdigest()


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


def audio_path(root, entry):
    relative = entry.get("file", "")
    if not isinstance(relative, str) or not re.fullmatch(r"(?:zh|en|ja|mn)/(?:boy|girl)/[0-9a-f]{32}\.mp3", relative):
        raise ValueError("Audio path does not match the generated asset contract")
    path = root / relative
    if not path.resolve().is_relative_to(root.resolve()):
        raise ValueError("Audio path escapes the recording directory")
    return path


def recognize(model, path, language):
    import numpy as np
    decoded = subprocess.run(["ffmpeg", "-v", "error", "-xerror", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", "16000", "pipe:1"], check=True, capture_output=True)
    audio = np.frombuffer(decoded.stdout, dtype="<f4")
    if not audio.size or not np.isfinite(audio).all() or not np.any(audio):
        raise ValueError("Decoded recording is empty, nonfinite, or silent")
    segments, _ = model.transcribe(audio, language=language, task="transcribe", beam_size=5, temperature=0, condition_on_previous_text=False, vad_filter=False, word_timestamps=False)
    segments = list(segments)
    transcript = "".join(segment.text for segment in segments).strip()
    details = [{"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text, "averageLogProbability": round(s.avg_logprob, 4), "noSpeechProbability": round(s.no_speech_prob, 4)} for s in segments]
    return transcript, details


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, type=Path, help="Existing local CTranslate2 model directory; no downloads")
    parser.add_argument("--model-name", default="local-whisper-model")
    parser.add_argument("--model-revision", default="unspecified")
    parser.add_argument("--manifest", type=Path, default=ROOT / "public" / "audio" / "economic" / "manifest.json")
    parser.add_argument("--catalog", type=Path, default=ROOT / "src" / "economic" / "narration-catalog.json")
    parser.add_argument("--profiles", type=Path, default=ROOT / "scripts" / "economic-voice-profiles.json")
    parser.add_argument("--report", type=Path, default=ROOT / "public" / "audio" / "economic" / "recognition.json")
    parser.add_argument("--language", action="append", choices=LANGUAGES)
    parser.add_argument("--gender", action="append", choices=("boy", "girl"))
    parser.add_argument("--id", action="append")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--strict", action="store_true", help="Fail on any exact normalized text mismatch")
    parser.add_argument("--allow-partial", action="store_true", help="Explicit diagnostic check of a still-generating manifest")
    parser.add_argument("--verify-report", action="store_true", help="Validate bound reports without re-recognizing audio")
    args = parser.parse_args()
    if not args.model.is_dir() or not (args.model / "model.bin").is_file():
        parser.error("--model must be a complete existing local model directory")
    if args.force and args.verify_report:
        parser.error("--verify-report cannot be combined with --force")
    manifest = read_json(args.manifest)
    if manifest.get("version") != 1 or not isinstance(manifest.get("recordings"), dict):
        raise ValueError("Invalid recording manifest")
    if manifest.get("complete") is not True and not args.allow_partial:
        raise ValueError("Manifest is not complete; use --allow-partial only for explicit diagnostics")
    import importlib.util
    spec = importlib.util.spec_from_file_location("economic_narration_generator", ROOT / "scripts" / "generate-economic-narration.py")
    generator = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(generator)
    config, expected_entries = generator.load_inputs(args.catalog, args.profiles)
    if manifest.get("catalogSha256") != sha256(args.catalog) or manifest.get("profiles") != config["profiles"]:
        raise ValueError("Recording manifest is not bound to the current source catalog and approved profiles")
    if manifest.get("complete") is True and set(manifest["recordings"]) != set(expected_entries):
        raise ValueError("Complete manifest must contain the entire current narration catalog")
    selected = {}
    for key, entry in manifest["recordings"].items():
        if key not in expected_entries or not generator.matching_entry(entry, expected_entries[key]):
            raise ValueError("Recording does not match the authoritative narration source: " + key)
        parts = key.split("|", 2)
        if len(parts) != 3 or parts[0] not in LANGUAGES or parts[1] not in ("boy", "girl"):
            raise ValueError("Invalid recording key")
        language, gender, identifier = parts
        if entry.get("language") != language or entry.get("gender") != gender or not isinstance(entry.get("text"), str) or not entry["text"].strip():
            raise ValueError("Recording identity does not match its key")
        if (not args.language or language in args.language) and (not args.gender or gender in args.gender) and (not args.id or identifier in args.id):
            selected[key] = entry
    if not selected:
        raise ValueError("Selection matched no recordings")
    if args.id and not set(args.id).issubset({key.split("|", 2)[2] for key in selected}):
        raise ValueError("Selection contains an unknown or unavailable script ID")
    model_hash = sha256(args.model / "model.bin")
    if model_hash == hashlib.sha256(b"").hexdigest():
        raise ValueError("Local model.bin is empty")
    model_identity = {"name": args.model_name, "revision": args.model_revision, "modelSha256": model_hash}
    try:
        previous = read_json(args.report)
    except FileNotFoundError:
        previous = {}
    records = {(entry["recordingKey"], entry["modelSha256"]): entry for entry in previous.get("recordings", [])}
    model = None
    recognized_assets = {}
    failures = []
    matched = 0
    for index, (key, entry) in enumerate(sorted(selected.items()), 1):
        path = audio_path(args.manifest.parent, entry)
        audio_hash = sha256(path)
        if audio_hash != entry.get("sha256") or path.stat().st_size != entry.get("bytes"):
            raise ValueError("Recording content differs from manifest: " + key)
        record_key = (key, model_hash)
        cached = records.get(record_key)
        matching = cached is not None and cached.get("audioSha256") == audio_hash and cached.get("reference") == entry["text"] and cached.get("normalizationVersion") == NORMALIZATION_VERSION and cached.get("referenceTextProvidedToRecognizer") is False and cached.get("model") == model_identity
        if matching and not args.force:
            result = cached
            recalculated = compare(entry["text"], cached["transcript"], entry["language"], bool(cached.get("segments")))
            if any(result.get(field) != value for field, value in recalculated.items()):
                raise ValueError("Cached report comparison is inconsistent: " + key)
        else:
            if args.verify_report:
                raise ValueError("Missing or stale independent report: " + key)
            if model is None:
                from faster_whisper import WhisperModel
                model = WhisperModel(str(args.model), device="cpu", compute_type="int8", cpu_threads=8, local_files_only=True)
            identity = (audio_hash, entry["language"])
            if identity not in recognized_assets:
                recognized_assets[identity] = recognize(model, path, entry["language"])
            transcript, segments = recognized_assets[identity]
            result = {
                "recordingKey": key, "file": entry["file"], "language": entry["language"],
                "audioSha256": audio_hash, "model": model_identity, "modelSha256": model_hash,
                "normalizationVersion": NORMALIZATION_VERSION,
                "referenceTextProvidedToRecognizer": False,
                "decoder": "FFmpeg float32 PCM, mono, 16000 Hz",
                "segments": segments, **compare(entry["text"], transcript, entry["language"], bool(segments)),
            }
            if cached:
                result["priorAttempts"] = [*cached.get("priorAttempts", []), {k: v for k, v in cached.items() if k != "priorAttempts"}]
        records[record_key] = result
        matched += int(result["strictTextMatch"])
        if not result["strictTextMatch"]:
            failures.append(key)
        if not args.verify_report:
            report = {
                "version": 1, "recognitionIsLocal": True, "referenceTextProvidedToRecognizer": False,
                "normalizationVersion": NORMALIZATION_VERSION, "normalizationRules": NORMALIZATION,
                "normalizationNotice": "Version 2 aliases only complete numbers, not digit substrings. Mongolian has no spelling aliases. Word boundaries remain significant; punctuation-joined Mongolian words remain counted exactly as in the audition comparison.",
                "notice": "Exact text checks do not certify accent, warmth, age, or all pronunciation. Nonzero recognition errors are retained for review and do not prove corresponding spoken errors. Voice-style approval does not waive content checks.",
                "recordings": [records[k] for k in sorted(records)],
            }
            write_json_atomic(args.report, report)
        if index % 25 == 0:
            print(f"Independent comparisons {index}/{len(selected)}; strict matches {matched}; requiring review {len(failures)}", flush=True)
    print(json.dumps({"recordingKeys": len(selected), "strictMatches": matched, "requiringReview": len(failures), "modelSha256": model_hash, "model": args.model_name, "partialManifest": manifest.get("complete") is not True}, ensure_ascii=False), flush=True)
    if args.strict and failures:
        raise SystemExit("Independent text verification requires review: " + ", ".join(failures[:12]))


if __name__ == "__main__":
    main()
