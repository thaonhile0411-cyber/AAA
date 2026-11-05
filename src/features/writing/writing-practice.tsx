"use client";

import styles from "./writing.module.css";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CLIENT_GRADING_TIMEOUT_MS,
  MAX_ESSAY_LENGTH,
  countWords,
  minimumWords,
  type WritingSubmissionVersion,
} from "./assessment";
import type { WritingPrompt } from "./prompts";
import { takeWritingTransfer } from "./transfer";
import { WritingResults } from "./writing-results";

export function WritingPractice({
  prompts,
  initialPromptId,
}: {
  prompts: readonly WritingPrompt[];
  initialPromptId?: string;
}) {
  const [promptId, setPromptId] = useState(
    prompts.find(({ id }) => id === initialPromptId)?.id ?? prompts[0].id,
  );
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [submissions, setSubmissions] = useState<Record<string, WritingSubmissionVersion[]>>({});
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [restoreKey, setRestoreKey] = useState(0);
  const [expiredLeaseKey, setExpiredLeaseKey] = useState<string | null>(null);
  const inFlight = useRef(false);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const prompt = prompts.find(({ id }) => id === promptId) ?? prompts[0];
  const essay = drafts[prompt.id] ?? "";
  const wordCount = countWords(essay);
  const requiredWords = minimumWords(prompt.task);
  const versions = submissions[prompt.id] ?? [];
  const submission =
    versions.find(({ id }) => id === selectedVersions[prompt.id]) ?? versions[0];
  const submissionId = submission?.id;
  const submissionStatus = submission?.status;
  const submissionLeaseExpiresAt = submission?.leaseExpiresAt;
  const submissionLeaseKey =
    submissionId && submissionLeaseExpiresAt
      ? `${submissionId}:${submissionLeaseExpiresAt}`
      : null;
  const assessment = submission?.essay === essay ? submission.assessment : null;
  const activeAttempt =
    submission?.essay === essay &&
    submission.status === "processing" &&
    expiredLeaseKey !== submissionLeaseKey;
  const expiredAttempt =
    submission?.essay === essay &&
    submission.status === "processing" &&
    expiredLeaseKey === submissionLeaseKey;

  useEffect(() => {
    if (!initialPromptId || !prompts.some(({ id }) => id === initialPromptId)) return;
    const timer = window.setTimeout(() => {
      try {
        const essay = takeWritingTransfer(sessionStorage, initialPromptId);
        if (essay === null) return;
        setDrafts((previous) =>
          Object.hasOwn(previous, initialPromptId)
            ? previous
            : { ...previous, [initialPromptId]: essay },
        );
      } catch {
        setError("Không thể tải bài được chuyển từ kho bài luyện.");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialPromptId, prompts]);

  useEffect(() => {
    const controller = new AbortController();
    let timer: number | undefined;
    async function restoreSubmission() {
      try {
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)]);
        const query = new URLSearchParams({ promptId });
        const response = await fetch(`/api/writing/assessment?${query}`, { signal });
        if (!response.ok) throw new Error("Không thể tải lịch sử bài Writing đã lưu.");
        const { submissions: saved }: { submissions: WritingSubmissionVersion[] } = await response.json();
        if (controller.signal.aborted) return;
        setSubmissions((previous) => ({ ...previous, [promptId]: saved }));
        const latest = saved[0];
        if (latest) {
          setDrafts((previous) =>
            Object.hasOwn(previous, promptId) ? previous : { ...previous, [promptId]: latest.essay },
          );
          setSelectedVersions((previous) =>
            Object.hasOwn(previous, promptId) ? previous : { ...previous, [promptId]: latest.id },
          );
        }
        if (saved.some(({ status, leaseExpiresAt }) =>
          status === "processing" && Date.parse(leaseExpiresAt) > Date.now(),
        )) {
          timer = window.setTimeout(() => void restoreSubmission(), 1_500);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Không thể tải lịch sử bài Writing đã lưu. Bạn vẫn có thể tiếp tục soạn bài.");
        }
      }
    }
    void restoreSubmission();
    return () => {
      controller.abort();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [promptId, restoreKey]);

  useEffect(() => {
    if (!submissionId || submissionStatus !== "processing" || !submissionLeaseExpiresAt) return;
    const remaining = Date.parse(submissionLeaseExpiresAt) - Date.now();
    const timer = window.setTimeout(
      () => setExpiredLeaseKey(submissionLeaseKey),
      Math.max(0, remaining),
    );
    return () => window.clearTimeout(timer);
  }, [submissionId, submissionLeaseExpiresAt, submissionLeaseKey, submissionStatus]);

  useEffect(() => {
    if (assessment) resultsHeading.current?.focus();
  }, [assessment]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || assessment || activeAttempt || wordCount < requiredWords) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    const signal = AbortSignal.timeout(CLIENT_GRADING_TIMEOUT_MS);
    try {
      const response = await fetch("/api/writing/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: prompt.id, essay }),
        signal,
      });
      const data = await response.json().catch(() => null);
      signal.throwIfAborted();
      if (!response.ok || !data?.assessment) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Không thể chấm bài. Hãy thử lại.",
        );
        setRestoreKey((key) => key + 1);
        return;
      }
      const completed: WritingSubmissionVersion = {
        id: data.id,
        essay,
        status: "completed",
        assessment: data.assessment,
        createdAt: new Date().toISOString(),
        wordCount: data.wordCount ?? wordCount,
        leaseExpiresAt: new Date().toISOString(),
      };
      setSubmissions((previous) => ({
        ...previous,
        [prompt.id]: [
          completed,
          ...(previous[prompt.id] ?? []).filter(({ id }) => id !== completed.id),
        ].slice(0, 10),
      }));
      setSelectedVersions((previous) => ({ ...previous, [prompt.id]: completed.id }));
    } catch {
      setError(
        signal.aborted
          ? "Đã hết thời gian chờ chấm bài. Bài viết của bạn vẫn còn trong ô soạn thảo."
          : "Không thể kết nối để chấm bài. Hãy thử lại.",
      );
      setRestoreKey((key) => key + 1);
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={submit} className={styles.stack}>
        <div className={styles.picker}>
          <label htmlFor="writing-prompt" className={styles.label}>
            Đề Writing
          </label>
          <select
            id="writing-prompt"
            value={prompt.id}
            disabled={pending}
            onChange={(event) => {
              setPromptId(event.target.value);
              setError("");
            }}
            className={styles.select}
          >
            {prompts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </div>

        {versions.length > 1 && (
          <div className={styles.picker}>
            <label htmlFor="writing-version" className={styles.label}>Phiên bản đã lưu</label>
            <select
              id="writing-version"
              value={submission?.id ?? ""}
              onChange={(event) => {
                const selected = versions.find(({ id }) => id === event.target.value);
                if (!selected) return;
                setSelectedVersions((previous) => ({ ...previous, [prompt.id]: selected.id }));
                setDrafts((previous) => ({ ...previous, [prompt.id]: selected.essay }));
                setError("");
              }}
              className={styles.select}
            >
              {versions.map((version, index) => (
                <option key={version.id} value={version.id}>
                  {new Date(version.createdAt).toLocaleString("vi-VN")} · Bản {versions.length - index} · {
                    version.status === "completed" ? "Đã chấm" : version.status === "processing" ? "Đang chấm" : "Cần chấm lại"
                  } · {version.wordCount} từ
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.workspace}>
          <section className={styles.card}>
            <p className={styles.eyebrow}>Bài luyện Writing</p>
            <h2 className={styles.promptTitle} lang="en">
              {prompt.title}
            </h2>
            <p className={styles.instructions} lang="en">
              {prompt.instructions}
            </p>
            {prompt.table && (
              <div className={styles.tableRegion}>
                <table lang="en" className={styles.table}>
                  <caption>{prompt.table.caption}</caption>
                  <thead>
                    <tr>
                      {prompt.table.columns.map((column) => (
                        <th key={column} scope="col">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {prompt.table.rows.map(([library, ...visits]) => (
                      <tr key={library}>
                        <th scope="row">{library}</th>
                        {visits.map((value, index) => (
                          <td key={index}>{value}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <label htmlFor="writing-essay" className={styles.label}>
              Bài viết của bạn
            </label>
            {prompt.task === "practice" && <button
              type="button"
              disabled={pending}
              onClick={() => {
                try {
                  const saved = localStorage.getItem(`aaa:original-practice:v1:${prompt.id}`);
                  if (saved === null) {
                    setError("Chưa có bài đã lưu cho đề này trên thiết bị.");
                  } else if (saved.length > MAX_ESSAY_LENGTH) {
                    setError(`Bài đã lưu vượt giới hạn ${MAX_ESSAY_LENGTH} ký tự. Hãy rút ngắn bài trước khi chấm.`);
                  } else {
                    setDrafts((previous) => ({ ...previous, [prompt.id]: saved }));
                    setError("");
                  }
                } catch {
                  setError("Không thể đọc bài đã lưu trên thiết bị.");
                }
              }}
              className={styles.back}
            >
              Tải bài đã lưu từ kho bài luyện
            </button>}
            <textarea
              id="writing-essay"
              lang="en"
              rows={12}
              maxLength={MAX_ESSAY_LENGTH}
              value={essay}
              readOnly={pending}
              aria-describedby="writing-word-count"
              onChange={(event) => {
                const value = event.target.value;
                setDrafts((previous) => ({ ...previous, [prompt.id]: value }));
                setError("");
              }}
              className={styles.editor}
            />
            <p id="writing-word-count" className={styles.count}>
              <strong>{wordCount} từ.</strong>{" "}
              {wordCount < requiredWords ? (
                <span className={styles.warning}>
                  Tối thiểu {requiredWords} từ. Còn thiếu{" "}
                  {requiredWords - wordCount} từ.
                </span>
              ) : (
                <span className={styles.ready}>
                  Đã đạt yêu cầu tối thiểu {requiredWords} từ.
                </span>
              )}
            </p>
            {submission?.essay === essay && submission.status === "processing" && (
              <p role="status" className={expiredAttempt ? styles.warning : styles.loading}>
                {expiredAttempt
                  ? "Lượt chấm trước đã bị gián đoạn. Gửi lại để tiếp tục chấm bản đã lưu."
                  : "Bài viết đã được lưu và đang được chấm. Kết quả sẽ tự cập nhật khi hoàn tất."}
              </p>
            )}
            {submission?.essay === essay && submission.status === "failed" && (
              <p role="status" className={styles.warning}>
                Bản viết này đã được lưu nhưng chưa chấm xong. Bạn có thể gửi lại để thử chấm tiếp.
              </p>
            )}
            {essay.length >= MAX_ESSAY_LENGTH && (
              <p className={styles.warning}>
                Đã đạt giới hạn {MAX_ESSAY_LENGTH} ký tự.
              </p>
            )}
            <button
              type="submit"
              disabled={pending || Boolean(assessment) || Boolean(activeAttempt) || wordCount < requiredWords}
              className={styles.submit}
            >
              {pending || activeAttempt
                ? "Đang chấm bài…"
                : assessment
                  ? "Phiên bản này đã được chấm"
                  : expiredAttempt || (submission?.essay === essay && submission.status === "failed")
                    ? "Thử chấm lại phiên bản này"
                    : "Gửi bài để AI chấm"}
            </button>
          </section>
        </div>
      </form>
      {pending && (
        <div role="status" className={styles.loading}>
          <span aria-hidden="true" className={styles.pulse} />
          AI đang chấm bài và chuẩn bị phản hồi…
        </div>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {assessment && (
        <section className={styles.stack} aria-labelledby="writing-results">
          <h2
            id="writing-results"
            ref={resultsHeading}
            tabIndex={-1}
            className={styles.resultHeading}
          >
            Kết quả chấm bài
          </h2>
          <WritingResults
            key={submission.id}
            assessment={assessment}
            essay={submission.essay}
            task={prompt.task}
          />
        </section>
      )}
    </>
  );
}
