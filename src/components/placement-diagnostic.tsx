"use client";

import { useState } from "react";
import Link from "next/link";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";

const readingOptions = [
  "It was simple and welcoming.",
  "It required expensive equipment.",
  "It happened only once.",
];
const listeningOptions = ["A notebook", "A passport", "A laptop"];

export function PlacementDiagnostic() {
  const [reading, setReading] = useState("");
  const [listening, setListening] = useState("");
  const [writing, setWriting] = useState("");
  const [speaking, setSpeaking] = useState("");
  const [playing, setPlaying] = useState(false);
  const [complete, setComplete] = useState(false);
  const canFinish =
    reading &&
    listening &&
    writing.trim().split(/\s+/).filter(Boolean).length >= 20 &&
    speaking.trim().length > 0;
  const score =
    Number(reading === readingOptions[0]) +
    Number(listening === listeningOptions[0]);

  const playAudio = () => {
    const utterance = new SpeechSynthesisUtterance(
      "Welcome to the Saturday community workshop. Please arrive ten minutes early and bring a notebook for the planning activity.",
    );
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.onend = () => setPlaying(false);
    window.speechSynthesis.cancel();
    setPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <AppShell active="test">
      <div className="breadcrumb">
        <span>Thiết lập hành trình</span>
        <Icon name="chevron" size={12} />
        <span>Xác định trình độ</span>
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <span />
            BƯỚC 02 · XÁC ĐỊNH TRÌNH ĐỘ
          </span>
          <h1>
            Hiểu điểm xuất phát <span>của bạn.</span>
          </h1>
          <p>
            Hoàn thành bài đánh giá ngắn bốn kỹ năng trước khi bước vào lộ
            trình.
          </p>
        </div>
        <span className="heading-detail">
          <Icon name="clock" size={17} /> Khoảng 8 phút
        </span>
      </div>
      <ol className="stepper" aria-label="Các bước thiết lập lộ trình">
        <li className="complete">
          <span className="step-number">01</span>
          <span>
            <strong>Đặt mục tiêu</strong>
            <small>Đã hoàn thành</small>
          </span>
        </li>
        <li className="current" aria-current="step">
          <span className="step-number">02</span>
          <span>
            <strong>Xác định trình độ</strong>
            <small>Hiểu điểm xuất phát</small>
          </span>
        </li>
        <li>
          <span className="step-number">03</span>
          <span>
            <strong>Lộ trình của bạn</strong>
            <small>Sẵn sàng để tiến xa</small>
          </span>
        </li>
      </ol>
      {complete ? (
        <section className="onboarding-handoff" role="status">
          <Icon name="check" />
          <div>
            <h2>Đã hoàn thành đánh giá đầu vào</h2>
            <p>
              Bạn trả lời đúng {score}/2 câu khách quan và đã hoàn thành phần
              Writing, Speaking. Điểm xuất phát sẽ được dùng cùng mục tiêu để
              xây dựng lộ trình ở bước 03.
            </p>
            <Link className="primary-button" href="/practice">
              Tiếp tục học trong kho bài luyện <Icon name="arrow" />
            </Link>
          </div>
        </section>
      ) : (
        <section className="practice-catalog" aria-label="Bài đánh giá đầu vào">
          <div className="catalog-heading">
            <div>
              <h2>Bài đánh giá 4 kỹ năng</h2>
              <p>Đây là bài onboarding độc lập, không phải Kho bài luyện.</p>
            </div>
          </div>
          <div className="survey-card">
            <section className="form-section">
              <div className="field-heading">
                <span className="field-number">01</span>
                <div>
                  <strong>Reading</strong>
                  <p>Read the short statement and choose the best answer.</p>
                </div>
              </div>
              <p lang="en">
                A neighbourhood project grew because residents found it
                practical and welcoming.
              </p>
              <p>Why did the project grow?</p>
              <div className="answer-options">
                {readingOptions.map((option) => (
                  <label
                    className={reading === option ? "selected" : ""}
                    key={option}
                  >
                    <input
                      type="radio"
                      name="placement-reading"
                      checked={reading === option}
                      onChange={() => setReading(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </section>
            <section className="form-section">
              <div className="field-heading">
                <span className="field-number">02</span>
                <div>
                  <strong>Listening</strong>
                  <p>Play the audio, then choose the answer.</p>
                </div>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={playAudio}
              >
                <Icon name={playing ? "pause" : "play"} size={17} />
                {playing ? "Đang phát" : "Phát audio"}
              </button>
              <p>What should participants bring?</p>
              <div className="answer-options">
                {listeningOptions.map((option) => (
                  <label
                    className={listening === option ? "selected" : ""}
                    key={option}
                  >
                    <input
                      type="radio"
                      name="placement-listening"
                      checked={listening === option}
                      onChange={() => setListening(option)}
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </section>
            <section className="form-section">
              <div className="field-heading">
                <span className="field-number">03</span>
                <div>
                  <strong>Writing</strong>
                  <p>Write at least 20 words.</p>
                </div>
              </div>
              <label className="sr-only" htmlFor="placement-writing">
                Writing response
              </label>
              <textarea
                id="placement-writing"
                rows={5}
                value={writing}
                onChange={(event) => setWriting(event.target.value)}
                placeholder="Describe one habit that helps you learn English effectively, and explain why."
              />
            </section>
            <section className="form-section">
              <div className="field-heading">
                <span className="field-number">04</span>
                <div>
                  <strong>Speaking</strong>
                  <p>
                    Speak aloud for one minute, then write a brief
                    self-reflection.
                  </p>
                </div>
              </div>
              <label className="sr-only" htmlFor="placement-speaking">
                Speaking self-reflection
              </label>
              <textarea
                id="placement-speaking"
                rows={4}
                value={speaking}
                onChange={(event) => setSpeaking(event.target.value)}
                placeholder="What did you say confidently, and what would you improve next time?"
              />
            </section>
            <div className="submit-row">
              <span>Hoàn thành đủ bốn phần để tiếp tục.</span>
              <button
                className="primary-button"
                type="button"
                disabled={!canFinish}
                onClick={() => setComplete(true)}
              >
                Hoàn thành đánh giá <Icon name="arrow" />
              </button>
            </div>
          </div>
        </section>
      )}
    </AppShell>
  );
}
