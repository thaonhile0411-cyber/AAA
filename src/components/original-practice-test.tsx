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

function responseKey(test: OriginalPracticeTest) {
  return `aaa:original-practice:v1:${test.slug}`;
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

export function OriginalPracticeTestPage({ slug }: { slug: string }) {
  const test = findOriginalPracticeTest(slug);
  const [answer, setAnswer] = useState(() =>
    typeof window !== "undefined" && test
      ? (localStorage.getItem(responseKey(test)) ?? "")
      : "",
  );
  const [saved, setSaved] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(!test || test.skill !== "writing");
  const [isSaving, setIsSaving] = useState(false);
  const [listening, setListening] = useState(false);
  const [grade, setGrade] = useState<GradeResult | null>(null);
  const [answerError, setAnswerError] = useState("");
  const evidenceRef = useRef<HTMLElement>(null);
  const questionRef = useRef<HTMLFieldSetElement>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => {
    if (!test || test.skill !== "writing") return;
    const writingTest = test;
    let cancelled = false;

    async function loadDraft() {
      try {
        const response = await fetch(`/api/practice/drafts/${writingTest.slug}`, { cache: "no-store" });
        const payload = (await response.json()) as { draft?: { content?: string } | null };
        if (!response.ok || cancelled) return;
        if (typeof payload.draft?.content === "string") {
          setAnswer(payload.draft.content);
          localStorage.setItem(responseKey(writingTest), payload.draft.content);
          setSaved(true);
        }
      } catch {
        // The device copy remains available if the learner is temporarily offline.
      } finally {
        if (!cancelled) setIsDraftReady(true);
      }
    }

    void loadDraft();
    return () => { cancelled = true; };
  }, [test]);
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

  function updateAnswer(value: string) {
    setAnswer(value);
    setGrade(null);
    setAnswerError("");
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

  async function save() {
    if (!test || test.skill !== "writing") {
      localStorage.setItem(responseKey(test!), answer);
      setSaved(true);
      window.dispatchEvent(new CustomEvent("practice-completed", { detail: { resourceSlug: slug } }));
      return;
    }

    setIsSaving(true);
    setAnswerError("");
    try {
      const response = await fetch(`/api/practice/drafts/${test.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: answer }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Không thể lưu bài viết.");
      localStorage.setItem(responseKey(test), answer);
      setSaved(true);
      // When this page was opened from Dashboard/Roadmap, StudyTracker owns
      // the task id and turns this one event into the shared completion log.
      window.dispatchEvent(new CustomEvent("practice-completed", { detail: { resourceSlug: slug } }));
    } catch (error) {
      setAnswerError(error instanceof Error ? error.message : "Không thể lưu bài viết.");
    } finally {
      setIsSaving(false);
    }
  }

  function checkAnswer() {
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
    localStorage.setItem(responseKey(test!), answerToGrade);
    setSaved(true);
    setAnswerError("");
    const result = gradePracticeAnswer(answerToGrade, question);
    setGrade(result);
    // A wrong answer should not complete a roadmap task or start a streak.
    if (result.correct) {
      window.dispatchEvent(new CustomEvent("practice-completed", { detail: { resourceSlug: slug } }));
    }
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
          <Icon name="shield" size={16} /> {isWriting ? "Bài viết được lưu vào tài khoản" : "Bài làm được lưu trên thiết bị này"}
        </span>
        <span role="status">{saved ? "Đã lưu" : "Chưa lưu"}</span>
      </div>
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

          {test.skill === "speaking" && (
            <section className="practice-notes">
              <label htmlFor="spoken-response">
                <Icon name="headphones" size={17} /> Speaking plan or
                self-reflection
              </label>
              <textarea
                id="spoken-response"
                rows={10}
                maxLength={5000}
                value={answer}
                onChange={(event) => updateAnswer(event.target.value)}
                placeholder="Plan your response, then speak aloud for one to two minutes. Write notes or a self-reflection here…"
              />
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
                disabled={!isDraftReady}
                placeholder={isDraftReady ? "Write your answer here…" : "Loading your saved draft…"}
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
                  ? "Use the prompt on the left, speak aloud, and write a short self-reflection if helpful."
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
                >
                  <Icon name="check" size={18} /> Chấm bài
                </button>
                <p>
                  Không phân biệt chữ hoa/thường. Bạn có thể sửa đáp án và chấm
                  lại.
                </p>
              </>
            ) : (
              <>
                <button className="primary-button" disabled={isSaving || !isDraftReady} onClick={save}>
                  <Icon name="check" size={18} /> {isSaving ? "Đang lưu..." : "Lưu bài luyện"}
                </button>
                {answerError && <p className="field-error" role="alert">{answerError}</p>}
              </>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
