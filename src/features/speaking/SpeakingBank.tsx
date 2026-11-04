"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { filterTopics, questionsForPart } from "./bank";
import { PartNavigation } from "./PartNavigation";
import { speakingTopics } from "./topics";
import { partInfo, type SpeakingPart } from "./types";
import styles from "./speaking.module.css";

export default function SpeakingBank({ part }: { part: SpeakingPart }) {
  const defaults = { search: "", topic: "", year: "2026", quarter: "Q4" };
  const [filters, setFilters] = useState(defaults);
  const topics = filterTopics(speakingTopics, { part, ...filters });
  const info = partInfo[part];
  const years = [
    ...new Set(
      speakingTopics.flatMap((t) =>
        t.editions.map((edition) => edition.label.split("-")[0]),
      ),
    ),
  ]
    .sort()
    .reverse();
  function update(key: keyof typeof filters, value: string) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        Study & practice <span>/</span> Speaking
      </div>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>FIND YOUR IDEAS. USE YOUR VOICE.</p>
          <h1>Speaking Question & Model Answer</h1>
          <p>
            Câu hỏi, bài mẫu và Shadowing trong cùng một hành trình luyện nói.
          </p>
        </div>
        <span className={styles.heroIcon}>
          <Icon name="mic" size={32} />
        </span>
      </header>
      <PartNavigation part={part} />
      <section className={styles.partIntro} aria-labelledby="part-heading">
        <span className={styles.bluePill}>{info.title}</span>
        <div>
          <h2 id="part-heading" lang="en">
            {info.name}
          </h2>
          <p lang="en">{info.description}</p>
        </div>
        <span className={styles.timing}>
          <Icon name="clock" size={16} />
          {info.timing}
        </span>
      </section>
      <section className={styles.filters} aria-label="Lọc câu hỏi Speaking">
        <label className={styles.search}>
          Tìm câu hỏi hoặc chủ đề
          <input
            type="search"
            placeholder="Hometown, work, technology…"
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
          />
        </label>
        <div className={styles.filterRow}>
          <label>
            Chủ đề
            <select
              value={filters.topic}
              onChange={(event) => update("topic", event.target.value)}
            >
              <option value="">Tất cả chủ đề</option>
              {speakingTopics.map((topic) => (
                <option value={topic.id} key={topic.id}>
                  {topic.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Năm
            <select
              value={filters.year}
              onChange={(event) => update("year", event.target.value)}
            >
              <option value="">Tất cả năm</option>
              {years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </label>
          <label>
            Bộ đề theo quý
            <select
              value={filters.quarter}
              onChange={(event) => update("quarter", event.target.value)}
            >
              <option value="">Tất cả quý</option>
              {["Q1", "Q2", "Q3", "Q4"].map((quarter) => (
                <option key={quarter}>{quarter}</option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <div className={styles.resultHeader}>
        <p role="status">
          <strong>{topics.length}</strong> chủ đề ·{" "}
          <strong>
            {topics.reduce(
              (sum, topic) => sum + questionsForPart(topic, part).length,
              0,
            )}
          </strong>{" "}
          {part === "part-2" ? "cue cards" : "câu hỏi"} trong {info.title}
        </p>
        <button
          className={styles.textButton}
          onClick={() =>
            setFilters({ search: "", topic: "", year: "", quarter: "" })
          }
        >
          Đặt lại bộ lọc
        </button>
      </div>
      <div className={styles.topicGrid}>
        {topics.map((topic, index) => (
          <article className={styles.topicCard} key={topic.id}>
            <div className={styles.cardTop}>
              <span className={styles.topicIcon}>
                <Icon
                  name={
                    topic.id === "hometown"
                      ? "flag"
                      : topic.id === "technology"
                        ? "sparkle"
                        : "book"
                  }
                  size={23}
                />
              </span>
              <span className={styles.softPill}>
                {info.title} · {questionsForPart(topic, part).length}{" "}
                {part === "part-2" ? "cue card" : "questions"}
              </span>
            </div>
            <p className={styles.cardIndex}>TOPIC 0{index + 1}</p>
            <h2>
              <Link href={`/speaking/${part}/${topic.id}`} lang="en">
                {topic.title}
              </Link>
            </h2>
            <p className={styles.topicDescription}>{topic.descriptionVi}</p>
            <blockquote className={styles.questionPreview} lang="en">
              “{questionsForPart(topic, part)[0].text}”
            </blockquote>
            <div className={styles.tags}>
              <span>Band {topic.suggestedBand[part]} · mục tiêu luyện tập</span>
              {topic.editions
                .filter(
                  (edition) =>
                    (!filters.year || edition.label.startsWith(filters.year)) &&
                    (!filters.quarter ||
                      edition.label.endsWith(filters.quarter)),
                )
                .map((edition) => (
                  <span key={edition.label}>
                    {edition.label.replace("-", " · ")} ·{" "}
                    {edition.status === "unverified-prediction"
                      ? "dự đoán chưa xác minh"
                      : "bộ tự biên soạn"}
                  </span>
                ))}
            </div>
            <div className={styles.cardFooter}>
              <span>
                <Icon name="volume" size={15} /> Audio + vocabulary
              </span>
              <Link
                href={`/speaking/${part}/${topic.id}`}
                className={styles.openLink}
              >
                Luyện chủ đề <Icon name="arrow" size={16} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!topics.length && (
        <section className={styles.empty}>
          <Icon name="book" size={32} />
          <h2>Chưa có bộ câu hỏi phù hợp</h2>
          <p>Thử đổi chủ đề, năm hoặc quý, hoặc đặt lại bộ lọc.</p>
        </section>
      )}
      <div className={styles.catalogNote}>
        <Icon name="info" size={18} />
        <p>
          <strong>Bộ đề luyện tập theo quý/năm.</strong> Nội dung được biên soạn
          cho việc luyện nói. Nhãn dự đoán là nguồn tham khảo bên thứ ba, không
          phải xác nhận của IELTS/IDP/British Council và không bảo đảm xuất hiện
          trong đề thi. Cập nhật nội dung: 04/11/2026.
        </p>
      </div>
    </div>
  );
}
