"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase-client";
import {
  availableBand,
  currentAssessment,
  progress,
  skills,
  studyTime,
  taskHref,
  type Overview,
} from "./model";
import styles from "./dashboard.module.css";
import { syncUserTimeZone } from "@/lib/user-time-zone";

export function Dashboard({
  initial,
  userId,
}: {
  initial: Overview | null;
  userId: string;
}) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState(!initial);
  const router = useRouter();
  const reload = useCallback(async () => {
    const response = await fetch("/api/dashboard", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/login");
      return;
    }
    if (!response.ok) throw new Error("load");
    setData(await response.json());
    setError(false);
  }, [router]);
  useEffect(() => {
    let cancelled = false;
    void syncUserTimeZone().then((saved) => {
      if (saved && !cancelled) void reload().catch(() => setError(true));
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);
  useEffect(() => {
    let running = false;
    const refresh = () => {
      if (running || document.visibilityState === "hidden") return;
      running = true;
      void reload()
        .catch(() => setError(true))
        .finally(() => {
          running = false;
        });
    };
    const client = getSupabaseClient();
    const channel = client
      ?.channel(`dashboard:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_activity_logs",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "roadmap_activities" },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "roadmaps",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "placement_tests",
          filter: `user_id=eq.${userId}`,
        },
        refresh,
      )
      .subscribe();
    const interval = window.setInterval(refresh, 15000);
    const updates =
      "BroadcastChannel" in window
        ? new BroadcastChannel("aaa-study-updates")
        : null;
    if (updates) updates.onmessage = refresh;
    window.addEventListener("focus", refresh);
    window.addEventListener("study-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    refresh();
    return () => {
      clearInterval(interval);
      updates?.close();
      window.removeEventListener("focus", refresh);
      window.removeEventListener("study-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (channel) void client?.removeChannel(channel);
    };
  }, [initial, reload, userId]);
  useEffect(() => {
    if (!data) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        performance.mark("dashboard-metrics-rendered"),
      ),
    );
    return () => cancelAnimationFrame(frame);
  }, [data]);
  if (!data)
    return (
      <section className={styles.panel} role="alert">
        <h1>Chưa tải được tiến độ</h1>
        <p>Kiểm tra kết nối và cấu hình cơ sở dữ liệu.</p>
        <button onClick={() => void reload().catch(() => setError(true))}>
          Thử lại
        </button>
      </section>
    );
  const percentage = progress(data.completed, data.total);
  const time = studyTime(data.totalSeconds);
  const assessment = currentAssessment(data);
  const streak = data.streak;
  const date = (value: string) =>
    new Date(value).toLocaleDateString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
    });
  return (
    <div className={styles.dashboard}>
      <header className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>YOUR IELTS JOURNEY</p>
          <h1>Từng bước đến band mục tiêu</h1>
          <p>Mỗi buổi học đều góp phần vào tiến bộ của bạn.</p>
        </div>
        <Link className={styles.secondary} href="/settings/goals">
          Điều chỉnh mục tiêu ↗
        </Link>
      </header>
      {error && (
        <p role="alert">
          Chưa cập nhật được dữ liệu mới. Đang hiển thị lần tải thành công gần
          nhất.{" "}
          <button onClick={() => void reload().catch(() => setError(true))}>
            Thử lại
          </button>
        </p>
      )}
      <section
        className={styles.metrics}
        aria-label="Chỉ số tổng quan"
        aria-live="polite"
      >
        <article className={styles.panel}>
          <span className={styles.symbol}>◷</span>
          <h2>Tổng thời gian học</h2>
          <div className={styles.value}>
            {time.hours}
            <small>giờ học</small>
          </div>
          <p>{time.label} tập trung tích lũy</p>
          <span className={styles.caption}>Chỉ tính thời gian hoạt động</span>
        </article>
        <article className={styles.panel}>
          <span className={styles.symbol}>✓</span>
          <h2>Nhiệm vụ hoàn thành</h2>
          <div className={styles.value}>
            {data.completed}
            <small>/ {data.total} nhiệm vụ</small>
          </div>
          <div className={styles.progressLabel}>
            <span>Tiến độ lộ trình</span>
            <strong>{percentage}%</strong>
          </div>
          <progress
            aria-label="Tiến độ lộ trình"
            value={percentage}
            max={100}
          />
          <p>
            {data.total
              ? `${data.total - data.completed} nhiệm vụ còn lại`
              : "Lộ trình của bạn chưa có nhiệm vụ"}
          </p>
        </article>
        <article className={`${styles.panel} ${styles.band}`}>
          <span className={styles.symbol}>↗</span>
          <h2>Band ước tính hiện tại</h2>
          <div className={styles.value}>
            {assessment.band?.toFixed(1) ?? "—"}
            <small>
              → Mục tiêu {data.targetBand?.toFixed(1) ?? "chưa đặt"}
            </small>
          </div>
          <p>
            {assessment.date
              ? `${assessment.source} · ${date(assessment.date)}`
              : "Chưa có kết quả đánh giá"}
          </p>
          <span className={styles.caption}>
            Điểm ước tính, không phải chứng chỉ IELTS
          </span>
        </article>
        <article className={`${styles.panel} ${styles.streakCard}`}>
          <span className={styles.symbol} aria-hidden="true">🔥</span>
          <h2>Chuỗi học tập</h2>
          <div className={styles.value} aria-label={`${streak?.current ?? 0} ngày liên tiếp`}>
            {streak?.current ?? 0}
            <small>ngày liên tiếp</small>
          </div>
          <p>
            {streak?.todayActive
              ? "Hôm nay đã hoàn thành ít nhất một bài"
              : streak?.current
                ? "Hoàn thành một bài hôm nay để tiếp tục chuỗi"
                : "Hoàn thành một bài để bắt đầu chuỗi"}
          </p>
          <span className={styles.caption}>{streak?.timeZone ?? "Đang đồng bộ múi giờ"}</span>
        </article>
      </section>
      <section className={`${styles.panel} ${styles.activityPanel}`} aria-labelledby="weekly-activity">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>THÓI QUEN HỌC TẬP</p>
            <h2 id="weekly-activity">Hoạt động 7 ngày gần nhất</h2>
          </div>
          <span className={styles.caption}>Mỗi cột có màu khi có bài hoàn thành</span>
        </div>
        <div className={styles.weekChart} role="list" aria-label="Biểu đồ hoạt động 7 ngày">
          {(streak?.week ?? []).map((day) => {
            const label = new Date(`${day.date}T12:00:00`).toLocaleDateString("vi-VN", { weekday: "short" });
            const height = day.active ? Math.min(100, 32 + day.completions * 22) : 8;
            return (
              <div className={styles.weekDay} key={day.date} role="listitem">
                <span className={styles.barTrack} aria-label={`${label}: ${day.completions} bài hoàn thành`}>
                  <span className={day.active ? styles.barActive : styles.barInactive} style={{ height: `${height}%` }} />
                </span>
                <strong>{label.replace("Thứ ", "T")}</strong>
                <small>{day.active ? `${day.completions} bài` : "—"}</small>
              </div>
            );
          })}
          {!streak?.week.length && <p className={styles.chartEmpty}>Chưa có dữ liệu hoạt động trong 7 ngày gần nhất.</p>}
        </div>
      </section>
      <section className={styles.panel} aria-labelledby="daily-tasks">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>HỌC TẬP MỖI NGÀY</p>
            <h2 id="daily-tasks">Nhiệm vụ hôm nay</h2>
          </div>
          <span className={styles.badge}>
            {data.tasks.length} chưa hoàn thành
          </span>
        </div>
        {data.tasks.map((task) => (
          <article className={styles.task} key={task.task_id}>
            <span className={styles.skillIcon}>
              {task.skill.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <span className={styles.caption}>{task.skill}</span>
              <h3>{task.title}</h3>
            </div>
            <Link className={styles.primary} href={taskHref(task)}>
              Start Learning <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
        {!data.tasks.length && (
          <div className={styles.empty}>
            <h3>
              {data.total
                ? "Bạn đã sẵn sàng cho bước tiếp theo"
                : "Bắt đầu hành trình IELTS của bạn"}
            </h3>
            <p>
              {data.total
                ? "Không còn nhiệm vụ chưa hoàn thành đến hạn hôm nay."
                : "Đặt mục tiêu và làm bài đánh giá để chuẩn bị lộ trình cá nhân."}
            </p>
            <Link
              className={styles.primary}
              href={
                data.unscheduled[0]
                  ? taskHref(data.unscheduled[0])
                  : data.total
                    ? "/roadmap"
                    : "/onboarding/placement-test"
              }
            >
              {data.unscheduled[0]
                ? `Học trước: ${data.unscheduled[0].title}`
                : data.total
                  ? "Xem lộ trình →"
                  : "Làm bài đánh giá đầu vào →"}
            </Link>
            {data.unscheduled[0] && (
              <p className={styles.caption}>
                Lịch học:{" "}
                {data.unscheduled[0].scheduled_date ?? "chưa xếp ngày"}
              </p>
            )}
          </div>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="skill-bands">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>HIỂU RÕ NĂNG LỰC</p>
            <h2 id="skill-bands">Kết quả theo kỹ năng</h2>
          </div>
          <span className={styles.caption}>
            Band mục tiêu chung: {data.targetBand?.toFixed(1) ?? "chưa đặt"}
          </span>
        </div>
        <div className={styles.skills}>
          {skills.map((skill) => {
            const result = data.placementResult?.results.skills?.[skill];
            const band = availableBand(result?.band, result?.status);
            return (
              <article key={skill}>
                <h3>{skill}</h3>
                <strong>{band?.toFixed(1) ?? "—"}</strong>
                <p>
                  {band === null
                    ? "Chưa có kết quả hợp lệ"
                    : `${result?.evaluationDetails?.isAiEvaluated ? "AI assessment" : "Chấm tự động"} · ${data.placementResult?.kind === "reassessment" ? "Đánh giá lại" : "Placement"}`}
                </p>
                {data.placementResult && (
                  <time dateTime={data.placementResult.date}>
                    {date(data.placementResult.date)}
                  </time>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
