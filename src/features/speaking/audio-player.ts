import type { ShortQuestion } from "./types";

export type QuestionAudioState = {
  id: string;
  status: "loading" | "playing" | "error";
} | null;
export type AudioPort = {
  play(): Promise<void>;
  pause(): void;
  removeAttribute(name: string): void;
  load(): void;
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
};

export function createQuestionPlayer(
  factory: (src: string) => AudioPort,
  onState: (state: QuestionAudioState) => void,
) {
  let current: AudioPort | null = null;
  let detach: (() => void) | null = null;
  function release() {
    const player = current;
    current = null;
    detach?.();
    detach = null;
    if (player) {
      player.pause();
      player.removeAttribute("src");
      player.load();
    }
  }
  function play(question: ShortQuestion) {
    release();
    let player: AudioPort;
    try {
      player = factory(question.audioSrc);
    } catch {
      onState({ id: question.id, status: "error" });
      return;
    }
    current = player;
    onState({ id: question.id, status: "loading" });
    const playing = () => {
      if (current === player) onState({ id: question.id, status: "playing" });
    };
    const ended = () => {
      if (current === player) {
        release();
        onState(null);
      }
    };
    const failed = () => {
      if (current === player) {
        release();
        onState({ id: question.id, status: "error" });
      }
    };
    player.addEventListener("playing", playing);
    player.addEventListener("ended", ended);
    player.addEventListener("error", failed);
    detach = () => {
      player.removeEventListener("playing", playing);
      player.removeEventListener("ended", ended);
      player.removeEventListener("error", failed);
    };
    try {
      void player.play().catch(failed);
    } catch {
      failed();
    }
  }
  return {
    play,
    stop() {
      release();
      onState(null);
    },
    dispose: release,
  };
}
