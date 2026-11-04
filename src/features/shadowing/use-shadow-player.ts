"use client";
import { useEffect, useRef, useState } from "react";
import type { PracticeMode, ShadowModel } from "./types";
import { playbackSegment, sentenceAt } from "./timeline";

export function useShadowPlayer(model: ShadowModel) {
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [mode, setModeState] = useState<PracticeMode>("continuous");
  const [speed, setSpeedState] = useState(1);
  const [error, setError] = useState("");
  const context = useRef<AudioContext | null>(null);
  const buffer = useRef<AudioBuffer | null>(null);
  const source = useRef<AudioBufferSourceNode | null>(null);
  const frame = useRef(0);
  const request = useRef(0);
  const position = useRef(0);
  const anchor = useRef({ clock: 0, start: 0, end: model.duration });
  const modeRef = useRef<PracticeMode>("continuous");
  const speedRef = useRef(1);
  const selected = useRef(0);
  const afterEnd = useRef<(() => void) | null>(null);

  function readTime() {
    return source.current && context.current
      ? Math.min(
          anchor.current.end,
          anchor.current.start +
            (context.current.currentTime - anchor.current.clock) *
              speedRef.current,
        )
      : position.current;
  }
  function halt() {
    request.current++;
    position.current = readTime();
    cancelAnimationFrame(frame.current);
    const previous = source.current;
    source.current = null;
    if (previous) {
      previous.onended = null;
      try {
        previous.stop();
      } catch {
        /* already stopped */
      }
      previous.disconnect();
    }
  }
  function pause() {
    halt();
    setPlaying(false);
    setLoading(false);
    setTime(position.current);
    afterEnd.current = null;
  }
  async function start(from = position.current) {
    halt();
    const token = request.current;
    setError("");
    setWaiting(false);
    setLoading(true);
    setPlaying(false);
    try {
      const ctx = context.current ?? new AudioContext();
      context.current = ctx;
      await ctx.resume();
      if (!buffer.current) {
        const response = await fetch(model.audioSrc);
        if (!response.ok)
          throw new Error("Không tải được audio mẫu. Hãy thử lại.");
        buffer.current = await ctx.decodeAudioData(
          await response.arrayBuffer(),
        );
      }
      if (token !== request.current) return;
      const segment = playbackSegment(
        model.sentences,
        from,
        modeRef.current,
        selected.current,
      );
      const { index, end, start: begin } = segment;
      selected.current = index;
      const node = ctx.createBufferSource();
      node.buffer = buffer.current;
      node.playbackRate.value = speedRef.current;
      node.connect(ctx.destination);
      source.current = node;
      position.current = begin;
      anchor.current = { clock: ctx.currentTime, start: begin, end };
      node.onended = () => {
        if (source.current !== node) return;
        source.current = null;
        node.disconnect();
        cancelAnimationFrame(frame.current);
        position.current = end;
        setTime(end);
        setPlaying(false);
        if (modeRef.current === "loop") {
          void start(model.sentences[selected.current].start);
        } else if (
          modeRef.current === "sentence" &&
          index < model.sentences.length - 1
        ) {
          setWaiting(true);
        } else {
          const done = afterEnd.current;
          afterEnd.current = null;
          done?.();
        }
      };
      // A scheduled buffer duration stops at the sentence boundary without waiting for timeupdate/RAF.
      node.start(0, begin, Math.max(0.001, segment.duration));
      setLoading(false);
      setPlaying(true);
      setTime(begin);
      const tick = () => {
        if (source.current === node) {
          position.current = readTime();
          setTime(position.current);
          frame.current = requestAnimationFrame(tick);
        }
      };
      frame.current = requestAnimationFrame(tick);
    } catch (cause) {
      if (token !== request.current) return;
      setLoading(false);
      setPlaying(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "Trình duyệt chưa phát được audio. Hãy bấm Play để thử lại.",
      );
    }
  }
  function continuePractice() {
    if (waiting) {
      const index = Math.min(selected.current + 1, model.sentences.length - 1);
      selected.current = index;
      position.current = model.sentences[index].start;
    }
    void start();
  }
  function chooseSentence(index: number) {
    pause();
    selected.current = index;
    position.current = model.sentences[index].start;
    setTime(position.current);
    setWaiting(false);
  }
  function setMode(value: PracticeMode) {
    pause();
    modeRef.current = value;
    setModeState(value);
    selected.current = sentenceAt(model.sentences, position.current);
    position.current = model.sentences[selected.current].start;
    setTime(position.current);
    setWaiting(false);
  }
  function setSpeed(value: number) {
    const wasPlaying = Boolean(source.current);
    halt();
    speedRef.current = value;
    setSpeedState(value);
    setPlaying(false);
    if (wasPlaying) void start();
  }
  function playAll(done?: () => void) {
    pause();
    modeRef.current = "continuous";
    setModeState("continuous");
    afterEnd.current = done ?? null;
    position.current = 0;
    void start(0);
  }
  useEffect(
    () => () => {
      request.current++;
      cancelAnimationFrame(frame.current);
      const node = source.current;
      source.current = null;
      if (node) {
        node.onended = null;
        try {
          node.stop();
        } catch {}
        node.disconnect();
      }
      void context.current?.close();
    },
    [],
  );
  return {
    time,
    playing,
    loading,
    waiting,
    mode,
    speed,
    error,
    pause,
    play: continuePractice,
    chooseSentence,
    setMode,
    setSpeed,
    playAll,
  };
}
