"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  findOriginalPracticeTest,
  type OriginalPracticeTest,
} from "@/data/original-practice-tests";
import {
  evidenceParts,
  gradePracticeAnswer,
  type GradeResult,
} from "@/lib/practice-grading";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";
import { notifyStudyUpdate } from "@/features/dashboard/notify";

function responseKey(test: OriginalPracticeTest, userId: string) {
  return `aaa:original-practice:v1:${userId}:${test.slug}`;
}

function EvidenceText({
  source,
  evidence,
  evidenceRef,
}: {
  source: string;
  evidence: string;
  evidenceRef: RefObject<HTMLElement | null>;
}) {
  const parts = evidenceParts(source, evidence);
  if (!parts) return source;
  return (
    <>
      {parts.before}
      <mark ref={evidenceRef} className="answer-evidence" tabIndex={-1}>
        {parts.match}
      </mark>
      {parts.after}
    </>
  );
}

export function OriginalPracticeTestPage({ slug, userId }: { slug: string; userId: string }) {
  const test = findOriginalPracticeTest(slug);
  const [answer, setAnswer] = useState(() =>
    typeof window !== "undefined" && test
      ? (localStorage.getItem(responseKey(test, userId)) ?? "")
      : "",
  );
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [answerError, setAnswerError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string | null>(null);
  const [audioDurationSeconds, setAudioDurationSeconds] = useState<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingElapsed, setRecordingElapsed] = useState(0);
  const [microphoneError, setMicrophoneError] = useState("");
  const evidenceRef = useRef<HTMLElement>(null);
  const questionRef = useRef<HTMLFieldSetElement>(null);
  const changedSinceLoad = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<number | null>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => {
    const currentTest = test;
    const testSlug: string = currentTest?.slug ?? "";
    if (testSlug.length === 0) return;
    let cancelled = false;
    async function restoreSavedWork() {
      try {
        const response = await fetch(`/api/practice/original/${encodeURIComponent(testSlug)}/save`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          response?: string;
          audioBase64?: string | null;
          audioMimeType?: string | null;
          audioDurationSeconds?: number | null;
          savedAt?: string | null;
        };
        if (!cancelled && response.ok && !changedSinceLoad.current) {
          if (payload.response) setAnswer(payload.response);
          if (payload.audioBase64 && payload.audioMimeType) {
            setAudioBase64(payload.audioBase64);
            setAudioMimeType(payload.audioMimeType);
            setAudioDurationSeconds(payload.audioDurationSeconds ?? null);
            setAudioUrl(`data:${payload.audioMimeType};base64,${payload.audioBase64}`);
          }
          setSaved(Boolean(payload.savedAt));
        }
      } catch {
        // Keep the device copy available when the learner is temporarily offline.
      }
    }
    void restoreSavedWork();
    return () => { cancelled = true; };
  }, [test]);
  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }, []);
  useEffect(() => {
    if (!grade) return;
    const frame = window.requestAnimationFrame(() => {
      evidenceRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      evidenceRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [grade, slug]);

  if (!test) {
    return (
      <AppShell active="practice">
        <div className="load-error">
          <h1>Không tìm thấy bài luyện</h1>
          <Link className="text-link" href="/practice">
            Về kho bài luyện
          </Link>
        </div>
      </AppShell>
    );
  }

  const question = test.question;
  const isGradable = test.skill === "reading" || test.skill === "listening";
  const isListening = test.skill === "listening";
  const isWriting = test.skill === "writing";
  const isSpeaking = test.skill === "speaking";

  function updateAnswer(value: string) {
    changedSinceLoad.current = true;
    setAnswer(value);
    setGrade(null);
    setAnswerError("");
    setSaveError("");
    setSaved(false);
  }

  function speak() {
    if (listening) {
      window.speechSynthesis.cancel();
      setListening(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(test!.prompt);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onend = () => setListening(false);
    utterance.onerror = () => setListening(false);
    setListening(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setMicrophoneError("Trình duyệt này không hỗ trợ thu âm. Hãy dùng Chrome hoặc Edge phiên bản mới.");
      return;
    }
    try {
      setMicrophoneError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      recordingStreamRef.current = stream;
      const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      const startedAt = Date.now();
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        if (recordingTimerRef.current !== null) {
          window.clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        setIsRecording(false);
        const duration = Math.max(1, Math.min(120, Math.round((Date.now() - startedAt) / 1000)));
        const mimeType = recorder.mimeType || preferredMime || "audio/webm";
        const blob = new Blob(chunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = typeof reader.result === "string" ? reader.result : "";
          const base64 = dataUrl.replace(/^data:[^,]+,/, "");
          if (!base64) {
            setMicrophoneError("Không thể đọc tệp ghi âm. Hãy thử thu lại.");
            return;
          }
          if (audioUrl?.startsWith("blob:")) URL.revokeObjectURL(audioUrl);
          setAudioUrl(URL.createObjectURL(blob));
          setAudioBase64(base64);
          setAudioMimeType(mimeType);
          setAudioDurationSeconds(duration);
          setRecordingElapsed(duration);
          changedSinceLoad.current = true;
          setSaved(false);
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      setRecordingElapsed(0);
      setIsRecording(true);
      recorder.start();
      recordingTimerRef.current = window.setInterval(() => {
        const elapsed = Math.min(120, Math.floor((Date.now() - startedAt) / 1000));
        setRecordingElapsed(elapsed);
        if (elapsed >= 120) recorder.stop();
      }, 500);
    } catch (error) {
      setMicrophoneError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Bạn cần cho phép micro để thu âm câu trả lời."
          : "Không thể mở micro. Hãy kiểm tra thiết bị rồi thử lại.",
      );
    }
  }

  async function save(response = answer) {
    if (isSpeaking ? !audioBase64 : !response.trim()) {
      setSaveError(isSpeaking ? "Hãy thu âm câu trả lời trước khi lưu bài Speaking." : "Hãy nhập câu trả lời trước khi lưu bài.");
      return false;
    }
    setIsSaving(true);
    setSaveError("");
    try {
      const taskId = new URLSearchParams(window.location.search).get("task");
      const result = await fetch(`/api/practice/original/${encodeURIComponent(test!.slug)}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: isSpeaking ? "" : response,
          taskId,
          audioBase64: isSpeaking ? audioBase64 : undefined,
          audioMimeType: isSpeaking ? audioMimeType : undefined,
          audioDurationSeconds: isSpeaking ? audioDurationSeconds : undefined,
        }),
      });
      const payload = (await result.json().catch(() => ({}))) as { error?: string };
      if (!result.ok) throw new Error(payload.error ?? "Không thể lưu bài vào tài khoản.");
      localStorage.setItem(responseKey(test!, userId), response);
      setSaved(true);
      notifyStudyUpdate();
      window.dispatchEvent(new CustomEvent("practice-completed", { detail: { resourceSlug: slug } }));
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Không thể lưu bài vào tài khoản.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function checkAnswer() {
    if (!question) return;

    // Chrome can restore a checked radio after a dev-server restart without
    // replaying its change event. Read the native field as a fallback so a
    // visibly selected option can always be graded.
    const restoredChoice = questionRef.current?.querySelector<HTMLInputElement>(
      'input[type="radio"]:checked',
    )?.value;
    const answerToGrade = answer.trim() || restoredChoice?.trim() || "";

    if (!answerToGrade) {
      setAnswerError("Hãy chọn hoặc nhập đáp án trước khi chấm bài.");
      return;
    }

    if (answerToGrade !== answer) setAnswer(answerToGrade);
    setAnswerError("");
    setGrade(gradePracticeAnswer(answerToGrade, question));
    await save(answerToGrade);
  }

  return (
    <AppShell active="practice">
      <div className="breadcrumb">
        <Link href="/practice">Kho bài luyện</Link>
        <Icon name="chevron" size={12} />
        <span>{test.skill}</span>
      </div>
      <div className="workspace-heading">
        <div>
          <span className="eyebrow">
            <span />
            BÀI TỰ SOẠN AAA
          </span>
          <h1>{test.title}</h1>
          <div className="exercise-meta">
            <span>{test.skill.toUpperCase()}</span>
            <span>
              <Icon name="clock" size={15} /> 10–15 phút
            </span>
          </div>
        </div>
        <Link className="secondary-button" href="/practice">
          ← Kho bài luyện
        </Link>
      </div>
      <div className="practice-session-bar">
        <span>
          <Icon name="shield" size={16} /> Bài làm được lưu trong tài khoản của bạn
        </span>
        <span role="status">{saved ? "Đã lưu" : "Chưa lưu"}</span>
      </div>
      {saveError && <p className="field-error mx-auto max-w-5xl" role="alert">{saveError}</p>}
      <div className={`practice-split ${test.skill}`}>
        <section className="practice-resource">
          <div className="reading-passage" lang="en">
            <h2>
              {isListening
                ? "Listen to the announcement"
                : isWriting
                  ? "Writing task"
                  : test.title}
            </h2>
            {isListening ? (
              <>
                <p>
                  Press play to hear the announcement. You can replay it as
                  needed, then submit your answer to reveal the transcript.
                </p>
                <button className="primary-button" onClick={speak}>
                  <Icon name={listening ? "pause" : "play"} size={18} />
                  {listening ? "Pause audio" : "Play audio"}
                </button>
              </>
            ) : (
              <p>
                {grade && question ? (
                  <EvidenceText
                    source={test.prompt}
                    evidence={question.evidence}
                    evidenceRef={evidenceRef}
                  />
                ) : (
                  test.prompt
                )}
              </p>
            )}
          </div>

          {isListening && grade && question && (
            <section className="answer-transcript" aria-label="Audio transcript">
              <div>
                <Icon name="fileText" size={18} />
                <h3>Audio transcript</h3>
              </div>
              <p lang="en">
                <EvidenceText
                  source={test.prompt}
                  evidence={question.evidence}
                  evidenceRef={evidenceRef}
                />
              </p>
              <small>Vị trí chứa đáp án được tô sáng sau khi chấm bài.</small>
            </section>
          )}

          {isSpeaking && (
            <section className="practice-notes">
              <label>
                <Icon name="headphones" size={17} /> Record your answer
              </label>
              <p>Press record, speak for up to two minutes, then stop and listen back before saving.</p>
              <div className="flex flex-wrap items-center gap-3">
                {isRecording ? (
                  <button type="button" className="secondary-button" onClick={stopRecording}>
                    <Icon name="pause" size={17} /> Stop recording ({recordingElapsed}s)
                  </button>
                ) : (
                  <button type="button" className="primary-button" onClick={() => void startRecording()}>
                    <Icon name="mic" size={17} /> {audioUrl ? "Record again" : "Start recording"}
                  </button>
                )}
                {audioDurationSeconds && !isRecording ? <small>{audioDurationSeconds}s recorded</small> : null}
              </div>
              {microphoneError ? <p className="field-error" role="alert">{microphoneError}</p> : null}
              {audioUrl ? <audio className="mt-4 w-full" controls preload="metadata" src={audioUrl}>Your browser does not support audio playback.</audio> : null}
            </section>
          )}
          {isWriting && (
            <section className="practice-notes">
              <label htmlFor="written-response">
                <Icon name="pen" size={17} /> Your writing
              </label>
              <textarea
                id="written-response"
                rows={14}
                maxLength={10000}
                value={answer}
                onChange={(event) => updateAnswer(event.target.value)}
                placeholder="Write your answer here…"
              />
              <small>
                {answer.trim() ? answer.trim().split(/\s+/).length : 0} words
              </small>
            </section>
          )}
        </section>

        <section className="practice-questions" aria-label="Câu trả lời">
          <div className="questions-heading">
            <div>
              <h2>{isGradable ? "Question" : "Your response"}</h2>
              <p>
                {isGradable
                  ? question?.prompt
                  : "Complete the task, then save your work."}
              </p>
            </div>
            {grade && <span>{grade.correct ? "1/1" : "0/1"}</span>}
          </div>

          {isGradable && question ? (
            <div className="question-list original-question-list" lang="en">
              <fieldset className="practice-question" ref={questionRef}>
                <legend>
                  <span>1</span>
                  {question.type === "multiple_choice"
                    ? "Multiple choice"
                    : "Gap fill"}
                </legend>
                <p className="question-prompt">{question.prompt}</p>
                {question.type === "multiple_choice" ? (
                  <div className="answer-options">
                    {question.options?.map((option) => (
                      <label
                        className={answer === option ? "selected" : ""}
                        key={option}
                      >
                        <input
                          type="radio"
                          name={question.id}
                          value={option}
                          checked={answer === option}
                          onChange={() => updateAnswer(option)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <>
                    <label className="sr-only" htmlFor={`answer-${question.id}`}>
                      Answer to question 1
                    </label>
                    <input
                      id={`answer-${question.id}`}
                      type="text"
                      autoComplete="off"
                      maxLength={500}
                      value={answer}
                      placeholder="Type your answer…"
                      onChange={(event) => updateAnswer(event.target.value)}
                    />
                  </>
                )}
              </fieldset>

              {answerError && (
                <p className="field-error" role="alert">
                  {answerError}
                </p>
              )}

              {grade && (
                <section
                  className={`grading-feedback ${grade.correct ? "correct" : "incorrect"}`}
                  aria-live="polite"
                  aria-label="Kết quả chấm bài"
                >
                  <div className="grading-title">
                    <Icon name={grade.correct ? "check" : "x"} size={20} />
                    <div>
                      <strong>{grade.correct ? "Correct" : "Not correct yet"}</strong>
                      <span>Score: {grade.correct ? "1/1" : "0/1"}</span>
                    </div>
                  </div>
                  <dl>
                    <div>
                      <dt>Correct answer</dt>
                      <dd>{grade.correctAnswer}</dd>
                    </div>
                    <div>
                      <dt>Explanation</dt>
                      <dd>{grade.explanation}</dd>
                    </div>
                  </dl>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      evidenceRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      })
                    }
                  >
                    Xem vị trí đáp án trong {isListening ? "transcript" : "bài đọc"}
                  </button>
                </section>
              )}
            </div>
          ) : (
            <div className="loading-card">
              <p>
                {test.skill === "speaking"
                  ? "Record your answer on the left, listen back, then save the recording."
                  : "Write your response in the editor on the left."}
              </p>
            </div>
          )}

          <div className="practice-finish">
            {isGradable ? (
              <>
                <button
                  className="primary-button"
                  onClick={checkAnswer}
                  disabled={isSaving}
                >
                  <Icon name="check" size={18} /> {isSaving ? "Đang lưu…" : "Chấm bài"}
                </button>
                <p>
                  Không phân biệt chữ hoa/thường. Bạn có thể sửa đáp án và chấm
                  lại.
                </p>
              </>
            ) : (
              <button className="primary-button" onClick={() => void save()} disabled={isSaving}>
                <Icon name="check" size={18} /> {isSaving ? "Đang lưu…" : "Lưu bài luyện"}
              </button>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
