"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActiveClock } from "./active-time";
import { notifyStudyUpdate } from "./notify";
import { syncUserTimeZone } from "@/lib/user-time-zone";

type StudyEvent = {
  resourceSlug: string;
  taskId: string | null;
  eventId: string;
  seconds: number;
};
export function StudyTracker({
  resourceSlug,
  taskId,
}: {
  resourceSlug: string;
  taskId: string | null;
}) {
  const [error, setError] = useState("");
  const pending = useRef<StudyEvent[]>([]);
  const sending = useRef<Promise<boolean> | null>(null);
  const seconds = useRef(0);
  useEffect(() => {
    void syncUserTimeZone();
  }, []);
  const flush = useCallback((): Promise<boolean> => {
    if (sending.current) return sending.current;
    sending.current = (async () => {
      while (pending.current.length) {
        try {
          const response = await fetch("/api/study-events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pending.current[0]),
            keepalive: true,
          });
          if (!response.ok) throw new Error("save");
          pending.current.shift();
          setError("");
        } catch {
          setError(
            "Chưa lưu được thời gian học. Hệ thống sẽ thử lại khi kết nối ổn định.",
          );
          return false;
        }
      }
      return true;
    })().finally(() => {
      sending.current = null;
    });
    return sending.current;
  }, []);
  const collect = useCallback(() => {
    const whole = Math.min(30, Math.floor(seconds.current));
    if (whole > 0) {
      pending.current.push({
        resourceSlug,
        taskId,
        eventId: crypto.randomUUID(),
        seconds: whole,
      });
      seconds.current -= whole;
    }
  }, [resourceSlug, taskId]);
  useEffect(() => {
    const clock = new ActiveClock(performance.now());
    const input = () => clock.input(performance.now());
    const change = () => {
      clock.tick(performance.now(), false, false);
      collect();
      void flush();
    };
    const events = [
      "pointerdown",
      "pointermove",
      "keydown",
      "scroll",
      "touchstart",
    ];
    events.forEach((event) =>
      window.addEventListener(event, input, { passive: true }),
    );
    document.addEventListener("visibilitychange", change);
    window.addEventListener("pagehide", change);
    window.addEventListener("blur", change);
    const timer = window.setInterval(() => {
      seconds.current +=
        clock.tick(
          performance.now(),
          document.visibilityState === "visible",
          document.hasFocus(),
        ) / 1000;
      if (seconds.current >= 15) collect();
      void flush();
    }, 1000);
    let finishing = false;
    const complete = async (event: globalThis.Event) => {
      if (
        (event as CustomEvent<{ resourceSlug: string }>).detail
          ?.resourceSlug !== resourceSlug ||
        !taskId ||
        finishing
      )
        return;
      finishing = true;
      collect();
      await flush();
      try {
        const response = await fetch(
          `/api/v1/personalized-roadmap/activities/${taskId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ completed: true, resourceSlug }),
            keepalive: true,
          },
        );
        if (!response.ok) throw new Error("completion");
        notifyStudyUpdate();
      } catch {
        setError(
          "Chưa lưu được tiến độ nhiệm vụ. Hãy nộp lại bài để thử lưu lại.",
        );
      } finally {
        finishing = false;
      }
    };
    window.addEventListener("practice-completed", complete);
    return () => {
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, input));
      document.removeEventListener("visibilitychange", change);
      window.removeEventListener("pagehide", change);
      window.removeEventListener("blur", change);
      window.removeEventListener("practice-completed", complete);
      collect();
      void flush();
    };
  }, [resourceSlug, taskId, collect, flush]);
  return error ? (
    <p
      role="alert"
      className="m-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
    >
      {error}
    </p>
  ) : null;
}
