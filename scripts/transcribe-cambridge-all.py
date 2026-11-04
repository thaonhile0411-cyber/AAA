"""Generate local timestamped draft transcripts for all supplied Cambridge MP3s.

Run after the Cambridge audio is present under public/assets. Output is source
material for manual answer-key review, not browser code by itself.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import av
from faster_whisper import WhisperModel

_open_audio = av.open


def open_audio_compat(*args, **kwargs):
    kwargs.pop("metadata_errors", None)
    return _open_audio(*args, **kwargs)


av.open = open_audio_compat

root = Path("public/assets/cambridge-10/audio")
output_root = Path("artifacts/cambridge-10-transcripts")
output_root.mkdir(parents=True, exist_ok=True)
model = WhisperModel("base.en", device="cpu", compute_type="int8")

for source in sorted(root.glob("IELTS 10 Test * Section *.mp3")):
    match = re.fullmatch(r"IELTS 10 Test (\d+) Section (\d+)\.mp3", source.name)
    if not match:
        continue
    target = output_root / f"test-{match.group(1)}-section-{match.group(2)}.json"
    if target.exists():
        print(f"Skip existing {target.name}", flush=True)
        continue
    segments, info = model.transcribe(str(source), beam_size=5, vad_filter=True)
    payload = {
        "source": source.name,
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
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {target.name}: {len(payload['segments'])} segments", flush=True)
