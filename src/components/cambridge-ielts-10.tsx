"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";
import Image from "next/image";
import {
  cambridgeIelts10Tests,
  cambridgeSkillLabels,
  type CambridgePart,
  type CambridgeSkill,
  type CambridgeSkillSection,
  type CambridgeTest,
} from "@/data/cambridge-ielts-10";

type ActivePart = {
  test: CambridgeTest;
  section: CambridgeSkillSection;
  part: CambridgePart;
};

function assetForPage(page: number) {
  return `/assets/cambridge-10/pages/page-${String(page).padStart(3, "0")}.jpg`;
}

function answerKeyPage(testId: string, skill: CambridgeSkill) {
  const keys: Record<string, Partial<Record<"listening" | "reading", number>>> = {
    "academic-test-1": { listening: 152, reading: 153 },
    "academic-test-2": { listening: 154, reading: 155 },
    "academic-test-3": { listening: 156, reading: 157 },
    "academic-test-4": { listening: 158, reading: 159 },
    "general-test-a": { reading: 160 },
    "general-test-b": { reading: 161 },
  };
  return skill === "writing" || skill === "speaking"
    ? undefined
    : keys[testId]?.[skill];
}

function storageKey(active: ActivePart) {
  return `aaa:cambridge-10:v1:${active.test.id}:${active.section.skill}:${active.part.id}`;
}

function partNumbers(part: CambridgePart) {
  if (part.questionStart === undefined || part.questionEnd === undefined) return [];
  return Array.from(
    { length: part.questionEnd - part.questionStart + 1 },
    (_, index) => part.questionStart! + index,
  );
}

export function CambridgeIelts10() {
  const [selectedTestId, setSelectedTestId] = useState(cambridgeIelts10Tests[0].id);
  const [selectedSkill, setSelectedSkill] = useState<CambridgeSkill | null>(null);
  const [active, setActive] = useState<ActivePart | null>(null);
  const test = cambridgeIelts10Tests.find((item) => item.id === selectedTestId)!;

  return (
    <AppShell active="practice">
      <main className="cambridge-page" id="main-content">
        <div className="breadcrumb">
          <span>Kho bài luyện</span>
          <Icon name="chevron" size={12} />
          <span>Cambridge IELTS 10</span>
        </div>
        <header className="cambridge-heading">
          <span className="eyebrow"><span />CAMBRIDGE IELTS 10</span>
          <h1>Đề thi theo từng kỹ năng và Part</h1>
          <p>Chọn đề, chọn kỹ năng, sau đó mở đúng Part để làm bài.</p>
        </header>

        <div className="cambridge-test-tabs" role="tablist" aria-label="Cambridge IELTS 10 tests">
          {cambridgeIelts10Tests.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={item.id === test.id}
              className={item.id === test.id ? "selected" : ""}
              onClick={() => {
                setSelectedTestId(item.id);
                setSelectedSkill(null);
              }}
            >
              {item.edition === "general" ? item.title.replace("Cambridge IELTS 10 – ", "") : `Test ${item.id.slice(-1)}`}
            </button>
          ))}
        </div>

        <section className="cambridge-test-overview" aria-labelledby="cambridge-test-title">
          <div>
            <span>{test.edition === "academic" ? "ACADEMIC" : "GENERAL TRAINING"}</span>
            <h2 id="cambridge-test-title">{test.title}</h2>
            <p>Trang nguồn PDF: {test.sourcePages[0]}–{test.sourcePages.at(-1)}</p>
          </div>
          <Icon name="book" size={36} />
        </section>

        <section className="cambridge-skills" aria-label="Kỹ năng">
          {test.skills.map((section) => (
            <button
              className={`cambridge-skill-card ${selectedSkill === section.skill ? "selected" : ""}`}
              key={section.skill}
              type="button"
              onClick={() => setSelectedSkill(section.skill)}
            >
              <Icon name={section.skill === "writing" ? "pen" : section.skill === "speaking" || section.skill === "listening" ? "headphones" : "book"} size={22} />
              <span>{section.label}</span>
              <small>{section.parts.length} phần</small>
            </button>
          ))}
        </section>

        {selectedSkill && (
          <PartList
            section={test.skills.find((item) => item.skill === selectedSkill)!}
            onOpen={(part) => setActive({
              test,
              section: test.skills.find((item) => item.skill === selectedSkill)!,
              part,
            })}
          />
        )}
      </main>
      {active && <ExamPlayer key={active.part.id} active={active} onClose={() => setActive(null)} />}
    </AppShell>
  );
}

function PartList({ section, onOpen }: { section: CambridgeSkillSection; onOpen: (part: CambridgePart) => void }) {
  return (
    <section className="cambridge-parts" aria-live="polite">
      <div>
        <span className="eyebrow"><span />{section.label.toUpperCase()}</span>
        <h2>Chọn Part để bắt đầu</h2>
      </div>
      <div className="cambridge-parts-list">
        {section.parts.map((part) => (
          <button key={part.id} type="button" className="cambridge-part-card" onClick={() => onOpen(part)}>
            <span className="cambridge-part-number">{part.questionStart === undefined ? "TASK" : `${part.questionStart}–${part.questionEnd}`}</span>
            <span><strong>{part.label}</strong><small>{part.questionStart === undefined ? "Đề bài và khu vực trả lời" : `${part.questionEnd! - part.questionStart! + 1} câu`}</small></span>
            <Icon name="arrow" size={18} />
          </button>
        ))}
      </div>
    </section>
  );
}

export function ExamPlayer({ active, onClose }: { active: ActivePart; onClose: () => void }) {
  const numbers = useMemo(() => partNumbers(active.part), [active.part]);
  const key = storageKey(active);
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      return JSON.parse(localStorage.getItem(key) ?? "{}") as Record<string, string>;
    } catch {
      return {};
    }
  });
  const [selectedQuestion, setSelectedQuestion] = useState(numbers[0] ?? 0);
  const [submitted, setSubmitted] = useState(false);
  const [mobilePane, setMobilePane] = useState<"source" | "answers">("source");
  const [split, setSplit] = useState(50);
  const [resizing, setResizing] = useState(false);
  const answersRef = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const isWritingOrSpeaking = active.section.skill === "writing" || active.section.skill === "speaking";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && numbers.length) moveQuestion(1);
      if (event.key === "ArrowLeft" && numbers.length) moveQuestion(-1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  useEffect(() => {
    if (!resizing) return;
    const resize = (event: PointerEvent) => {
      const bounds = bodyRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setSplit(Math.max(30, Math.min(70, ((event.clientX - bounds.left) / bounds.width) * 100)));
    };
    const stop = () => setResizing(false);
    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stop, { once: true });
    return () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stop);
    };
  }, [resizing]);

  function persist(next: Record<string, string>) {
    setAnswers(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // The visible response remains available for this session.
    }
  }

  function moveQuestion(direction: number) {
    const current = numbers.indexOf(selectedQuestion);
    const target = numbers[Math.max(0, Math.min(numbers.length - 1, current + direction))];
    if (!target) return;
    setSelectedQuestion(target);
    setMobilePane("answers");
    requestAnimationFrame(() => answersRef.current[String(target)]?.focus());
  }

  const completed = isWritingOrSpeaking
    ? Boolean(answers.response?.trim())
    : numbers.filter((number) => answers[String(number)]?.trim()).length;
  const answerKey = answerKeyPage(active.test.id, active.section.skill);

  return (
    <div className="exam-modal-backdrop" role="presentation">
      <section className="exam-modal" role="dialog" aria-modal="true" aria-labelledby="exam-player-title">
        <header className="exam-modal-header">
          <div className="exam-brand"><span>A.</span> AAA</div>
          <div><strong id="exam-player-title">{active.test.title}</strong><span>{cambridgeSkillLabels[active.section.skill]} · {active.part.label}</span></div>
          <button type="button" className="exam-close" onClick={onClose} aria-label="Đóng bài làm"><Icon name="x" size={22} /></button>
        </header>
        <div className="exam-instruction"><strong>{active.part.label}</strong><span>{active.part.questionStart === undefined ? "Read the task on the source page and write your response." : `Questions ${active.part.questionStart}–${active.part.questionEnd}`}</span></div>
        <div className="exam-mobile-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mobilePane === "source"} onClick={() => setMobilePane("source")}>Nội dung</button>
          <button type="button" role="tab" aria-selected={mobilePane === "answers"} onClick={() => setMobilePane("answers")}>Câu hỏi / Bài làm</button>
        </div>
        <div ref={bodyRef} className={`exam-modal-body show-${mobilePane}`} style={{ gridTemplateColumns: `minmax(0, ${split}fr) 8px minmax(0, ${100 - split}fr)` }}>
          <section className="exam-source-pane" aria-label="Nội dung từ Cambridge IELTS 10">
            {active.part.sourcePages.map((page) => <Image key={page} src={assetForPage(page)} width={673} height={983} sizes="(max-width: 700px) 100vw, 50vw" unoptimized alt={`Cambridge IELTS 10, source page ${page}`} />)}
            {submitted && answerKey && <Image className="exam-answer-key" src={assetForPage(answerKey)} width={673} height={983} sizes="(max-width: 700px) 100vw, 50vw" unoptimized alt="Answer key from Cambridge IELTS 10" />}
          </section>
          <button type="button" className="exam-divider" aria-label="Kéo để đổi độ rộng hai cột" onPointerDown={() => setResizing(true)} />
          <section className="exam-answer-pane" aria-label="Khu vực trả lời">
            {isWritingOrSpeaking ? (
              <>
                <label className="exam-response-label" htmlFor="exam-response">{active.section.skill === "writing" ? "Your writing" : "Your notes / response"}</label>
                <textarea id="exam-response" ref={(element) => { answersRef.current.response = element; }} value={answers.response ?? ""} onChange={(event) => persist({ ...answers, response: event.target.value })} />
                <small>{answers.response?.trim() ? answers.response.trim().split(/\s+/).length : 0} words · Saved on this device</small>
              </>
            ) : (
              <>
                <h2>Questions {active.part.questionStart}–{active.part.questionEnd}</h2>
                <p>Enter each answer exactly as requested in the source material.</p>
                <div className="exam-answers-list">
                  {numbers.map((number) => (
                    <label className={selectedQuestion === number ? "selected" : ""} key={number} htmlFor={`exam-answer-${number}`}>
                      <span>{number}</span>
                      <input id={`exam-answer-${number}`} ref={(element) => { answersRef.current[String(number)] = element; }} value={answers[String(number)] ?? ""} onFocus={() => setSelectedQuestion(number)} onChange={(event) => persist({ ...answers, [number]: event.target.value })} autoComplete="off" />
                    </label>
                  ))}
                </div>
              </>
            )}
            {submitted && <p className="exam-submitted" role="status">Your response has been submitted. The source Answer Key is now available in the content pane.</p>}
          </section>
        </div>
        <footer className="exam-modal-footer">
          <span>{active.part.label}</span>
          {!isWritingOrSpeaking && <nav aria-label="Question navigation">{numbers.map((number) => <button key={number} type="button" className={`${selectedQuestion === number ? "current" : ""} ${answers[String(number)]?.trim() ? "answered" : ""}`} onClick={() => { setSelectedQuestion(number); setMobilePane("answers"); requestAnimationFrame(() => answersRef.current[String(number)]?.focus()); }}>{number}</button>)}</nav>}
          <div><button type="button" className="exam-step" onClick={() => moveQuestion(-1)} disabled={!numbers.length || selectedQuestion === numbers[0]}>Previous</button><button type="button" className="exam-step" onClick={() => moveQuestion(1)} disabled={!numbers.length || selectedQuestion === numbers.at(-1)}>Next</button><button type="button" className="primary-button" onClick={() => setSubmitted(true)}>{submitted ? "Submitted" : "Submit"}</button></div>
          <small>{typeof completed === "number" ? `${completed}/${numbers.length} answered` : completed ? "Response saved" : "No response yet"}</small>
        </footer>
      </section>
    </div>
  );
}
