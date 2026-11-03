"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";
import {
  BAND_GROUPS,
  QUESTION_TYPES,
  draftKey,
  type ExerciseSummary,
  type PracticeContext,
} from "@/lib/practice";

type Catalog = {
  exercises: ExerciseSummary[];
  context: PracticeContext;
  selectedBand: string | null;
};
export function PracticeLibrary() {
  const [skill, setSkill] = useState("");
  const [band, setBand] = useState("");
  const [type, setType] = useState("");
  const [data, setData] = useState<Catalog | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setPending(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (skill) params.set("skill", skill);
        if (band) params.set("band", band);
        if (type) params.set("type", type);
        const response = await fetch(`/api/practice?${params}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(body.error ?? "Chưa tải được kho bài luyện.");
        if (controller.signal.aborted) return;
        setData(body);
        const counts: Record<string, number> = {};
        for (const exercise of body.exercises as ExerciseSummary[]) {
          try {
            const raw = localStorage.getItem(
              draftKey(body.context.userId, exercise.id),
            );
            const draft = raw ? JSON.parse(raw) : null;
            counts[exercise.id] = draft?.answers
              ? Object.values(draft.answers).filter(
                  (value) => typeof value === "string" && value.trim(),
                ).length
              : 0;
          } catch {
            counts[exercise.id] = 0;
          }
        }
        setProgress(counts);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Mất kết nối. Hãy thử lại khi có mạng.",
          );
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [skill, band, type, retry]);

  const chosenBand = band || data?.selectedBand || "all";
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
            LẮNG NGHE. ĐỌC HIỂU. TIẾN BỘ.
          </span>
          <h1>
            Luyện đúng trình độ, <span>tiến xa mỗi ngày.</span>
          </h1>
          <p>
            Reading & Listening được chọn theo band, để mỗi buổi luyện đều có ý
            nghĩa.
          </p>
        </div>
        <span className="heading-detail">
          <Icon name="book" size={17} /> IELTS Academic
        </span>
      </div>
      <section className="practice-hero">
        <div>
          <span className="practice-kicker">HÀNH TRÌNH CỦA BẠN</span>
          <h2>
            Một bài luyện nhỏ.
            <br />
            Thêm một bước vững vàng.
          </h2>
          <p>
            Đọc chủ động với highlight và ghi chú.
            <br />
            Luyện nghe theo nhịp độ phù hợp với bạn.
          </p>
        </div>
        <div className="practice-band-card">
          <Icon name="target" size={27} />
          <small>BAND HIỆN TẠI</small>
          <strong>
            {data?.context.currentBand?.toFixed(1) ?? "Chưa xác định"}
          </strong>
          <span>
            {data?.context.bandSource === "placement"
              ? "Theo kết quả Placement Test"
              : data?.context.bandSource === "self_reported"
                ? "Theo điểm IELTS bạn cung cấp"
                : "Chọn band bên dưới để khám phá"}
          </span>
        </div>
      </section>
      <section className="practice-catalog" aria-label="Danh sách bài luyện">
        <div className="catalog-heading">
          <div>
            <h2>Kho bài luyện của bạn</h2>
            <p>
              {data?.context.currentBand != null
                ? "Đã chọn sẵn nhóm bài theo band hiện tại. Bạn có thể khám phá các nhóm khác."
                : "Chưa có điểm đánh giá: chọn nhóm band phù hợp, hoặc cập nhật mục tiêu và điểm IELTS."}
            </p>
          </div>
          <Link className="text-link" href="/settings/goals">
            Cập nhật điểm <Icon name="arrow" size={16} />
          </Link>
        </div>
        <div className="catalog-filters">
          <div className="skill-tabs" aria-label="Kỹ năng">
            {[
              ["", "Tất cả"],
              ["reading", "Reading"],
              ["listening", "Listening"],
            ].map(([value, label]) => (
              <button
                key={value}
                aria-pressed={skill === value}
                onClick={() => setSkill(value)}
              >
                <Icon
                  name={value === "listening" ? "headphones" : "book"}
                  size={17}
                />
                {label}
              </button>
            ))}
          </div>
          <label>
            Nhóm band
            <select
              value={chosenBand}
              onChange={(event) => setBand(event.target.value)}
            >
              <option value="all">Tất cả band</option>
              {BAND_GROUPS.map((group) => (
                <option key={group.value} value={group.value}>
                  {group.label}
                  {group.value === "5_6" ? " (6.5 thuộc nhóm kế tiếp)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Dạng câu hỏi
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option value="">Tất cả dạng bài</option>
              {Object.entries(QUESTION_TYPES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {pending ? (
          <div className="loading-card" role="status">
            <span className="spinner" />
            Đang tìm bài luyện phù hợp…
          </div>
        ) : error ? (
          <div className="load-error" role="alert">
            <h3>Chưa thể tải kho bài</h3>
            <p>{error}</p>
            <button
              className="primary-button"
              onClick={() => setRetry((count) => count + 1)}
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            <div className="catalog-count" role="status">
              <strong>{data?.exercises.length ?? 0} bài luyện</strong>
              <span>
                Nội dung gốc AAA · Bài luyện ngắn, không phải đề thi IELTS chính
                thức
              </span>
            </div>
            {data?.exercises.length === 0 ? (
              <div className="loading-card">
                <p>Chưa có bài phù hợp với bộ lọc này.</p>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setSkill("");
                    setBand("all");
                    setType("");
                  }}
                >
                  Xem tất cả bài luyện
                </button>
              </div>
            ) : (
              <div className="exercise-grid">
                {data?.exercises.map((exercise, index) => (
                  <article className="exercise-card" key={exercise.id}>
                    <div className={`exercise-cover ${exercise.skill}`}>
                      <span className="exercise-skill">
                        <Icon
                          name={
                            exercise.skill === "reading" ? "book" : "headphones"
                          }
                          size={15}
                        />
                        {exercise.skill === "reading" ? "READING" : "LISTENING"}
                      </span>
                      <span
                        className="exercise-cover-symbol"
                        aria-hidden="true"
                      >
                        <Icon
                          name={
                            exercise.skill === "reading" ? "book" : "headphones"
                          }
                          size={56}
                        />
                      </span>
                      <span
                        className="exercise-cover-number"
                        aria-hidden="true"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="exercise-band">
                        Band{" "}
                        {
                          BAND_GROUPS.find(
                            (group) => group.value === exercise.band_group,
                          )?.label
                        }
                      </span>
                    </div>
                    <div className="exercise-card-body">
                      <h3>{exercise.title}</h3>
                      <p>{exercise.summary}</p>
                      <div className="exercise-meta">
                        <span>
                          <Icon name="clock" size={15} />
                          {exercise.duration_minutes} phút
                        </span>
                        <span>{exercise.question_count} câu hỏi</span>
                      </div>
                      <div className="question-tags">
                        {exercise.question_types.map((questionType) => (
                          <span key={questionType}>
                            {QUESTION_TYPES[questionType]}
                          </span>
                        ))}
                      </div>
                      <div className="exercise-card-footer">
                        <span>
                          {progress[exercise.id]
                            ? `Đã điền ${Math.min(progress[exercise.id], exercise.question_count)}/${exercise.question_count} câu`
                            : "Sẵn sàng bắt đầu"}
                        </span>
                        <Link
                          href={`/practice/${exercise.slug}`}
                          aria-label={`${progress[exercise.id] ? "Tiếp tục" : "Bắt đầu"} ${exercise.title}`}
                        >
                          {progress[exercise.id] ? "Tiếp tục" : "Bắt đầu"}
                          <Icon name="arrow" size={17} />
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </section>
      <div className="practice-tip">
        <Icon name="shield" size={20} />
        <p>
          <strong>Học theo nhịp của bạn.</strong> Câu trả lời được tự lưu trên
          thiết bị sau mỗi thay đổi và kiểm tra lại mỗi 15 giây. Hãy dùng cùng
          trình duyệt để tiếp tục bài luyện.
        </p>
      </div>
    </AppShell>
  );
}
