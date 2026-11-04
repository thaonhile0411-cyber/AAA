"""Create a timestamped local draft transcript from a supplied Cambridge MP3.

This utility deliberately runs on the developer machine with faster-whisper.
It never uploads audio or API keys. Its JSON output is a review draft and must
be checked against the book audioscript before it becomes learner-facing data.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import av
from faster_whisper import WhisperModel

# PyAV 19's Windows wheel does not expose ``metadata_errors`` even though
# faster-whisper passes it. Dropping that optional parser flag keeps decoding
# local MP3 files compatible without changing the source audio.
_open_audio = av.open


def open_audio_compat(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _open_audio(*args, **kwargs)


av.open = open_audio_compat


parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--model", default="base.en")
args = parser.parse_args()

model = WhisperModel(args.model, device="cpu", compute_type="int8")
segments, info = model.transcribe(str(args.source), beam_size=5, vad_filter=True)
payload = {
    "source": args.source.name,
    "language": info.language,
    "language_probability": round(info.language_probability, 4),
    "segments": [
        {
            "start": round(segment.start, 2),
            "end": round(segment.end, 2),
            "text": segment.text.strip(),
        }
        for segment in segments
    ],
}
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {len(payload['segments'])} segments to {args.output}")
