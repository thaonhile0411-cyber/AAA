"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  findOriginalPracticeTest,
  type OriginalPracticeTest,
} from "@/data/original-practice-tests";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";

function responseKey(test: OriginalPracticeTest) {
  return `aaa:original-practice:v1:${test.slug}`;
}

export function OriginalPracticeTestPage({ slug }: { slug: string }) {
  const test = findOriginalPracticeTest(slug);
  const [answer, setAnswer] = useState(() =>
    typeof window !== "undefined" && test
      ? (localStorage.getItem(responseKey(test)) ?? "")
      : "",
  );
  const [saved, setSaved] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
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
  const isChoice = test.skill === "reading" || test.skill === "listening";
  const isListening = test.skill === "listening";
  const isWriting = test.skill === "writing";
  const speak = () => {
    const utterance = new SpeechSynthesisUtterance(test.prompt);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onend = () => setListening(false);
    setListening(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };
  const save = () => {
    localStorage.setItem(responseKey(test), answer);
    setSaved(true);
  };
  const correct = isChoice && answer ? answer === test.answer : null;

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
          <Icon name="shield" size={16} /> Bài làm được lưu trên thiết bị này
        </span>
        <span role="status">{saved ? "Đã lưu" : "Chưa lưu"}</span>
      </div>
      <div className="practice-split reading">
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
                  Press play to hear the original audio script. You can replay
                  it as needed.
                </p>
                <button className="primary-button" onClick={speak}>
                  <Icon name={listening ? "pause" : "play"} size={18} />
                  {listening ? "Playing" : "Play audio"}
                </button>
              </>
            ) : (
              <p>{test.prompt}</p>
            )}
          </div>
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
                onChange={(event) => setAnswer(event.target.value)}
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
                onChange={(event) => setAnswer(event.target.value)}
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
              <h2>{isChoice ? "Question" : "Your response"}</h2>
              <p>
                {isChoice
                  ? test.question
                  : "Complete the task, then save your work."}
              </p>
            </div>
          </div>
          {isChoice ? (
            <div className="question-list" lang="en">
              <fieldset className="practice-question">
                <legend>
                  <span>1</span> Choose one answer
                </legend>
                <div className="answer-options">
                  {test.options?.map((option) => (
                    <label
                      className={answer === option ? "selected" : ""}
                      key={option}
                    >
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={answer === option}
                        onChange={() => setAnswer(option)}
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
                {correct !== null && (
                  <p className={correct ? "restore-message" : "load-error"}>
                    {correct
                      ? "Correct — well done."
                      : "Not quite. Review the task and try again."}
                  </p>
                )}
              </fieldset>
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
            <button className="primary-button" onClick={save}>
              <Icon name="check" size={18} /> Lưu bài luyện
            </button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
