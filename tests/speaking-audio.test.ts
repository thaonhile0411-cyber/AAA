import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createQuestionPlayer,
  type AudioPort,
  type QuestionAudioState,
} from "../src/features/speaking/audio-player.ts";

class FakeAudio extends EventTarget implements AudioPort {
  paused = false;
  cleared = false;
  reloaded = false;
  rejectPlay: ((error: Error) => void) | null = null;
  play() {
    return new Promise<void>((_, reject) => {
      this.rejectPlay = reject;
    });
  }
  pause() {
    this.paused = true;
  }
  removeAttribute(name: string) {
    if (name === "src") this.cleared = true;
  }
  load() {
    this.reloaded = true;
  }
  emit(event: string) {
    this.dispatchEvent(new Event(event));
  }
}
const first = { id: "first", text: "First question?", audioSrc: "/first.wav" };
const second = {
  id: "second",
  text: "Second question?",
  audioSrc: "/second.wav",
};

function setup() {
  const audio: FakeAudio[] = [];
  const sources: string[] = [];
  const states: QuestionAudioState[] = [];
  const player = createQuestionPlayer(
    (src) => {
      sources.push(src);
      const item = new FakeAudio();
      audio.push(item);
      return item;
    },
    (state) => states.push(state),
  );
  return { audio, sources, states, player };
}

test("speaker starts the correct file, waits for actual playback and resets on ended", () => {
  const { audio, sources, states, player } = setup();
  player.play(first);
  assert.deepEqual(sources, ["/first.wav"]);
  assert.deepEqual(states.at(-1), { id: first.id, status: "loading" });
  audio[0].emit("playing");
  assert.deepEqual(states.at(-1), { id: first.id, status: "playing" });
  audio[0].emit("ended");
  assert.equal(states.at(-1), null);
  assert.ok(audio[0].paused && audio[0].cleared && audio[0].reloaded);
});

test("playing a second question stops the first and ignores its late play rejection", async () => {
  const { audio, states, player } = setup();
  player.play(first);
  player.play(second);
  assert.ok(audio[0].paused && audio[0].cleared);
  audio[0].emit("ended");
  audio[0].rejectPlay?.(new Error("First play interrupted"));
  await Promise.resolve();
  assert.deepEqual(states.at(-1), { id: second.id, status: "loading" });
  audio[1].emit("playing");
  assert.deepEqual(states.at(-1), { id: second.id, status: "playing" });
  player.stop();
  assert.ok(audio[1].paused);
  assert.equal(states.at(-1), null);
});

test("missing files and browser playback denial surface errors and allow retry", async () => {
  const { audio, states, player } = setup();
  player.play(first);
  audio[0].emit("error");
  assert.deepEqual(states.at(-1), { id: first.id, status: "error" });
  player.play(first);
  audio[1].rejectPlay?.(new Error("NotAllowedError"));
  await Promise.resolve();
  assert.deepEqual(states.at(-1), { id: first.id, status: "error" });
  player.play(first);
  audio[2].emit("playing");
  assert.deepEqual(states.at(-1), { id: first.id, status: "playing" });
});

test("leaving the topic releases audio and removes event listeners without state updates", async () => {
  const { audio, states, player } = setup();
  player.play(first);
  const count = states.length;
  player.dispose();
  assert.ok(audio[0].paused && audio[0].cleared && audio[0].reloaded);
  audio[0].emit("playing");
  audio[0].emit("error");
  audio[0].emit("ended");
  audio[0].rejectPlay?.(new Error("Unmounted"));
  await Promise.resolve();
  assert.equal(states.length, count);
});
