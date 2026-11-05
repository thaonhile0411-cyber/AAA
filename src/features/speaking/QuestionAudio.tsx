"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { createQuestionPlayer, type QuestionAudioState } from "./audio-player";
import type { ShortQuestion } from "./types";
import styles from "./speaking.module.css";

type AudioController = {
  state: QuestionAudioState;
  play: (question: ShortQuestion) => void;
  stop: () => void;
};
const AudioContext = createContext<AudioController | null>(null);

export function QuestionAudioProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<QuestionAudioState>(null);
  const [player] = useState(() =>
    createQuestionPlayer((src) => new Audio(src), setState),
  );
  useEffect(() => () => player.dispose(), [player]);

  return (
    <AudioContext.Provider
      value={{ state, play: player.play, stop: player.stop }}
    >
      {children}
    </AudioContext.Provider>
  );
}

export function useQuestionAudioController() {
  const controller = useContext(AudioContext);
  if (!controller)
    throw new Error("QuestionAudio requires QuestionAudioProvider");
  return controller;
}

export function QuestionAudio({
  question,
  onBeforePlay,
  disabled = false,
}: {
  question: ShortQuestion;
  onBeforePlay?: () => void;
  disabled?: boolean;
}) {
  const controller = useQuestionAudioController();
  const active = controller.state?.id === question.id ? controller.state : null;
  const playing = active?.status === "playing" || active?.status === "loading";
  return (
    <div className={styles.audioControl}>
      <button
        type="button"
        disabled={disabled}
        className={`${styles.audioButton} ${playing ? styles.audioActive : ""}`}
        aria-label={`${playing ? "Dừng phát âm" : "Phát âm câu hỏi"}: ${question.text}`}
        aria-pressed={playing}
        title="Pronunciation · Giọng Anh–Mỹ tổng hợp"
        onClick={() => {
          if (playing) controller.stop();
          else {
            onBeforePlay?.();
            controller.play(question);
          }
        }}
      >
        <Icon name={playing ? "stop" : "volume"} size={19} />
        <span>
          {active?.status === "loading"
            ? "Đang tải…"
            : playing
              ? "Dừng"
              : "Pronunciation"}
        </span>
      </button>
      {active?.status === "error" && (
        <p role="alert" className={styles.audioError}>
          Không tải được audio. Bấm Pronunciation để thử lại.
        </p>
      )}
      {active?.status === "playing" && (
        <span className={styles.srOnly} role="status">
          Đang phát câu hỏi bằng tiếng Anh.
        </span>
      )}
    </div>
  );
}
