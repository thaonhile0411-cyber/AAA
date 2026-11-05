"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";
import { PLAYBACK_SPEEDS } from "@/lib/practice";

function timestamp(seconds: number) {
  const value = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, "0")}`;
}
export function PracticeAudio({
  source,
  title,
  initialTime,
  speed,
  onPosition,
  onSpeed,
  caption,
  seekRequest,
}: {
  source: string;
  title: string;
  initialTime: number;
  speed: number;
  onPosition: (time: number) => void;
  onSpeed: (speed: number) => void;
  caption?: string;
  /** An explicit external seek (for example, selecting a transcript cue). */
  seekRequest?: { id: number; time: number } | null;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(initialTime);
  const [error, setError] = useState("");
  useEffect(() => {
    if (audio.current) audio.current.playbackRate = speed;
  }, [speed]);
  useEffect(() => {
    if (!seekRequest || !audio.current) return;
    const player = audio.current;
    const position = Number.isFinite(player.duration)
      ? Math.min(player.duration, Math.max(0, seekRequest.time))
      : Math.max(0, seekRequest.time);
    player.currentTime = position;
    setTime(position);
    onPosition(position);
  // A request ID means selecting the same cue twice remains intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekRequest?.id]);
  function seek(value: number) {
    if (!audio.current || !Number.isFinite(duration) || duration <= 0) return;
    const position = Math.min(duration, Math.max(0, value));
    audio.current.currentTime = position;
    setTime(position);
    onPosition(position);
  }
  async function toggle() {
    if (!audio.current) return;
    if (!audio.current.paused) {
      audio.current.pause();
      return;
    }
    try {
      setError("");
      await audio.current.play();
    } catch {
      setError("Chưa thể phát audio. Kiểm tra kết nối rồi thử lại.");
    }
  }
  return (
    <section className="audio-panel" aria-label="Trình phát Listening">
      <div className="audio-heading">
        <span className="audio-icon">
          <Icon name="headphones" size={25} />
        </span>
        <div>
          <small>AAA LISTENING PRACTICE</small>
          <h2>{title}</h2>
        </div>
      </div>
      <audio
        ref={audio}
        src={source}
        preload="metadata"
        onLoadedMetadata={() => {
          if (!audio.current) return;
          const length = audio.current.duration;
          setDuration(Number.isFinite(length) ? length : 0);
          audio.current.playbackRate = speed;
          audio.current.currentTime = Number.isFinite(length)
            ? Math.min(time, length)
            : 0;
        }}
        onTimeUpdate={() => {
          const position = audio.current?.currentTime ?? 0;
          setTime(position);
          onPosition(position);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setError(
            "Không tải được audio. Bản trả lời vẫn được lưu trên thiết bị.",
          );
        }}
      />
      <label className="audio-progress-label" htmlFor="audio-progress">
        Tiến trình nghe
      </label>
      <input
        id="audio-progress"
        className="audio-progress"
        aria-label="Tiến trình audio"
        type="range"
        min="0"
        max={duration || 0}
        step="0.1"
        value={Math.min(time, duration || 0)}
        disabled={!duration}
        onChange={(event) => seek(Number(event.target.value))}
      />
      <div className="audio-times">
        <span>{timestamp(time)}</span>
        <span>{timestamp(duration)}</span>
      </div>
      <div className="audio-controls">
        <button
          aria-label="Lùi 10 giây"
          disabled={!duration}
          onClick={() => seek(time - 10)}
        >
          −10s
        </button>
        <button
          aria-label="Lùi 5 giây"
          disabled={!duration}
          onClick={() => seek(time - 5)}
        >
          −5s
        </button>
        <button
          className="audio-play"
          aria-label={playing ? "Tạm dừng audio" : "Phát audio"}
          onClick={toggle}
        >
          <Icon name={playing ? "pause" : "play"} size={22} />
        </button>
        <button
          aria-label="Tiến 5 giây"
          disabled={!duration}
          onClick={() => seek(time + 5)}
        >
          +5s
        </button>
        <button
          aria-label="Tiến 10 giây"
          disabled={!duration}
          onClick={() => seek(time + 10)}
        >
          +10s
        </button>
      </div>
      <fieldset className="audio-speeds">
        <legend>Tốc độ phát</legend>
        {PLAYBACK_SPEEDS.map((rate) => (
          <button
            type="button"
            aria-pressed={speed === rate}
            key={rate}
            onClick={() => onSpeed(rate)}
          >
            {rate.toFixed(rate === 1 ? 1 : rate === 1.25 ? 2 : 1)}×
          </button>
        ))}
      </fieldset>
      <p className="audio-caption">
        {caption ?? "Audio mẫu tiếng Anh được tổng hợp cho AAA · MP3 dưới 15 MB"}
      </p>
      {error && (
        <div className="error-box" role="alert">
          <p>{error}</p>
          <button
            className="secondary-button"
            onClick={() => {
              audio.current?.load();
              setError("");
            }}
          >
            Tải lại audio
          </button>
        </div>
      )}
    </section>
  );
}
