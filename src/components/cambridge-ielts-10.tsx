"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";
import { PracticeAudio } from "./practice-audio";
import Image from "next/image";
import {
  cambridgeIelts10Tests,
  cambridgeSkillLabels,
  answerKeyFor,
  answerGroupsFor,
  listeningReviewFor,
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

function formatRecordingTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function SpeakingRecorder({ onRecorded }: { onRecorded: () => void }) {
  const [status, setStatus] = useState<"idle" | "recording" | "ready">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function stop() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser does not support microphone recording.");
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopStream();
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;
        setRecordingUrl(url);
        setStatus("ready");
        onRecorded();
      };
      recorder.start();
      setElapsed(0);
      setStatus("recording");
      timerRef.current = setInterval(() => setElapsed((current) => current + 1), 1000);
    } catch (caught) {
      const name = caught instanceof DOMException ? caught.name : "";
      setError(name === "NotAllowedError" ? "Microphone permission was not granted." : "Could not start the microphone recording.");
      stopStream();
    }
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    stopStream();
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
  }, []);

  return (
    <section className="cambridge-recorder" aria-label="Speaking recording">
      <div><strong>Record your response</strong><span>{status === "recording" ? `Recording ${formatRecordingTime(elapsed)}` : recordingUrl ? `Recorded ${formatRecordingTime(elapsed)}` : "Microphone is requested only when you start."}</span></div>
      <div className="cambridge-recorder-controls">
        {status === "recording" ? <button type="button" className="exam-step" onClick={stop}>Stop recording</button> : <button type="button" className="primary-button" onClick={start}>{recordingUrl ? "Record again" : "Start recording"}</button>}
        {recordingUrl && <audio controls src={recordingUrl}>Your browser cannot play this recording.</audio>}
      </div>
      {error && <p className="cambridge-recorder-error" role="alert">{error}</p>}
    </section>
  );
}

function normaliseAnswer(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function SegmentReplayButton({ source, start, end }: { source: string; start: number; end: number }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => audio.current?.pause(), []);

  function replay() {
    if (playing) {
      audio.current?.pause();
      setPlaying(false);
      return;
    }
    audio.current?.pause();
    const player = new Audio(source);
    audio.current = player;
    const begin = () => {
      player.currentTime = start;
      void player.play().catch(() => setPlaying(false));
    };
    player.onloadedmetadata = begin;
    player.ontimeupdate = () => {
      if (player.currentTime >= end) {
        player.pause();
        setPlaying(false);
      }
    };
    player.onended = () => setPlaying(false);
    player.onerror = () => setPlaying(false);
    setPlaying(true);
    if (player.readyState >= HTMLMediaElement.HAVE_METADATA) begin();
  }

  return <button type="button" className="secondary-button" onClick={replay}>
    <Icon name={playing ? "pause" : "play"} size={15} />
    {playing ? "Pause answer segment" : "Replay answer segment"}
  </button>;
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
  const [audioPosition, setAudioPosition] = useState(() => Number(answers.__audioPosition) || 0);
  const [audioSpeed, setAudioSpeed] = useState(() => Number(answers.__audioSpeed) || 1);
  const [hasSpeakingRecording, setHasSpeakingRecording] = useState(false);
  const [reviewedNumber, setReviewedNumber] = useState<number | null>(null);
  const answersRef = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const bodyRef = useRef<HTMLDivElement>(null);
  const isWriting = active.section.skill === "writing";
  const isSpeaking = active.section.skill === "speaking";
  const isWritingOrSpeaking = isWriting || isSpeaking;
  const isListening = active.section.skill === "listening";

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

  const completed = isWriting
    ? Boolean(answers.response?.trim())
    : isSpeaking
      ? hasSpeakingRecording
    : numbers.filter((number) => answers[String(number)]?.trim()).length;
  const answerKey = answerKeyPage(active.test.id, active.section.skill);
  const acceptedAnswers = answerKeyFor(active.test.id, active.section.skill);
  const answerGroups = answerGroupsFor(active.test.id, active.section.skill);
  const scoredNumbers = numbers.filter((number) => acceptedAnswers?.[number]);
  const answeredNumbers = scoredNumbers.filter((number) => answers[String(number)]?.trim());
  const correct = scoredNumbers.filter((number) => {
    const group = answerGroups.find((item) => item.numbers.includes(number));
    if (group) {
      const actual = group.numbers.map((item) => normaliseAnswer(answers[String(item)] ?? "")).sort();
      const expected = group.accepted.map(normaliseAnswer).sort();
      return actual.every((answer, index) => answer === expected[index]);
    }
    return acceptedAnswers![number].some(
      (answer) => normaliseAnswer(answer) === normaliseAnswer(answers[String(number)] ?? ""),
    );
  });
  const unansweredCount = scoredNumbers.length - answeredNumbers.length;
  const incorrectCount = answeredNumbers.length - correct.length;
  const reviewedListeningAnswer = isListening && reviewedNumber
    ? listeningReviewFor(active.part.id, reviewedNumber)
    : undefined;

  function showListeningReview(number: number) {
    setReviewedNumber(number);
    setMobilePane("source");
  }

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
            {isListening && active.part.audioPath && (
              <PracticeAudio
                source={active.part.audioPath}
                title={`${active.test.title} · ${active.part.label}`}
                initialTime={audioPosition}
                speed={audioSpeed}
                onPosition={(time) => {
                  setAudioPosition(time);
                  persist({ ...answers, __audioPosition: String(time) });
                }}
                onSpeed={(speed) => {
                  setAudioSpeed(speed);
                  persist({ ...answers, __audioSpeed: String(speed) });
                }}
                caption="Official Cambridge IELTS 10 audio supplied with this book."
              />
            )}
            {active.part.sourcePages.map((page) => <Image key={page} src={assetForPage(page)} width={673} height={983} sizes="(max-width: 700px) 100vw, 50vw" unoptimized alt={`Cambridge IELTS 10, source page ${page}`} />)}
            {submitted && answerKey && <Image className="exam-answer-key" src={assetForPage(answerKey)} width={673} height={983} sizes="(max-width: 700px) 100vw, 50vw" unoptimized alt="Answer key from Cambridge IELTS 10" />}
            {submitted && isListening && active.test.transcriptPages && (
              <section className="exam-transcript" aria-label="Audioscript from Cambridge IELTS 10">
                <h2>Audioscript</h2>
                <p>The book audioscript is shown after submission as source scans. Use the audio player above to replay the supplied section audio.</p>
                {active.test.transcriptPages.map((page) => <Image key={page} src={assetForPage(page)} width={673} height={983} sizes="(max-width: 700px) 100vw, 50vw" unoptimized alt={`Cambridge IELTS 10 audioscript, source page ${page}`} />)}
              </section>
            )}
            {submitted && reviewedListeningAnswer && active.part.audioPath && (
              <section className="cambridge-answer-review" aria-live="polite">
                <span>QUESTION {reviewedNumber} · ANSWER EVIDENCE</span>
                <h2>Why this answer is correct</h2>
                <p lang="en"><mark>{reviewedListeningAnswer.evidence}</mark></p>
                <p>{reviewedListeningAnswer.explanation}</p>
                <SegmentReplayButton
                  source={active.part.audioPath}
                  start={reviewedListeningAnswer.audioStartSeconds}
                  end={reviewedListeningAnswer.audioEndSeconds}
                />
              </section>
            )}
          </section>
          <button type="button" className="exam-divider" aria-label="Kéo để đổi độ rộng hai cột" onPointerDown={() => setResizing(true)} />
          <section className="exam-answer-pane" aria-label="Khu vực trả lời">
            {isWriting ? (
              <>
                <label className="exam-response-label" htmlFor="exam-response">Your writing</label>
                <textarea id="exam-response" ref={(element) => { answersRef.current.response = element; }} value={answers.response ?? ""} onChange={(event) => persist({ ...answers, response: event.target.value })} />
                <small>{answers.response?.trim() ? answers.response.trim().split(/\s+/).length : 0} words · Saved on this device</small>
              </>
            ) : isSpeaking ? (
              <SpeakingRecorder onRecorded={() => setHasSpeakingRecording(true)} />
            ) : (
              <>
                <h2>Questions {active.part.questionStart}–{active.part.questionEnd}</h2>
                <p>Enter each answer exactly as requested in the source material.</p>
                <div className="exam-answers-list">
                  {numbers.map((number) => (
                    <label className={selectedQuestion === number ? "selected" : ""} key={number} htmlFor={`exam-answer-${number}`}>
                      <span>{number}</span>
                      <input id={`exam-answer-${number}`} ref={(element) => { answersRef.current[String(number)] = element; }} value={answers[String(number)] ?? ""} onFocus={() => setSelectedQuestion(number)} onChange={(event) => persist({ ...answers, [number]: event.target.value })} autoComplete="off" disabled={submitted} />
                      {submitted && acceptedAnswers?.[number] && (
                        <div className="exam-answer-result">
                          <small className={correct.includes(number) ? "correct" : "incorrect"}>
                            {correct.includes(number) ? "Correct" : `Accepted answer: ${acceptedAnswers[number].join(" / ")}`}
                          </small>
                          {isListening && listeningReviewFor(active.part.id, number) && (
                            <button type="button" className="text-link" onClick={() => showListeningReview(number)}>
                              View explanation
                            </button>
                          )}
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}
            {submitted && <p className="exam-submitted" role="status">
              {acceptedAnswers
                ? `${correct.length}/${scoredNumbers.length} correct · ${incorrectCount} incorrect · ${unansweredCount} unanswered. `
                : "Your response has been submitted. "}
              The source Answer Key is now available in the content pane.
            </p>}
          </section>
        </div>
        <footer className="exam-modal-footer">
          <span>{active.part.label}</span>
          {!isWritingOrSpeaking && <nav aria-label="Question navigation">{numbers.map((number) => <button key={number} type="button" className={`${selectedQuestion === number ? "current" : ""} ${answers[String(number)]?.trim() ? "answered" : ""}`} onClick={() => { setSelectedQuestion(number); if (submitted && isListening && listeningReviewFor(active.part.id, number)) showListeningReview(number); else { setMobilePane("answers"); requestAnimationFrame(() => answersRef.current[String(number)]?.focus()); } }}>{number}</button>)}</nav>}
          <div><button type="button" className="exam-step" onClick={() => moveQuestion(-1)} disabled={!numbers.length || selectedQuestion === numbers[0]}>Previous</button><button type="button" className="exam-step" onClick={() => moveQuestion(1)} disabled={!numbers.length || selectedQuestion === numbers.at(-1)}>Next</button><button type="button" className="primary-button" onClick={() => { setSubmitted(true); const initialReview = numbers.find((number) => !correct.includes(number)) ?? numbers[0]; if (isListening && initialReview !== undefined) showListeningReview(initialReview); }}>{submitted ? "Submitted" : "Submit"}</button></div>
          <small>{submitted && acceptedAnswers ? `${correct.length}/${scoredNumbers.length} correct` : typeof completed === "number" ? `${completed}/${numbers.length} answered` : completed ? "Response saved" : "No response yet"}</small>
        </footer>
      </section>
    </div>
  );
}
