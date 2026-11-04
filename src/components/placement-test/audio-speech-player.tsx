"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

type AudioSpeechPlayerProps = {
  script: string;
  estimatedDurationSeconds?: number;
};

export function AudioSpeechPlayer({
  script,
  estimatedDurationSeconds = 180,
}: AudioSpeechPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = estimatedDurationSeconds;
  const [isSupported] = useState(() => {
    if (typeof window !== "undefined") {
      return "speechSynthesis" in window;
    }
    return true;
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedBeforePauseRef = useRef<number>(0);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopPlayback();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const elapsed =
        elapsedBeforePauseRef.current +
        (Date.now() - startTimeRef.current) / 1000;
      setCurrentTime(() => {
        if (elapsed >= duration) {
          return duration;
        }
        return Math.floor(elapsed);
      });
    }, 250);
  }

  function pauseTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    elapsedBeforePauseRef.current +=
      (Date.now() - startTimeRef.current) / 1000;
  }

  function resetTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = 0;
    elapsedBeforePauseRef.current = 0;
    setCurrentTime(0);
  }

  function playAudio() {
    if (!isSupported || typeof window === "undefined") {
      setIsPlaying(true);
      setIsPaused(false);
      startTimer();
      return;
    }

    const synth = window.speechSynthesis;

    if (isPaused && synth.paused) {
      synth.resume();
      setIsPaused(false);
      setIsPlaying(true);
      startTimer();
      return;
    }

    // New playback
    synth.cancel();
    resetTimer();

    const utterance = new SpeechSynthesisUtterance(script);
    utterance.lang = "en-US";
    utterance.rate = 0.95;

    // Pick natural English voice if available
    const voices = synth.getVoices();
    const englishVoice =
      voices.find(
        (v) => v.lang.startsWith("en-") && v.name.includes("Natural"),
      ) ||
      voices.find((v) => v.lang === "en-US") ||
      voices.find((v) => v.lang.startsWith("en")) ||
      null;

    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
      startTimer();
    };

    utterance.onpause = () => {
      setIsPaused(true);
      setIsPlaying(false);
      pauseTimer();
    };

    utterance.onresume = () => {
      setIsPaused(false);
      setIsPlaying(true);
      startTimer();
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
      resetTimer();
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
      resetTimer();
    };

    synth.speak(utterance);
  }

  function pauseAudio() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.pause();
    }
    setIsPaused(true);
    setIsPlaying(false);
    pauseTimer();
  }

  function stopPlayback() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    resetTimer();
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white border border-[#e6eaf1] rounded-2xl p-5 shadow-xs space-y-4">
      {/* Top row: Title and Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#edf3ff] text-[#175cdd] flex items-center justify-center">
            <Icon name="headphones" size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#11213f] m-0">
              IELTS Listening Audio Track
            </h3>
            <p className="text-xs text-[#64748b] m-0">
              Audio phát liên tục cho toàn bộ 10 câu hỏi
            </p>
          </div>
        </div>

        {/* Live Audio Status Badge */}
        {isPlaying ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147054] bg-[#eefaf4] px-3 py-1 rounded-full border border-[#bce4d6]">
            <span className="w-2 h-2 rounded-full bg-[#34aa8b] animate-ping" />
            Đang phát audio...
          </span>
        ) : isPaused ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#b45309] bg-[#fffbeb] px-3 py-1 rounded-full border border-[#fde68a]">
            Tạm dừng
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#64748b] bg-[#f8fafc] px-3 py-1 rounded-full border border-[#e2e8f0]">
            Sẵn sàng phát
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2.5 bg-[#f1f4f9] rounded-full overflow-hidden border border-[#e6eaf1]">
          <div
            className="h-full bg-[#175cdd] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs text-[#8a95a8] font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          {isPlaying ? (
            <button
              type="button"
              onClick={pauseAudio}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
            >
              <Icon name="pause" size={15} />
              <span>Tạm dừng</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={playAudio}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#175cdd] hover:bg-[#104dc1] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Icon name="play" size={15} />
              <span>{isPaused ? "Tiếp tục phát" : "Phát Audio"}</span>
            </button>
          )}

          {(isPlaying || isPaused || currentTime > 0) && (
            <button
              type="button"
              onClick={stopPlayback}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-[#dce3ee] text-[#52637a] text-xs font-semibold hover:bg-[#f8fafc] transition-all cursor-pointer"
            >
              <Icon name="refresh" size={13} />
              <span>Phát lại từ đầu</span>
            </button>
          )}
        </div>

        <div className="text-xs text-[#8a95a8] flex items-center gap-1.5">
          <Icon name="volume" size={15} />
          <span>Âm thanh chuẩn giọng đọc bản ngữ</span>
        </div>
      </div>
    </div>
  );
}
