"""Regressions for the embedding pre-lab's context-window handling, offline."""

import importlib.util
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "labs/lab-09/starter/embedding_demo.py"


class TokenRow(list):
    def tolist(self):
        return list(self)


class WordTokenizer:
    """Small reversible token fixture; token IDs identify source positions."""

    def encode(self, text, add_special_tokens=False, **kwargs):
        return [int(word[1:]) for word in text.split()]

    def decode(self, tokens, **kwargs):
        return " ".join(f"w{token}" for token in tokens)


class WindowModel:
    def __init__(self, window=12):
        self.tokenizer = WordTokenizer()
        self.max_seq_length = window
        self.prompts = {"Document": "document prompt", "Query": "query prompt"}
        self.truncation_requests = []
        self.encoded_batches = []

    def preprocess(self, texts, prompt_name=None, **kwargs):
        text = texts[0] if isinstance(texts, list) else texts
        tokens = [1000, 1001, 1002] + self.tokenizer.encode(text) + [1003]
        truncate = kwargs.get("processing_kwargs", {}).get("text", {}).get("truncation", True)
        self.truncation_requests.append(truncate)
        if truncate:
            tokens = tokens[:self.max_seq_length]
        return {"input_ids": [TokenRow(tokens)]}

    def encode(self, texts, **kwargs):
        self.encoded_batches.append(texts)
        return [[0.0] for _ in texts]


class ExpandedTokenizer(WordTokenizer):
    """A decoded substring needs additional tokens when tokenized again."""

    def encode(self, text, **kwargs):
        words = super().encode(text, **kwargs)
        return [9000, 9001] + words if text.startswith(" ") else words

    def decode(self, tokens, **kwargs):
        return " " + super().decode(tokens, **kwargs)


class EmbeddingWindowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("lab09_embedding_demo", SCRIPT)
        cls.demo = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.demo)

    def test_length_guard_accounts_for_prompt_and_special_tokens(self):
        model = WindowModel(window=12)
        exact = " ".join(f"w{i}" for i in range(8))
        self.assertEqual(self.demo.check_text_length(model, exact), 12)
        with self.assertRaises(ValueError):
            self.demo.check_text_length(model, exact + " w8")
        self.assertEqual(model.max_seq_length, 12)
        self.assertFalse(any(model.truncation_requests))

    def test_oversized_batch_is_rejected_before_inference(self):
        model = WindowModel(window=12)
        oversized = " ".join(f"w{i}" for i in range(9))
        with self.assertRaises(ValueError):
            self.demo.encode_text(model, ["w0", oversized])
        self.assertEqual(model.encoded_batches, [])
        self.assertEqual(model.max_seq_length, 12)

    def test_overlapping_chunks_retain_tail_and_cover_the_source(self):
        model = WindowModel(window=12)
        source_ids = list(range(19))
        text = model.tokenizer.decode(source_ids)
        chunks = self.demo.chunk_text(model, text, max_tokens=10, overlap=2)
        self.assertGreater(len(chunks), 1)
        self.assertEqual(chunks[0]["start"], 0)
        self.assertEqual(chunks[-1]["end"], len(source_ids))
        covered = set()
        for index, chunk in enumerate(chunks):
            start, end = chunk["start"], chunk["end"]
            self.assertGreater(end, start)
            covered.update(range(start, end))
            self.assertEqual(model.tokenizer.encode(chunk["text"]), source_ids[start:end])
            self.assertLessEqual(self.demo.check_text_length(model, chunk["text"]), 10)
            if index:
                self.assertEqual(start, chunks[index - 1]["end"] - 2)
        self.assertEqual(covered, set(range(len(source_ids))))
        self.assertIn("w18", chunks[-1]["text"])

    def test_decoded_chunks_are_checked_again_before_embedding(self):
        model = WindowModel(window=10)
        model.tokenizer = ExpandedTokenizer()
        text = " ".join(f"w{i}" for i in range(15))
        chunks = self.demo.chunk_text(model, text, max_tokens=10, overlap=1)
        self.assertEqual(chunks[-1]["end"], 15)
        for chunk in chunks:
            self.assertLessEqual(self.demo.check_text_length(model, chunk["text"]), 10)
        self.assertEqual(model.max_seq_length, 10)

    def test_invalid_chunk_settings_fail_instead_of_looping_or_dropping_text(self):
        model = WindowModel()
        for size, overlap in [(0, 0), (-1, 0), (4, -1), (4, 4), (4, 5)]:
            with self.subTest(size=size, overlap=overlap), self.assertRaises(ValueError):
                self.demo.chunk_text(model, "w0 w1 w2 w3 w4", max_tokens=size, overlap=overlap)

    def test_media_paths_are_checked_before_loading_the_model(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            image, audio, video = [directory / name for name in ("picture.png", "clip.wav", "movie.mp4")]
            for path in (image, audio, video):
                path.write_bytes(b"fixture path; decoding is tested with the actual model")
            args = SimpleNamespace(image=str(image), audio=str(audio), video=str(video))
            self.assertEqual(self.demo.validate_media(args),
                             [("image", str(image.resolve())), ("audio", str(audio.resolve())),
                              ("video", str(video.resolve()))])
            for invalid in (None, str(directory), str(directory / "missing.mp4")):
                args.video = invalid
                with self.subTest(path=invalid), self.assertRaises(ValueError):
                    self.demo.validate_media(args)

    def test_help_and_invalid_media_do_not_require_model_dependencies_or_downloads(self):
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            shutil.copy2(SCRIPT, directory / SCRIPT.name)
            for name in ("torch", "sentence_transformers", "numpy"):
                (directory / f"{name}.py").write_text("raise AssertionError('model dependency loaded')\n")
            result = subprocess.run([sys.executable, str(directory / SCRIPT.name), "--help"],
                                    cwd=directory, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn("usage:", result.stdout)
            result = subprocess.run([sys.executable, str(directory / SCRIPT.name), "--mode", "media"],
                                    cwd=directory, capture_output=True, text=True, timeout=10)
            self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
            self.assertIn("--image must name an existing local file", result.stderr)
            self.assertNotIn("model dependency loaded", result.stderr)


if __name__ == "__main__":
    unittest.main()
