import argparse
import ast
import asyncio
from contextlib import redirect_stdout
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent


def load_script(name):
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), ROOT / "scripts" / (name + ".py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


generate = load_script("generate-economic-narration")
verify = load_script("verify-economic-narration")


class NarrationToolsTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="economic-audio-test-")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.catalog = self.root / "catalog.json"
        self.profiles = self.root / "profiles.json"
        self.output = self.root / "audio"
        self.config = generate.read_json(ROOT / "scripts" / "economic-voice-profiles.json")
        self.scripts = [{"id": "setup.greeting", "text": {"zh": "你好，小钱包！", "en": "Hello, little wallet!", "ja": "こんにちは、小さなお財布！", "mn": "Сайн уу, бяцхан түрийвч!"}}]
        self.save_inputs()
        self.calls = []
        test = self

        class Communicate:
            def __init__(self, text, voice, **kwargs):
                self.text = text
                test.calls.append((text, voice, kwargs))

            async def save(self, path):
                # Unit-test bytes only, never production recordings or speech claims.
                Path(path).write_bytes(b"unit-test-only\n" * 400 + self.text.encode("utf-8"))

        self.fake_edge = argparse.Namespace(__version__="7.3.1", Communicate=Communicate)

    def save_inputs(self):
        generate.write_json_atomic(self.catalog, {"version": 1, "scripts": self.scripts})
        generate.write_json_atomic(self.profiles, self.config)

    def args(self, **overrides):
        values = dict(catalog=self.catalog, profiles=self.profiles, output=self.output, validate=False, verify=False, force=False, language=None, gender=None, id=None, concurrency=3)
        values.update(overrides)
        return argparse.Namespace(**values)

    @staticmethod
    def fixture_stats(path):
        return {"durationSeconds": 1.25, "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest()}

    def run_generation(self, **options):
        with patch.dict(sys.modules, {"edge_tts": self.fake_edge}), patch.object(generate, "inspect", side_effect=self.fixture_stats), redirect_stdout(io.StringIO()):
            asyncio.run(generate.run(self.args(**options)))
        return generate.read_json(self.output / "manifest.json") if (self.output / "manifest.json").exists() else None

    def test_exact_approved_profiles(self):
        expected = {
            ("zh", "boy"): ("zh-CN-YunxiaNeural", "-4%", "+0Hz"),
            ("zh", "girl"): ("zh-CN-XiaoyiNeural", "-8%", "+0Hz"),
            ("en", "boy"): ("en-GB-ThomasNeural", "+6%", "+14Hz"),
            ("en", "girl"): ("en-US-AnaNeural", "+2%", "+0Hz"),
            ("ja", "boy"): ("ja-JP-KeitaNeural", "+6%", "+24Hz"),
            ("ja", "girl"): ("ja-JP-NanamiNeural", "+6%", "+18Hz"),
            ("mn", "boy"): ("mn-MN-BataaNeural", "+4%", "+24Hz"),
            ("mn", "girl"): ("mn-MN-YesuiNeural", "+4%", "+18Hz"),
        }
        for (language, gender), values in expected.items():
            profile = self.config["profiles"][language][gender]
            self.assertEqual(tuple(profile[key] for key in ("voice", "rate", "pitch")), values)
        self.assertTrue(self.config["styleApproved"])

    def test_identical_sentences_share_files_but_not_ids(self):
        self.scripts.append({**self.scripts[0], "id": "setup.replay"})
        self.save_inputs()
        _, entries = generate.load_inputs(self.catalog, self.profiles)
        self.assertEqual(len(entries), 16)
        self.assertEqual(len(generate.unique_assets(entries)), 8)
        manifest = self.run_generation()
        self.assertTrue(manifest["complete"])
        self.assertEqual(len(self.calls), 8)
        self.assertEqual(len(manifest["recordings"]), 16)

    def test_missing_spoken_locale_is_not_a_fallback(self):
        del self.scripts[0]["text"]["mn"]
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "All four"):
            generate.load_inputs(self.catalog, self.profiles)

    def test_traditional_mongolian_does_not_create_a_fifth_voice(self):
        self.config["profiles"]["mn-trad"] = self.config["profiles"]["mn"]
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "Exactly four"):
            generate.load_inputs(self.catalog, self.profiles)

    def test_empty_text_rejected(self):
        self.scripts[0]["text"]["ja"] = "  "
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "Empty"):
            generate.load_inputs(self.catalog, self.profiles)

    def test_duplicate_identifier_rejected(self):
        self.scripts.append(self.scripts[0])
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            generate.load_inputs(self.catalog, self.profiles)

    def test_key_delimiter_injection_rejected(self):
        self.scripts[0]["id"] = "setup|bad"
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "Script IDs"):
            generate.load_inputs(self.catalog, self.profiles)

    def test_unresolved_dynamic_values_rejected(self):
        self.scripts[0]["text"]["en"] = "Pay {price} coins."
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "Unresolved"):
            generate.load_inputs(self.catalog, self.profiles)

    def test_style_approval_required(self):
        self.config["styleApproved"] = False
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "Approved"):
            generate.load_inputs(self.catalog, self.profiles)

    def test_wrong_voice_language_rejected(self):
        self.config["profiles"]["zh"]["boy"]["voice"] = "en-US-AnaNeural"
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "language mismatch"):
            generate.load_inputs(self.catalog, self.profiles)

    def test_profile_change_changes_asset_identity(self):
        _, before = generate.load_inputs(self.catalog, self.profiles)
        self.config["profiles"]["zh"]["boy"]["rate"] = "-5%"
        self.save_inputs()
        _, after = generate.load_inputs(self.catalog, self.profiles)
        self.assertNotEqual(before["zh|boy|setup.greeting"]["file"], after["zh|boy|setup.greeting"]["file"])
        self.assertEqual(before["zh|girl|setup.greeting"]["file"], after["zh|girl|setup.greeting"]["file"])

    def test_validate_is_offline_and_creates_no_assets(self):
        with patch.dict(sys.modules, {"edge_tts": None}), patch.object(generate, "inspect", side_effect=AssertionError("audio tools must not run")), redirect_stdout(io.StringIO()):
            asyncio.run(generate.run(self.args(validate=True)))
        self.assertFalse(self.output.exists())

    def test_unchanged_audio_is_preserved_byte_for_byte(self):
        first = self.run_generation()
        before = {p: (self.output / p).read_bytes() for p in {v["file"] for v in first["recordings"].values()}}
        second = self.run_generation()
        self.assertEqual(len(self.calls), 8)
        self.assertEqual(first, second)
        self.assertEqual(before, {p: (self.output / p).read_bytes() for p in before})
        self.assertTrue(all(v["decodeVerified"] for v in second["recordings"].values()))
        self.assertTrue(all(v["contentReview"] == "pending" for v in second["recordings"].values()))

    def test_partial_language_generation_remains_incomplete(self):
        manifest = self.run_generation(language=["zh"])
        self.assertFalse(manifest["complete"])
        self.assertEqual(len(manifest["recordings"]), 2)
        full = self.run_generation()
        self.assertTrue(full["complete"])
        self.assertEqual(len(self.calls), 8)

    def test_unselected_tampered_asset_cannot_be_certified(self):
        manifest = self.run_generation()
        target = manifest["recordings"]["mn|boy|setup.greeting"]["file"]
        (self.output / target).write_bytes(b"tampered")
        selected = self.run_generation(language=["zh"])
        self.assertFalse(selected["complete"])
        self.assertNotIn("mn|boy|setup.greeting", selected["recordings"])
        repaired = self.run_generation()
        self.assertTrue(repaired["complete"])
        self.assertEqual(len(self.calls), 9)

    def test_source_edit_changes_files_and_prunes_only_owned_obsolete_clips(self):
        first = self.run_generation()
        obsolete = self.output / first["recordings"]["zh|boy|setup.greeting"]["file"]
        unowned = self.output / "keep-my-recording.mp3"
        unowned.write_bytes(b"not-owned-by-generator")
        self.scripts[0]["text"]["zh"] = "你好，今天一起出发吧！"
        self.save_inputs()
        new = self.run_generation()
        self.assertTrue(new["complete"])
        self.assertFalse(obsolete.exists())
        self.assertTrue(unowned.exists())

    def test_offline_verify_rejects_orphan_files_without_changing_manifest(self):
        self.run_generation()
        manifest_bytes = (self.output / "manifest.json").read_bytes()
        (self.output / "orphan.mp3").write_bytes(b"not-a-production-clip")
        with self.assertRaisesRegex(ValueError, "orphaned"):
            self.run_generation(verify=True)
        self.assertEqual(manifest_bytes, (self.output / "manifest.json").read_bytes())

    def test_offline_verify_rejects_hash_tampering(self):
        manifest = self.run_generation()
        target = self.output / manifest["recordings"]["ja|girl|setup.greeting"]["file"]
        target.write_bytes(b"changed")
        with self.assertRaisesRegex(RuntimeError, "metadata/hash changed"):
            self.run_generation(verify=True)

    def test_offline_verify_never_imports_tts(self):
        self.run_generation()
        with patch.dict(sys.modules, {"edge_tts": None}), patch.object(generate, "inspect", side_effect=self.fixture_stats), redirect_stdout(io.StringIO()):
            asyncio.run(generate.run(self.args(verify=True)))

    def test_unknown_id_is_not_silently_ignored(self):
        with self.assertRaisesRegex(ValueError, "matched no"):
            self.run_generation(id=["does.not.exist"])
        self.assertFalse(self.output.exists())

    def test_complete_number_aliases_cannot_corrupt_larger_amounts(self):
        self.assertEqual(verify.normalize("10", "en"), "ten")
        self.assertEqual(verify.normalize("120", "en"), "120")
        self.assertEqual(verify.normalize("2100", "zh"), "2100")
        self.assertFalse(verify.compare("Pay 10 coins", "Pay 100 coins", "en")["strictTextMatch"])

    def test_wrong_amounts_remain_failures(self):
        self.assertFalse(verify.compare("还有六元", "还有四元", "zh")["strictTextMatch"])
        self.assertFalse(verify.compare("Pay six coins", "Pay four coins", "en")["strictTextMatch"])
        self.assertFalse(verify.compare("六枚", "四枚", "ja")["strictTextMatch"])

    def test_mongolian_spelling_and_word_boundaries_not_loosened(self):
        self.assertEqual(verify.NORMALIZATION["mn"], {})
        self.assertFalse(verify.compare("авна эхлээд", "авнаэхлээд", "mn")["strictTextMatch"])
        self.assertFalse(verify.compare("түрийвч", "түрэвч", "mn")["strictTextMatch"])
        self.assertEqual(verify.normalize("авна.Эхлээд", "mn"), "авнаэхлээд")

    def test_empty_recognition_is_never_a_pass(self):
        self.assertFalse(verify.compare("", "", "zh")["strictTextMatch"])
        self.assertFalse(verify.compare("Hello", "Hello", "en", has_speech=False)["strictTextMatch"])

    def test_error_counts_and_review_status_remain_explicit(self):
        result = verify.compare("one two", "one three", "en")
        self.assertEqual(result["referenceWords"], 2)
        self.assertEqual(result["wordErrors"], 1)
        self.assertTrue(result["requiresHumanReview"])
        self.assertTrue(result["differences"])
        self.assertGreater(result["characterErrors"], 0)

    def test_recognizer_is_never_prompted_with_captions(self):
        syntax = ast.parse((ROOT / "scripts" / "verify-economic-narration.py").read_text(encoding="utf-8"))
        calls = [node for node in ast.walk(syntax) if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == "transcribe"]
        self.assertEqual(len(calls), 1)
        keywords = {item.arg: item.value for item in calls[0].keywords}
        self.assertNotIn("initial_prompt", keywords)
        self.assertNotIn("prefix", keywords)
        self.assertFalse(ast.literal_eval(keywords["condition_on_previous_text"]))
        self.assertEqual(ast.literal_eval(keywords["beam_size"]), 5)
        self.assertEqual(ast.literal_eval(keywords["temperature"]), 0)

    def test_asset_paths_cannot_escape_recording_root(self):
        for path in ("..\\secret.mp3", "../secret.mp3", "zh/boy/../secret.mp3", "C:\\secret.mp3"):
            with self.assertRaises(ValueError):
                verify.audio_path(self.output, {"file": path})

    def prepare_bound_report(self):
        manifest = self.run_generation()
        self.model = self.root / "fixture-model"
        self.model.mkdir()
        (self.model / "model.bin").write_bytes(b"fixture-not-for-real-inference")
        fingerprint = verify.sha256(self.model / "model.bin")
        self.report = self.root / "recognition.json"
        records = []
        for key, entry in manifest["recordings"].items():
            records.append({
                "recordingKey": key, "modelSha256": fingerprint,
                "model": {"name": "fixture-model", "revision": "fixture-v1", "modelSha256": fingerprint},
                "audioSha256": entry["sha256"], "normalizationVersion": verify.NORMALIZATION_VERSION,
                "referenceTextProvidedToRecognizer": False, "segments": [{"text": entry["text"]}],
                **verify.compare(entry["text"], entry["text"], entry["language"]),
            })
        verify.write_json_atomic(self.report, {"version": 1, "recordings": records})
        return records

    def verify_bound_report(self, *options):
        arguments = ["verify-economic-narration.py", "--model", str(self.model), "--model-name", "fixture-model", "--model-revision", "fixture-v1", "--catalog", str(self.catalog), "--profiles", str(self.profiles), "--manifest", str(self.output / "manifest.json"), "--report", str(self.report), "--verify-report", *options]
        output = io.StringIO()
        with patch.object(sys, "argv", arguments), patch.dict(sys.modules, {"faster_whisper": None}), redirect_stdout(output):
            verify.main()
        return json.loads(output.getvalue().strip().splitlines()[-1])

    def test_unchanged_recognition_report_is_verified_without_model_execution(self):
        self.prepare_bound_report()
        before = self.report.read_bytes()
        result = self.verify_bound_report()
        self.assertEqual(result["strictMatches"], 8)
        self.assertEqual(result["requiringReview"], 0)
        self.assertEqual(self.report.read_bytes(), before)

    def test_report_cannot_hide_inconsistent_comparison_results(self):
        records = self.prepare_bound_report()
        records[0]["transcript"] = "different words"
        verify.write_json_atomic(self.report, {"version": 1, "recordings": records})
        with self.assertRaisesRegex(ValueError, "inconsistent"):
            self.verify_bound_report()

    def test_report_is_bound_to_authoritative_catalog_not_only_manifest(self):
        self.prepare_bound_report()
        self.scripts[0]["text"]["en"] = "Changed source."
        self.save_inputs()
        with self.assertRaisesRegex(ValueError, "current source catalog"):
            self.verify_bound_report()

    def test_missing_report_cannot_trigger_downloads_in_verify_mode(self):
        self.prepare_bound_report()
        self.report.unlink()
        with self.assertRaisesRegex(ValueError, "Missing or stale"):
            self.verify_bound_report()

    def test_source_caption_prompted_result_cannot_be_reused(self):
        records = self.prepare_bound_report()
        records[0]["referenceTextProvidedToRecognizer"] = True
        verify.write_json_atomic(self.report, {"version": 1, "recordings": records})
        with self.assertRaisesRegex(ValueError, "Missing or stale"):
            self.verify_bound_report()

    def test_stale_normalization_cannot_be_reused(self):
        records = self.prepare_bound_report()
        records[0]["normalizationVersion"] = 1
        verify.write_json_atomic(self.report, {"version": 1, "recordings": records})
        with self.assertRaisesRegex(ValueError, "Missing or stale"):
            self.verify_bound_report()

    def test_mismatches_stay_visible_and_strict_mode_fails(self):
        records = self.prepare_bound_report()
        target = records[0]
        target.update(verify.compare(target["reference"], "unmatched speech", target["recordingKey"].split("|")[0]))
        verify.write_json_atomic(self.report, {"version": 1, "recordings": records})
        result = self.verify_bound_report()
        self.assertEqual(result["requiringReview"], 1)
        before = self.report.read_bytes()
        with self.assertRaisesRegex(SystemExit, "requires review"):
            self.verify_bound_report("--strict")
        self.assertEqual(self.report.read_bytes(), before)

    def test_a_different_model_fingerprint_cannot_reuse_results(self):
        self.prepare_bound_report()
        (self.model / "model.bin").write_bytes(b"different-fixture-model")
        with self.assertRaisesRegex(ValueError, "Missing or stale"):
            self.verify_bound_report()

    def test_audio_tampering_invalidates_independent_report(self):
        self.prepare_bound_report()
        manifest = generate.read_json(self.output / "manifest.json")
        path = self.output / next(iter(manifest["recordings"].values()))["file"]
        path.write_bytes(b"tampered-audio")
        with self.assertRaisesRegex(ValueError, "differs from manifest"):
            self.verify_bound_report()

    @unittest.skipUnless(shutil.which("ffmpeg") and shutil.which("ffprobe"), "optional real MP3 toolchain check")
    def test_real_mp3_full_decode_and_hash(self):
        path = self.root / "toolchain-only-tone.mp3"
        subprocess.run(["ffmpeg", "-v", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=1", "-codec:a", "libmp3lame", str(path)], check=True, capture_output=True)
        result = generate.inspect(path)
        self.assertGreater(result["durationSeconds"], 0)
        self.assertLess(result["durationSeconds"], 2)
        self.assertEqual(result["sha256"], verify.sha256(path))
        self.assertEqual(result["bytes"], path.stat().st_size)


if __name__ == "__main__":
    unittest.main()
