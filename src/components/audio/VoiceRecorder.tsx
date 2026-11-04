"use client";
import { useEffect, useRef, useState } from "react";
import type { CapturedRecording } from "./types";
import {
  microphoneMessage,
  recordingMime,
  formatRecordingTime,
} from "./recorder-support";
import styles from "./voice-recorder.module.css";

export function VoiceRecorder({
  onRecording,
  onBeforeRecord,
  onBusy,
  disabled = false,
}: {
  onRecording: (recording: CapturedRecording) => void;
  onBeforeRecord: () => void;
  onBusy: (busy: boolean) => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<
    "idle" | "requesting" | "recording" | "stopping"
  >("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const generation = useRef(0);
  function release() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    cancelAnimationFrame(frame.current);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void context.current?.close();
    context.current = null;
  }
  function stop() {
    if (recorder.current?.state === "recording") {
      setStatus("stopping");
      recorder.current.stop();
    }
  }
  async function start() {
    const token = ++generation.current;
    onBeforeRecord();
    setError("");
    setStatus("requesting");
    onBusy(true);
    try {
      if (
        !navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined" ||
        typeof AudioContext === "undefined"
      )
        throw new Error("unsupported");
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (token !== generation.current) {
        mic.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = mic;
      const ctx = new AudioContext();
      context.current = ctx;
      await ctx.resume();
      if (token !== generation.current) {
        release();
        return;
      }
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      ctx.createMediaStreamSource(mic).connect(analyser);
      const mime = recordingMime((type) => MediaRecorder.isTypeSupported(type));
      const capture = new MediaRecorder(
        mic,
        mime ? { mimeType: mime } : undefined,
      );
      recorder.current = capture;
      const chunks: Blob[] = [];
      let bytes = 0;
      let failed = false;
      const started = performance.now();
      capture.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          bytes += event.data.size;
          if (bytes > 20 * 1024 * 1024) {
            failed = true;
            setError("Bản thu quá lớn. Hãy ghi đoạn ngắn hơn.");
            stop();
          }
        }
      };
      capture.onerror = () => {
        failed = true;
        setError(
          "Ghi âm bị gián đoạn. Bản thu trước vẫn được giữ; hãy thử lại.",
        );
        stop();
      };
      capture.onstop = () => {
        const duration = (performance.now() - started) / 1000;
        release();
        recorder.current = null;
        if (token !== generation.current) return;
        setStatus("idle");
        onBusy(false);
        const blob = new Blob(chunks, {
          type: capture.mimeType || mime || "audio/webm",
        });
        if (!failed && blob.size && duration >= 0.5)
          onRecording({ blob, duration, createdAt: new Date().toISOString() });
        else if (!failed)
          setError("Bản thu quá ngắn hoặc không có dữ liệu. Hãy thử ghi lại.");
      };
      mic.getAudioTracks().forEach((track) => {
        track.onended = () => {
          failed = true;
          setError("Microphone đã bị ngắt. Kết nối lại rồi thử ghi lại.");
          stop();
        };
      });
      capture.start(250);
      setElapsed(0);
      setStatus("recording");
      timer.current = setInterval(() => {
        const seconds = (performance.now() - started) / 1000;
        setElapsed(seconds);
        if (seconds >= 180) stop();
      }, 100);
      const samples = new Uint8Array(analyser.fftSize);
      const draw = () => {
        if (token !== generation.current) return;
        analyser.getByteTimeDomainData(samples);
        const drawing = canvas.current?.getContext("2d");
        if (drawing && canvas.current) {
          const { width, height } = canvas.current;
          drawing.clearRect(0, 0, width, height);
          drawing.strokeStyle = "#175cdd";
          drawing.lineWidth = 2;
          drawing.beginPath();
          for (let i = 0; i < samples.length; i++) {
            const x = (i * width) / samples.length;
            const y = (samples[i] * height) / 256;
            if (i === 0) drawing.moveTo(x, y);
            else drawing.lineTo(x, y);
          }
          drawing.stroke();
        }
        frame.current = requestAnimationFrame(draw);
      };
      draw();
    } catch (cause) {
      release();
      if (token !== generation.current) return;
      setStatus("idle");
      onBusy(false);
      setError(
        cause instanceof Error && cause.message === "unsupported"
          ? "Trình duyệt chưa hỗ trợ ghi âm. Dùng Chrome/Edge/Safari mới trên HTTPS hoặc localhost."
          : microphoneMessage(cause),
      );
    }
  }
  useEffect(
    () => () => {
      generation.current++;
      if (recorder.current) {
        recorder.current.onstop = null;
        recorder.current.ondataavailable = null;
        recorder.current.onerror = null;
        if (recorder.current.state !== "inactive") recorder.current.stop();
      }
      if (timer.current) clearInterval(timer.current);
      cancelAnimationFrame(frame.current);
      stream.current?.getTracks().forEach((track) => track.stop());
      void context.current?.close();
    },
    [],
  );
  return (
    <section aria-label="Ghi âm giọng nói" className={styles.recorder}>
      <div className={styles.recorderHeader}>
        <strong>Voice recorder</strong>
        <span role="timer" aria-label="Thời gian ghi âm">
          {formatRecordingTime(elapsed)} / 3:00
        </span>
      </div>
      <canvas
        ref={canvas}
        width={650}
        height={90}
        className={styles.waveform}
        aria-label={
          status === "recording"
            ? "Sóng âm trực tiếp từ microphone"
            : "Sóng âm sẽ hiển thị khi ghi âm"
        }
      />
      <div className={styles.controls}>
        <button
          className={styles.primaryButton}
          disabled={
            disabled || status === "requesting" || status === "stopping"
          }
          onClick={() => (status === "recording" ? stop() : void start())}
        >
          {status === "requesting"
            ? "Đang xin quyền mic…"
            : status === "stopping"
              ? "Đang tạo bản thu…"
              : status === "recording"
                ? "■ Stop recording"
                : "● Start recording"}
        </button>
        <span className={styles.muted}>
          {status === "recording"
            ? "Đang ghi âm · hãy đọc thành tiếng"
            : "Chỉ thu khi bạn bấm Start recording"}
        </span>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </section>
  );
}
