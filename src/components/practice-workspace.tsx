"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";
import { PracticeAudio } from "./practice-audio";
import { createClient } from "@/lib/supabase/client";
import { evidenceParts } from "@/lib/practice-grading";
import type {
  PracticeQuestionResult,
  PracticeResult,
} from "@/lib/practice-results";
import {
  AUTO_SAVE_MS,
  BAND_GROUPS,
  QUESTION_TYPES,
  applyHighlight,
  passageSegmentsWithEvidence,
  draftKey,
  newDraft,
  restoreDraft,
  type Draft,
  type Exercise,
  type Highlight,
  type PracticeContext,
} from "@/lib/practice";

type Loaded = {
  exercise: Exercise;
  context: PracticeContext;
  offline: boolean;
};

function EvidenceText({ text, evidence }: { text: string; evidence: string }) {
  const parts = evidenceParts(text, evidence);
  if (!parts) return text;
  return (
    <>
      {parts.before}
      <mark className="answer-evidence">{parts.match}</mark>
      {parts.after}
    </>
  );
}

function SegmentReplayButton({
  source,
  start,
  end,
}: {
  source: string;
  start: number;
  end: number;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [],
  );
  function replay() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    audio.current?.pause();
    const player = new Audio(source);
    audio.current = player;
    const beginSegment = () => {
      player.currentTime = start;
      void player.play().catch(() => setPlaying(false));
    };
    player.ontimeupdate = () => {
      if (player.currentTime >= end) {
        player.pause();
        setPlaying(false);
      }
    };
    player.onended = () => setPlaying(false);
    player.onerror = () => setPlaying(false);
    setPlaying(true);
    if (player.readyState >= HTMLMediaElement.HAVE_METADATA) beginSegment();
    else player.onloadedmetadata = beginSegment;
  }
  return (
    <button type="button" className="secondary-button" onClick={replay}>
      <Icon name={playing ? "pause" : "play"} size={15} />
      {playing ? "Đang phát đoạn đáp án" : "Phát lại đoạn chứa đáp án"}
    </button>
  );
}
export function PracticeWorkspace({ slug }: { slug: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const { data: subscription } = createClient().auth.onAuthStateChange(
      (event) => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "USER_UPDATED"
        ) {
          setData(null);
          setError("");
          setRetry((value) => value + 1);
        }
      },
    );
    return () => subscription.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(
          `/api/practice/${encodeURIComponent(slug)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        const body = await response.json();
        if (!response.ok) {
          if (response.status >= 500)
            throw new Error("ExerciseServiceUnavailable");
          setError(body.error);
          return;
        }
        if (controller.signal.aborted) return;
        try {
          localStorage.setItem(
            `aaa:exercise:v1:${slug}`,
            JSON.stringify(body.exercise),
          );
        } catch {
          /* Workspace surfaces draft storage errors separately. */
        }
        setData({ ...body, offline: false });
        setError("");
      } catch {
        if (controller.signal.aborted) return;
        try {
          const raw = localStorage.getItem(`aaa:exercise:v1:${slug}`);
          const exercise = raw ? (JSON.parse(raw) as Exercise) : null;
          if (
            !exercise ||
            exercise.slug !== slug ||
            !Array.isArray(exercise.questions) ||
            !Number.isInteger(exercise.content_version)
          )
            throw new Error("NoCachedExercise");
          // Only the current local session partitions drafts. Cached public content
          // never carries a previous learner's identity into another session.
          const { data: session } = await createClient().auth.getSession();
          if (!controller.signal.aborted)
            setData({
              exercise,
              context: {
                userId: session.session?.user.id ?? null,
                currentBand: null,
                bandSource: null,
              },
              offline: true,
            });
        } catch {
          setError(
            "Chưa tải được bài luyện và chưa có bản lưu trên thiết bị. Kết nối mạng rồi thử lại.",
          );
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [slug, retry]);
  return (
    <AppShell active="practice">
      {data ? (
        <PracticeSession
          key={`${data.context.userId}:${data.exercise.id}`}
          {...data}
        />
      ) : error ? (
        <div className="load-error" role="alert">
          <h1>Chưa thể mở bài luyện</h1>
          <p>{error}</p>
          <button
            className="primary-button"
            onClick={() => {
              setError("");
              setRetry((value) => value + 1);
            }}
          >
            Thử lại
          </button>
          <Link className="text-link" href="/practice">
            Về kho bài luyện
          </Link>
        </div>
      ) : (
        <div className="loading-card" role="status">
          <span className="spinner" />
          Đang chuẩn bị bài luyện…
        </div>
      )}
    </AppShell>
  );
}

export function PracticeSession({ exercise, context, offline }: Loaded) {
  const key = draftKey(context.userId, exercise.id);
  const [initial] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      const restored = restoreDraft(raw, exercise);
      return {
        draft: restored ?? newDraft(exercise.content_version),
        restored: !!restored,
        error:
          raw && !restored
            ? "Bản lưu cũ không còn tương thích với nội dung bài; đã mở bài mới."
            : "",
      };
    } catch {
      return {
        draft: newDraft(exercise.content_version),
        restored: false,
        error:
          "Trình duyệt đang chặn lưu trữ. Câu trả lời chỉ được giữ trong phiên này.",
      };
    }
  });
  const [draft, setDraft] = useState<Draft>(initial.draft);
  const current = useRef(draft);
  const [storageError, setStorageError] = useState(initial.error);
  const [savedAt, setSavedAt] = useState(
    initial.restored ? initial.draft.updatedAt : "",
  );
  const [online, setOnline] = useState(!offline);
  const [selection, setSelection] = useState<Omit<
    Highlight,
    "color" | "note"
  > | null>(null);
  const [selectedMark, setSelectedMark] = useState<string | null>(null);
  const [selectionInfo, setSelectionInfo] = useState("");
  const passage = useRef<HTMLDivElement>(null);
  const paragraphRefs = useRef(new Map<number, HTMLParagraphElement>());
  const transcriptRef = useRef<HTMLElement>(null);
  const submissionId = useRef("");
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [reviewQuestionId, setReviewQuestionId] = useState<string | null>(null);
  const answered = exercise.questions.filter((question) =>
    draft.answers[question.id]?.trim(),
  ).length;
  const resultByQuestion = new Map(
    result?.questions.map((item) => [item.questionId, item]) ?? [],
  );
  const reviewedQuestion = result?.questions.find(
    (item) => item.questionId === reviewQuestionId,
  );

  const persist = useCallback(
    (value: Draft) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        setStorageError("");
        setSavedAt(value.updatedAt);
      } catch {
        setStorageError(
          "Không lưu được trên thiết bị. Kiểm tra quyền lưu trữ; hãy giữ trang này mở để không mất bài.",
        );
      }
    },
    [key],
  );
  function update(patch: Partial<Draft>, immediate = true) {
    const value = {
      ...current.current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    current.current = value;
    setDraft(value);
    // Persist answer/annotation edits immediately for crashes between 15s ticks.
    // Audio time is checkpointed every 15s and on visibility/pagehide instead.
    if (immediate) persist(value);
  }

  function updateAnswer(questionId: string, answer: string) {
    update({
      answers: { ...current.current.answers, [questionId]: answer },
    });
    setResult(null);
    setReviewQuestionId(null);
    setSubmitError("");
    submissionId.current = crypto.randomUUID();
  }

  async function submitAnswers() {
    if (submitting) return;
    if (!context.userId) {
      setSubmitError("Bạn cần đăng nhập để nộp bài và xem kết quả riêng tư.");
      return;
    }
    if (!online) {
      setSubmitError("Hãy kết nối mạng trước khi nộp bài. Bản nháp vẫn được giữ trên thiết bị.");
      return;
    }
    persist(current.current);
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch(
        `/api/practice/${encodeURIComponent(exercise.slug)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId:
              submissionId.current || (submissionId.current = crypto.randomUUID()),
            answers: current.current.answers,
          }),
        },
      );
      const body = (await response.json()) as PracticeResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Chưa thể chấm bài.");
      setResult(body);
      const firstReview =
        body.questions.find((item) => item.unanswered || !item.correct) ??
        body.questions[0];
      setReviewQuestionId(firstReview?.questionId ?? null);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Chưa thể chấm bài. Hãy thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function showExplanation(item: PracticeQuestionResult) {
    setReviewQuestionId(item.questionId);
    window.requestAnimationFrame(() => {
      if (exercise.skill === "reading" && item.evidenceParagraph !== null)
        paragraphRefs.current.get(item.evidenceParagraph)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      else
        transcriptRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
  useEffect(() => {
    const timer = window.setInterval(
      () => persist(current.current),
      AUTO_SAVE_MS,
    );
    const flush = () => persist(current.current);
    const hidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const connected = () => setOnline(true);
    const disconnected = () => {
      setOnline(false);
      flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("online", connected);
    window.addEventListener("offline", disconnected);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("online", connected);
      window.removeEventListener("offline", disconnected);
      flush();
    };
  }, [persist]);

  const captureSelection = useCallback(() => {
    const selected = window.getSelection();
    if (
      !selected ||
      selected.isCollapsed ||
      !selected.rangeCount ||
      !passage.current
    )
      return;
    const range = selected.getRangeAt(0);
    const startElement =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range.startContainer as Element);
    const endElement =
      range.endContainer.nodeType === Node.TEXT_NODE
        ? range.endContainer.parentElement
        : (range.endContainer as Element);
    const startParagraph =
      startElement?.closest<HTMLElement>("[data-paragraph]");
    const endParagraph = endElement?.closest<HTMLElement>("[data-paragraph]");
    if (!startParagraph || !passage.current.contains(startParagraph)) return;
    if (startParagraph !== endParagraph) {
      setSelection(null);
      setSelectionInfo(
        "Hãy chọn văn bản trong một đoạn để highlight hoặc ghi chú.",
      );
      return;
    }
    const before = document.createRange();
    before.selectNodeContents(startParagraph);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const paragraph = Number(startParagraph.dataset.paragraph);
    setSelection({
      id: crypto.randomUUID(),
      paragraph,
      start,
      end: start + range.toString().length,
    });
    setSelectedMark(null);
    setSelectionInfo(
      `Đã chọn ${range.toString().length} ký tự trong đoạn ${String.fromCharCode(65 + paragraph)}.`,
    );
  }, []);

  useEffect(() => {
    document.addEventListener("selectionchange", captureSelection);
    return () =>
      document.removeEventListener("selectionchange", captureSelection);
  }, [captureSelection]);

  function annotate(color: Highlight["color"] | null) {
    if (selection)
      update({
        highlights: applyHighlight(
          current.current.highlights,
          selection,
          color,
        ),
      });
    else if (selectedMark)
      update({
        highlights: color
          ? current.current.highlights.map((item) =>
              item.id === selectedMark ? { ...item, color } : item,
            )
          : current.current.highlights.filter(
              (item) => item.id !== selectedMark,
            ),
      });
    setSelection(null);
    if (!color) setSelectedMark(null);
    window.getSelection()?.removeAllRanges();
  }
  function noteSelection() {
    if (!selection) return;
    const next = applyHighlight(
      current.current.highlights,
      selection,
      "yellow",
    );
    update({ highlights: next });
    setSelectedMark(selection.id);
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }
  const activeMark = draft.highlights.find((item) => item.id === selectedMark);
  return (
    <>
      <div className="breadcrumb">
        <Link href="/practice">Kho bài luyện</Link>
        <Icon name="chevron" size={12} />
        <span>{exercise.skill === "reading" ? "Reading" : "Listening"}</span>
      </div>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            <span />
            LUYỆN TẬP THEO NHỊP CỦA BẠN
          </span>
          <h1>{exercise.title}</h1>
          <div className="exercise-meta">
            <span>
              Band{" "}
              {
                BAND_GROUPS.find((group) => group.value === exercise.band_group)
                  ?.label
              }
            </span>
            <span>
              <Icon name="clock" size={15} />
              {exercise.duration_minutes} phút
            </span>
            <span>{exercise.question_count} câu hỏi</span>
          </div>
        </div>
        <Link className="secondary-button" href="/practice">
          ← Kho bài luyện
        </Link>
      </div>
      <div className="practice-session-bar">
        <span>
          <Icon name={online ? "shield" : "info"} size={16} />
          {!online
            ? "Đang ngoại tuyến · Bài làm lưu trên thiết bị"
            : context.userId
              ? "Bản nháp riêng của tài khoản này"
              : "Chế độ khách · Bản nháp lưu trên thiết bị"}
        </span>
        <span role="status">
          {storageError
            ? "Lưu trữ cần chú ý"
            : savedAt
              ? "Đã lưu trên thiết bị"
              : "Tự lưu mỗi 15 giây"}
        </span>
      </div>
      {exercise.source_url && (
        <p className="workspace-source">
          Nội dung nguồn: {exercise.source_attribution ?? exercise.source_title} · {exercise.source_license}
          {" · "}
          <a href={exercise.source_url} target="_blank" rel="noreferrer">
            Xem bài gốc
          </a>
        </p>
      )}
      {initial.restored && (
        <p className="restore-message" role="status">
          <Icon name="check" size={16} />
          Đã khôi phục câu trả lời, ghi chú và vị trí nghe từ bản lưu trên thiết
          bị.
        </p>
      )}
      {storageError && (
        <div className="error-box" role="alert">
          <p>{storageError}</p>
          <button
            className="secondary-button"
            onClick={() => persist(current.current)}
          >
            Thử lưu lại
          </button>
        </div>
      )}
      <div className={`practice-split ${exercise.skill}`}>
        <section
          className="practice-resource"
          aria-label={exercise.skill === "reading" ? "Bài đọc" : "Bài nghe"}
        >
          {exercise.skill === "reading" ? (
            <>
              <div
                className="passage-toolbar"
                role="toolbar"
                aria-label="Công cụ highlight"
              >
                <span>
                  <Icon name="pen" size={18} />
                  Chọn văn bản
                </span>
                <button
                  className="highlight-yellow"
                  disabled={!selection && !selectedMark}
                  aria-label="Highlight vàng"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => annotate("yellow")}
                >
                  Vàng
                </button>
                <button
                  className="highlight-green"
                  disabled={!selection && !selectedMark}
                  aria-label="Highlight xanh"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => annotate("green")}
                >
                  Xanh
                </button>
                <button
                  disabled={!selection && !selectedMark}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => annotate(null)}
                >
                  Bỏ highlight
                </button>
                <button
                  disabled={!selection}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={noteSelection}
                >
                  + Ghi chú
                </button>
              </div>
              <p className="selection-help" aria-live="polite">
                {selectionInfo ||
                  "Bôi đen một đoạn văn bản, sau đó chọn màu hoặc thêm ghi chú. Có thể dùng Shift + phím mũi tên."}
              </p>
              <div
                className="reading-passage"
                lang="en"
                ref={passage}
                onMouseUp={captureSelection}
                onTouchEnd={captureSelection}
                onKeyUp={captureSelection}
              >
                <h2>{exercise.title}</h2>
                {exercise.passage?.map((text, paragraph) => (
                  <p
                    key={paragraph}
                    ref={(node) => {
                      if (node) paragraphRefs.current.set(paragraph, node);
                      else paragraphRefs.current.delete(paragraph);
                    }}
                    data-paragraph={paragraph}
                    tabIndex={0}
                    className={
                      reviewedQuestion?.evidenceParagraph === paragraph
                        ? "answer-paragraph"
                        : ""
                    }
                  >
                    {passageSegmentsWithEvidence(
                      text,
                      paragraph,
                      draft.highlights,
                      reviewedQuestion?.evidenceParagraph === paragraph
                        ? reviewedQuestion.evidenceText
                        : undefined,
                    ).map(
                      (segment, index) =>
                        segment.highlight ? (
                          <mark
                            key={index}
                            tabIndex={0}
                            role="button"
                            aria-label={`Highlight ${segment.highlight.color === "yellow" ? "vàng" : "xanh"}${segment.highlight.note ? ": " + segment.highlight.note : ""}. Nhấn để chỉnh sửa.`}
                            className={`mark-${segment.highlight.color} ${segment.evidence ? "answer-evidence" : ""} ${selectedMark === segment.highlight.id ? "mark-active" : ""}`}
                            onClick={() => {
                              if (!window.getSelection()?.isCollapsed) return;
                              setSelectedMark(segment.highlight!.id);
                              setSelection(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setSelectedMark(segment.highlight!.id);
                                setSelection(null);
                              }
                            }}
                          >
                            {segment.text}
                          </mark>
                        ) : segment.evidence ? (
                          <mark key={index} className="answer-evidence">
                            {segment.text}
                          </mark>
                        ) : (
                          <span key={index}>{segment.text}</span>
                        ),
                    )}
                  </p>
                ))}
              </div>
              {activeMark && (
                <section className="annotation-editor">
                  <label htmlFor="annotation-note">
                    Ghi chú cho đoạn đã chọn
                  </label>
                  <blockquote>
                    {exercise.passage?.[activeMark.paragraph].slice(
                      activeMark.start,
                      activeMark.end,
                    )}
                  </blockquote>
                  <textarea
                    id="annotation-note"
                    rows={3}
                    maxLength={2000}
                    value={activeMark.note}
                    onChange={(event) =>
                      update({
                        highlights: current.current.highlights.map((item) =>
                          item.id === activeMark.id
                            ? { ...item, note: event.target.value }
                            : item,
                        ),
                      })
                    }
                    placeholder="Ý chính, từ mới, điều cần lưu ý…"
                  />
                  <button
                    className="text-link"
                    onClick={() => setSelectedMark(null)}
                  >
                    Đóng ghi chú
                  </button>
                </section>
              )}
            </>
          ) : (
            <>
              <PracticeAudio
                source={exercise.audio_path!}
                title={exercise.title}
                initialTime={initial.draft.audioTime}
                speed={draft.speed}
                onPosition={(audioTime) => update({ audioTime }, false)}
                onSpeed={(speed) => update({ speed })}
              />
              <div className="listening-guide">
                <h3>Nghe chủ động, tiến bộ từng chút.</h3>
                <p>
                  Đọc câu hỏi trước khi nghe. Dùng các nút ±5/10 giây để trở lại
                  đoạn quan trọng và điều chỉnh tốc độ khi cần.
                </p>
                <p>
                  Audio cần kết nối mạng hoặc có sẵn trong cache trình duyệt.
                  Câu trả lời vẫn được lưu nếu audio mất kết nối.
                </p>
              </div>
              {result?.transcript && (
                <section
                  ref={transcriptRef}
                  className="answer-transcript"
                  aria-label="Audio transcript"
                >
                  <div>
                    <Icon name="fileText" size={18} />
                    <h3>Audio transcript</h3>
                  </div>
                  <p lang="en">
                    {reviewedQuestion ? (
                      <EvidenceText
                        text={result.transcript}
                        evidence={reviewedQuestion.evidenceText}
                      />
                    ) : (
                      result.transcript
                    )}
                  </p>
                  {reviewedQuestion?.audioStartSeconds !== null &&
                    reviewedQuestion?.audioStartSeconds !== undefined &&
                    reviewedQuestion.audioEndSeconds !== null && (
                      <SegmentReplayButton
                        source={exercise.audio_path!}
                        start={reviewedQuestion.audioStartSeconds}
                        end={reviewedQuestion.audioEndSeconds}
                      />
                    )}
                </section>
              )}
            </>
          )}
          <section className="practice-notes">
            <label htmlFor="practice-notes">
              <Icon name="pen" size={17} />
              Sổ ghi chú của bạn
            </label>
            <textarea
              id="practice-notes"
              rows={4}
              maxLength={10000}
              value={draft.notes}
              onChange={(event) => update({ notes: event.target.value })}
              placeholder="Ghi lại từ mới, ý chính và điều bạn muốn luyện thêm…"
            />
            <small>
              Ghi chú tự lưu trên thiết bị · {draft.notes.length}/10000 ký tự
            </small>
          </section>
        </section>
        <section className="practice-questions" aria-label="Câu hỏi bài luyện">
          <div className="questions-heading">
            <div>
              <h2>Câu hỏi</h2>
              <p>Điền câu trả lời theo hướng dẫn từng câu.</p>
            </div>
            <span>
              {answered}/{exercise.question_count}
            </span>
          </div>
          <div
            className="answer-progress"
            role="progressbar"
            aria-label="Số câu đã trả lời"
            aria-valuemin={0}
            aria-valuemax={exercise.question_count}
            aria-valuenow={answered}
          >
            <span
              style={{
                width: `${(answered / exercise.question_count) * 100}%`,
              }}
            />
          </div>
          {result && (
            <section className="practice-result-summary" aria-label="Kết quả bài luyện">
              <div
                className="score-ring"
                style={{
                  background: `conic-gradient(#2166c2 ${result.percentage}%, #e7edf6 0)`,
                }}
                aria-label={`${result.percentage}%`}
              >
                <span>{result.percentage}%</span>
              </div>
              <div className="score-details">
                <h3>
                  {result.correctCount}/{result.totalQuestions} câu đúng
                </h3>
                <ul>
                  <li className="correct">Đúng: {result.correctCount}</li>
                  <li className="incorrect">Sai: {result.incorrectCount}</li>
                  <li>Chưa trả lời: {result.unansweredCount}</li>
                </ul>
                <p>
                  {result.estimatedBand === null
                    ? result.bandMessage
                    : `Estimated band: ${result.estimatedBand.toFixed(1)}`}
                </p>
                {result.processingMs !== undefined && (
                  <small>
                    Server grading: {result.processingMs.toFixed(0)} ms
                    {result.processingMs <= 500 ? " · đạt mục tiêu <500 ms" : ""}
                  </small>
                )}
              </div>
            </section>
          )}
          <div className="question-jump" aria-label="Đi đến câu hỏi">
            {exercise.questions.map((question) => (
              <a
                key={question.id}
                href={`#question-${question.id}`}
                onClick={(event) => {
                  const questionResult = resultByQuestion.get(question.id);
                  // On the review screen, question navigation is also passage
                  // navigation: selecting a result takes the learner straight
                  // to the evidence and opens its explanation.
                  if (!questionResult) return;
                  event.preventDefault();
                  showExplanation(questionResult);
                }}
                className={
                  resultByQuestion.get(question.id)
                    ? resultByQuestion.get(question.id)!.correct
                      ? "result-correct"
                      : "result-incorrect"
                    : draft.answers[question.id]?.trim()
                      ? "answered"
                      : ""
                }
                aria-label={`Câu ${question.position}${draft.answers[question.id]?.trim() ? ", đã điền" : ""}`}
              >
                {question.position}
              </a>
            ))}
          </div>
          <div className="question-list" lang="en">
            {exercise.questions.map((question) => {
              const questionResult = resultByQuestion.get(question.id);
              return (
              <fieldset
                key={question.id}
                id={`question-${question.id}`}
                className={`practice-question ${
                  questionResult
                    ? questionResult.correct
                      ? "question-correct"
                      : "question-incorrect"
                    : ""
                }`}
              >
                <legend>
                  <span>{question.position}</span>
                  {QUESTION_TYPES[question.type]}
                </legend>
                <p className="question-instruction">{question.instruction}</p>
                <p className="question-prompt">{question.prompt}</p>
                {question.type === "gap_fill" ? (
                  <>
                    <label
                      className="sr-only"
                      htmlFor={`answer-${question.id}`}
                    >
                      Answer to question {question.position}
                    </label>
                    <input
                      id={`answer-${question.id}`}
                      type="text"
                      autoComplete="off"
                      maxLength={500}
                      value={draft.answers[question.id] ?? ""}
                      placeholder="Type your answer…"
                      onChange={(event) =>
                        updateAnswer(question.id, event.target.value)
                      }
                    />
                  </>
                ) : (
                  <div className="answer-options">
                    {question.options.map((option, index) => (
                      <label
                        className={
                          draft.answers[question.id] === option
                            ? "selected"
                            : ""
                        }
                        key={option}
                      >
                        <input
                          name={question.id}
                          type="radio"
                          value={option}
                          checked={draft.answers[question.id] === option}
                          onChange={() => updateAnswer(question.id, option)}
                        />
                        <span>
                          {question.type !== "true_false_not_given" && (
                            <b>{String.fromCharCode(65 + index)}.</b>
                          )}{" "}
                          {option}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {questionResult && (
                  <div
                    className={`question-result ${
                      questionResult.correct ? "correct" : "incorrect"
                    }`}
                    role="status"
                  >
                    <strong>
                      {questionResult.correct
                        ? "Đúng"
                        : questionResult.unanswered
                          ? "Chưa trả lời"
                          : "Sai"}
                    </strong>
                    {!questionResult.correct && (
                      <p>
                        Đáp án đúng: <b>{questionResult.correctAnswer}</b>
                      </p>
                    )}
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => showExplanation(questionResult)}
                    >
                      Xem giải thích
                    </button>
                    {reviewQuestionId === question.id && (
                      <p className="question-explanation">
                        {questionResult.explanation}
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
              );
            })}
          </div>
          <div className="practice-finish">
            <button
              className="primary-button"
              disabled={submitting}
              onClick={submitAnswers}
            >
              <Icon name="check" size={18} />
              {submitting ? "Đang chấm bài…" : result ? "Nộp lại bài" : "Nộp bài"}
            </button>
            {submitError && (
              <p className="field-error" role="alert">
                {submitError}
              </p>
            )}
            <p>
              Bạn đã điền {answered}/{exercise.question_count} câu. Bạn có thể
              để trống câu chưa chắc chắn; hệ thống sẽ đánh dấu là chưa trả lời.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
