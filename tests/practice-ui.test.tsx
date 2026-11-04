import test, { after } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import {
  PracticeSession,
  PracticeWorkspace,
} from "../src/components/practice-workspace";
import { PracticeAudio } from "../src/components/practice-audio";
import { createClient } from "../src/lib/supabase/client";
import { draftKey, type Exercise } from "../src/lib/practice";

process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:54321";
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-only-key";
const dom = new JSDOM(
  "<!doctype html><html><body><div id='root'></div></body></html>",
  { url: "http://localhost:3000" },
);
Object.assign(globalThis, {
  BroadcastChannel: undefined,
  self: dom.window,
  window: dom.window,
  document: dom.window.document,
  Node: dom.window.Node,
  HTMLElement: dom.window.HTMLElement,
  localStorage: dom.window.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", {
  value: dom.window.navigator,
  configurable: true,
});
const container = document.getElementById("root")!;
after(async () => {
  await createClient().auth.stopAutoRefresh();
  dom.window.close();
});
const context = {
  userId: "learner-a",
  currentBand: 6,
  bandSource: "self_reported" as const,
};
const exercise: Exercise = {
  id: "e1",
  slug: "test",
  title: "Test passage",
  summary: "",
  skill: "reading",
  band_group: "5_6",
  question_types: ["multiple_choice"],
  duration_minutes: 10,
  question_count: 1,
  source_title: null,
  source_url: null,
  source_license: null,
  source_attribution: null,
  passage: ["A. A short garden passage for careful reading."],
  audio_path: null,
  audio_bytes: null,
  audio_mime: null,
  content_version: 1,
  questions: [
    {
      id: "q1",
      position: 1,
      type: "multiple_choice",
      instruction: "Choose one",
      prompt: "What is the topic?",
      options: ["Gardens", "Transport"],
    },
  ],
};
function button(text: string) {
  return [...container.querySelectorAll("button")].find((item) =>
    item.textContent?.includes(text),
  )!;
}

test("draft storage failure preserves the selected answer and reports a recoverable error", async (t) => {
  const root = createRoot(container);
  t.after(async () => {
    await act(async () => root.unmount());
  });
  await act(async () =>
    root.render(
      <PracticeSession
        exercise={exercise}
        context={{ ...context, userId: "storage-failure-user" }}
        offline={false}
      />,
    ),
  );
  const storage = t.mock.method(dom.window.Storage.prototype, "setItem", () => {
    throw new Error("QuotaExceeded");
  });
  await click(container.querySelector("input[value='Transport']")!);
  assert.ok(
    container.querySelector<HTMLInputElement>("input[value='Transport']")!
      .checked,
  );
  assert.match(container.textContent!, /Không lưu được trên thiết bị/);
  storage.mock.restore();
  await click(button("Thử lưu lại"));
  assert.equal(
    JSON.parse(localStorage.getItem(draftKey("storage-failure-user", "e1"))!)
      .answers.q1,
    "Transport",
  );
});

test("offline page reload uses cached public content and the guest's own saved answers", async (t) => {
  const root = createRoot(container);
  t.after(async () => {
    await act(async () => root.unmount());
  });
  localStorage.setItem("aaa:exercise:v1:test", JSON.stringify(exercise));
  localStorage.setItem(
    draftKey(null, "e1"),
    JSON.stringify({
      version: 1,
      contentVersion: 1,
      answers: { q1: "Gardens" },
      highlights: [],
      notes: "Offline notes",
      audioTime: 0,
      speed: 1,
      updatedAt: new Date().toISOString(),
    }),
  );
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ error: "Database unavailable" }, { status: 503 }),
  );
  await act(async () => {
    root.render(<PracticeWorkspace slug="test" />);
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  assert.ok(
    container.querySelector<HTMLInputElement>("input[value='Gardens']")
      ?.checked,
  );
  assert.match(container.textContent!, /Đang ngoại tuyến/);
  assert.equal(
    container.querySelector<HTMLTextAreaElement>("#practice-notes")?.value,
    "Offline notes",
  );
});
async function click(element: Element) {
  await act(async () => {
    element.dispatchEvent(
      new dom.window.MouseEvent("click", { bubbles: true }),
    );
  });
}
async function select(start: number, end: number) {
  const paragraph = container.querySelector("[data-paragraph='0']")!;
  const walker = document.createTreeWalker(
    paragraph,
    dom.window.NodeFilter.SHOW_TEXT,
  );
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode())
    nodes.push(node as Text);
  const range = document.createRange();
  let cursor = 0;
  for (const node of nodes) {
    const limit = cursor + node.textContent!.length;
    if (start >= cursor && start < limit) range.setStart(node, start - cursor);
    if (end > cursor && end <= limit) {
      range.setEnd(node, end - cursor);
      break;
    }
    cursor = limit;
  }
  dom.window.getSelection()!.removeAllRanges();
  dom.window.getSelection()!.addRange(range);
  await act(async () => {
    paragraph.dispatchEvent(
      new dom.window.MouseEvent("mouseup", { bubbles: true }),
    );
  });
}

test("Reading UI selects, colours, removes and restores highlights and answers", async (t) => {
  let root = createRoot(container);
  t.after(async () => {
    await act(async () => root.unmount());
  });
  await act(async () =>
    root.render(
      <PracticeSession exercise={exercise} context={context} offline={false} />,
    ),
  );
  await select(5, 10);
  await click(button("Vàng"));
  assert.equal(
    container.querySelector("mark.mark-yellow")?.textContent,
    "short",
  );
  await click(container.querySelector("mark")!);
  await click(button("Xanh"));
  assert.ok(container.querySelector("mark.mark-green"));
  await click(container.querySelector("mark")!);
  await click(button("Bỏ highlight"));
  assert.equal(container.querySelectorAll("mark").length, 0);
  await select(5, 10);
  await click(button("Ghi chú"));
  assert.ok(container.querySelector("#annotation-note"));
  const radio = container.querySelector<HTMLInputElement>(
    "input[value='Gardens']",
  )!;
  await click(radio);
  assert.ok(
    JSON.parse(localStorage.getItem(draftKey("learner-a", "e1"))!).answers
      .q1 === "Gardens",
  );
  await act(async () => root.unmount());
  root = createRoot(container);
  await act(async () =>
    root.render(
      <PracticeSession exercise={exercise} context={context} offline={true} />,
    ),
  );
  assert.ok(
    container.querySelector<HTMLInputElement>("input[value='Gardens']")!
      .checked,
  );
  assert.equal(container.querySelector("mark")?.textContent, "short");
  assert.match(container.textContent!, /Đã khôi phục/);
  await act(async () => root.unmount());
});

test("Listening UI applies all four playback rates, skip bounds and seeking", async () => {
  const root = createRoot(container);
  let position = 0;
  let speed = 1;
  async function render() {
    await act(async () =>
      root.render(
        <PracticeAudio
          source="/audio/test.mp3"
          title="Test"
          initialTime={0}
          speed={speed}
          onPosition={(value) => (position = value)}
          onSpeed={(value) => (speed = value)}
        />,
      ),
    );
  }
  await render();
  const audio = container.querySelector("audio")!;
  Object.defineProperty(audio, "duration", { value: 100, configurable: true });
  await act(async () =>
    audio.dispatchEvent(new dom.window.Event("loadedmetadata")),
  );
  for (const rate of [0.8, 1, 1.25, 1.5]) {
    await click(button(`${rate === 1 ? "1.0" : rate}×`));
    await render();
    assert.equal(audio.playbackRate, rate);
  }
  await click(container.querySelector("button[aria-label='Tiến 10 giây']")!);
  assert.equal(audio.currentTime, 10);
  assert.equal(position, 10);
  await click(container.querySelector("button[aria-label='Lùi 5 giây']")!);
  assert.equal(audio.currentTime, 5);
  await click(container.querySelector("button[aria-label='Lùi 10 giây']")!);
  assert.equal(audio.currentTime, 0);
  Object.defineProperty(audio, "play", {
    value: async () => audio.dispatchEvent(new dom.window.Event("play")),
    configurable: true,
  });
  Object.defineProperty(audio, "pause", {
    value: () => audio.dispatchEvent(new dom.window.Event("pause")),
    configurable: true,
  });
  Object.defineProperty(audio, "paused", {
    get: () => !container.querySelector("button[aria-label='Tạm dừng audio']"),
    configurable: true,
  });
  await click(container.querySelector("button[aria-label='Phát audio']")!);
  assert.ok(container.querySelector("button[aria-label='Tạm dừng audio']"));
  await click(container.querySelector("button[aria-label='Tạm dừng audio']")!);
  assert.ok(container.querySelector("button[aria-label='Phát audio']"));
  await act(async () => root.unmount());
});
