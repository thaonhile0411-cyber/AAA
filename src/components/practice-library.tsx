"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  originalPracticeTests,
  practiceSkills,
  type TestSkill,
} from "@/data/original-practice-tests";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";

function iconFor(skill: TestSkill): "book" | "headphones" | "pen" {
  return skill === "listening" || skill === "speaking"
    ? "headphones"
    : skill === "writing"
      ? "pen"
      : "book";
}

export function PracticeLibrary() {
  const [skill, setSkill] = useState<TestSkill | "all">("all");
  const tests = useMemo(
    () =>
      skill === "all"
        ? originalPracticeTests
        : originalPracticeTests.filter((test) => test.skill === skill),
    [skill],
  );

  return (
    <AppShell active="practice">
      <div className="breadcrumb">
        <span>Không gian học tập</span>
        <Icon name="chevron" size={12} />
        <span>Kho bài luyện</span>
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <span />
            BỐN KỸ NĂNG. MỘT HÀNH TRÌNH.
          </span>
          <h1>
            Luyện ngay trong AAA, <span>không rời trang.</span>
          </h1>
          <p>40 bài luyện IELTS tự soạn, gồm 10 bài cho mỗi kỹ năng.</p>
        </div>
        <span className="heading-detail">
          <Icon name="book" size={17} /> Nội dung AAA
        </span>
      </div>
      <section className="practice-hero">
        <div>
          <span className="practice-kicker">KHO BÀI LUYỆN NỘI BỘ</span>
          <h2>
            Làm bài, lưu câu trả lời,
            <br />
            rồi tiếp tục bất cứ lúc nào.
          </h2>
          <p>
            Reading, Listening, Writing và Speaking đều mở trực tiếp trong ứng
            dụng.
            <br />
            Không dùng đề, đáp án hay audio của bên thứ ba.
          </p>
        </div>
        <div className="practice-band-card">
          <Icon name="book" size={27} />
          <small>BÀI LUYỆN CÓ SẴN</small>
          <strong>{originalPracticeTests.length}</strong>
          <span>10 bài cho mỗi kỹ năng</span>
        </div>
      </section>
      <section className="practice-catalog" aria-label="Danh sách bài luyện">
        <div className="catalog-heading">
          <div>
            <h2>Chọn kỹ năng để bắt đầu</h2>
            <p>Mỗi bài có nội dung và câu hỏi được soạn riêng cho AAA.</p>
          </div>
        </div>
        <div className="catalog-filters">
          <div className="skill-tabs" aria-label="Kỹ năng">
            {practiceSkills.map((item) => (
              <button
                key={item.value}
                aria-pressed={skill === item.value}
                onClick={() => setSkill(item.value)}
              >
                <Icon
                  name={
                    item.value === "writing"
                      ? "pen"
                      : item.value === "listening" || item.value === "speaking"
                        ? "headphones"
                        : "book"
                  }
                  size={17}
                />
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="catalog-count" role="status">
          <strong>{tests.length} bài luyện</strong>
          <span>Nội dung tự soạn · làm trực tiếp trong AAA</span>
        </div>
        <div className="exercise-grid">
          {tests.map((test, index) => (
            <article className="exercise-card" key={test.slug}>
              <div
                className={`exercise-cover ${test.skill === "listening" || test.skill === "speaking" ? "listening" : "reading"}`}
              >
                <span className="exercise-skill">
                  <Icon name={iconFor(test.skill)} size={15} />{" "}
                  {test.skill.toUpperCase()}
                </span>
                <span className="exercise-cover-symbol" aria-hidden="true">
                  <Icon name={iconFor(test.skill)} size={56} />
                </span>
                <span className="exercise-cover-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="exercise-band">Bài tự soạn</span>
              </div>
              <div className="exercise-card-body">
                <h3>{test.title}</h3>
                <p>{test.summary}</p>
                <div className="exercise-card-footer">
                  <span>Lưu bài trên thiết bị</span>
                  <Link href={`/practice/${test.slug}`}>
                    Bắt đầu <Icon name="arrow" size={17} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
