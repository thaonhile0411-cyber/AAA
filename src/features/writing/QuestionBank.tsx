"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { filterPrompts } from "./bank";
import { writingPrompts } from "./prompts";
import { task1Types, task2Types } from "./types";
import styles from "./writing.module.css";

export default function QuestionBank() {
  const [filters, setFilters] = useState({
    search: "",
    task: "",
    topic: "",
    band: "",
    type: "",
  });
  const results = filterPrompts(writingPrompts, filters);
  const topics = [...new Set(writingPrompts.map((p) => p.topic))].sort();
  function update(key: keyof typeof filters, value: string) {
    setFilters((previous) => ({
      ...previous,
      [key]: value,
      ...(key === "task" ? { type: "" } : {}),
    }));
  }
  return (
    <div className={styles.page} lang="en">
      <div className={styles.breadcrumb}>
        Study & practice <span>/</span> Writing
      </div>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>BUILD IDEAS. FIND YOUR WORDS.</p>
          <h1>Writing question bank</h1>
          <p>Explore a prompt, shape your ideas, and write with confidence.</p>
        </div>
        <div className={styles.heroIcon}>
          <Icon name="edit" size={32} />
        </div>
      </header>
      <div className={styles.banner}>
        <Icon name="sparkle" />
        <div>
          <strong>A little inspiration goes a long way.</strong>
          <p>
            Every prompt includes an outline, five vocabulary keys, and a
            highlighted model response.
          </p>
        </div>
        <span className={styles.pill}>Task 1 & Task 2</span>
      </div>
      <section className={styles.filters} aria-label="Filter writing prompts">
        <label className={styles.search}>
          Search prompts
          <input
            type="search"
            placeholder="Try technology, recycling, education…"
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
          />
        </label>
        <div className={styles.filterRow}>
          <label>
            Writing task
            <select
              value={filters.task}
              onChange={(e) => update("task", e.target.value)}
            >
              <option value="">All tasks</option>
              <option value="1">Task 1 · Academic report</option>
              <option value="2">Task 2 · Essay</option>
            </select>
          </label>
          <label>
            Topic
            <select
              value={filters.topic}
              onChange={(e) => update("topic", e.target.value)}
            >
              <option value="">All topics</option>
              {topics.map((topic) => (
                <option key={topic}>{topic}</option>
              ))}
            </select>
          </label>
          <label>
            Target band
            <select
              value={filters.band}
              onChange={(e) => update("band", e.target.value)}
            >
              <option value="">All bands</option>
              <option value="7.0">Band 7.0+</option>
              <option value="8.0">Band 8.0+</option>
            </select>
          </label>
          <label>
            Question type
            <select
              value={filters.type}
              onChange={(e) => update("type", e.target.value)}
            >
              <option value="">All types</option>
              {(filters.task === "1"
                ? task1Types
                : filters.task === "2"
                  ? task2Types
                  : [...task1Types, ...task2Types]
              ).map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <div className={styles.resultHeader}>
        <p role="status">
          <strong>{results.length}</strong> prompts to explore
        </p>
        <button
          className={styles.textButton}
          onClick={() =>
            setFilters({ search: "", task: "", topic: "", band: "", type: "" })
          }
        >
          Reset filters
        </button>
      </div>
      <div className={styles.grid}>
        {results.map((prompt) => (
          <article key={prompt.id} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.taskLabel}>TASK {prompt.task}</span>
              <span className={styles.band}>Band {prompt.band}+</span>
            </div>
            <h2>
              <Link href={`/writing/${prompt.id}`}>{prompt.title}</Link>
            </h2>
            <div className={styles.tags}>
              <span>{prompt.topic}</span>
              <span>{prompt.type}</span>
            </div>
            <p className={styles.excerpt}>{prompt.question}</p>
            <div className={styles.cardBottom}>
              <span>
                <Icon name="clock" size={15} />{" "}
                {prompt.task === 1 ? "20" : "40"} min ·{" "}
                {prompt.task === 1 ? "150" : "250"}+ words
              </span>
              <Link href={`/writing/${prompt.id}`} className={styles.openLink}>
                Explore prompt <Icon name="arrow" size={16} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      {results.length === 0 && (
        <div className={styles.empty}>
          <Icon name="book" size={32} />
          <h2>No matching prompts</h2>
          <p>
            Try a different topic or reset the filters to explore the whole
            bank.
          </p>
        </div>
      )}
      <p className={styles.note}>
        Original practice materials. Band labels indicate learning targets, not
        official examiner scores.
      </p>
      <aside className={styles.references} aria-label="More writing resources">
        <strong>Explore more model responses</strong>
        <p>
          Browse DOL English for additional prompts, outlines and vocabulary.
        </p>
        <div>
          <a
            href="https://tuhoc.dolenglish.vn/category/tong-hop-bai-mau-ielts-writing-task-1-sample"
            target="_blank"
            rel="noopener noreferrer"
          >
            DOL · Task 1 samples ↗
          </a>
          <a
            href="https://tuhoc.dolenglish.vn/category/tong-hop-bai-mau-ielts-writing-task-2-sample"
            target="_blank"
            rel="noopener noreferrer"
          >
            DOL · Task 2 samples ↗
          </a>
        </div>
      </aside>
    </div>
  );
}
