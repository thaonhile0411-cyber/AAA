import styles from "./writing.module.css";
import { useId, useState } from "react";
import { criteria, criterionLabels, taskCriterionLabel, type WritingAssessment } from "./assessment";
import type { WritingPrompt } from "./prompts";

export function WritingResults({
  assessment,
  essay,
  task,
}: {
  assessment: WritingAssessment;
  essay: string;
  task: WritingPrompt["task"];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const correctionId = useId();
  const labels = { task: taskCriterionLabel(task), ...criterionLabels };
  const unassessable = assessment.taskFit === "unassessable";
  const correction =
    selected === null ? null : assessment.corrections[selected];

  return (
    <>
      <div className={styles.card}>
        <p className={styles.label}>
          Band ước tính bởi AI{" "}
          <strong className={styles.overall}>
            {unassessable ? "Chưa đủ dữ liệu" : assessment.overall.toFixed(1)}
          </strong>
        </p>
        <dl className={styles.scores}>
          {criteria.map((key) => (
            <div key={key}>
              <dt lang="en">{labels[key]}</dt>
              <dd>{unassessable ? "—" : assessment.scores[key].toFixed(1)}</dd>
            </div>
          ))}
        </dl>
        {(assessment.taskFit === "off_topic" || assessment.taskFit === "partially_on_topic") && (
          <p className={styles.warning}>
            {assessment.taskFit === "off_topic" ? "Bài viết lạc đề." : "Bài viết mới đáp ứng một phần yêu cầu đề."}
          </p>
        )}
        <p>{assessment.summary}</p>
      </div>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Nhận xét theo tiêu chí</h3>
        {assessment.strengths.length > 0 && (
          <>
            <h4>Điểm mạnh</h4>
            <ul>{assessment.strengths.map((strength, index) => <li key={index}>{strength}</li>)}</ul>
          </>
        )}
        <ul className={styles.vocabulary}>
          {criteria.map((key) => (
            <li key={key}>
              <h4 lang="en" className={styles.label}>{labels[key]}</h4>
              <p className={styles.hint}>{assessment.feedback[key].issue}</p>
              <p className={styles.hint}><strong>Cách cải thiện</strong> {assessment.feedback[key].improvement}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Ngữ pháp và chính tả</h3>
        <p className={styles.hint}>
          {assessment.corrections.length
            ? "Chọn cụm từ gạch chân đỏ để xem cách sửa."
            : "AI không đánh dấu lỗi nào trong bài này."}
        </p>
        <p lang="en" className={styles.essay}>
          {assessment.corrections.map(({ start, end }, index) => (
            <span key={start}>
              {essay.slice(assessment.corrections[index - 1]?.end ?? 0, start)}
              <button
                type="button"
                aria-pressed={selected === index}
                aria-controls={correctionId}
                onClick={() => setSelected(selected === index ? null : index)}
                className={styles.marked}
              >
                {essay.slice(start, end)}
              </button>
            </span>
          ))}
          {essay.slice(assessment.corrections.at(-1)?.end ?? 0)}
        </p>
        <div
          id={correctionId}
          role="status"
          className={correction ? styles.correction : undefined}
        >
          {correction && (
            <>
              <p>
                <span lang="en">{essay.slice(correction.start, correction.end)}</span>{" · "}
                <strong>Cách sửa</strong>{" "}
                {correction.replacement ? (
                  <span lang="en">{correction.replacement}</span>
                ) : (
                  "Bỏ phần được gạch chân."
                )}
              </p>
              <p className={styles.hint}>{correction.explanation}</p>
            </>
          )}
        </div>
      </div>
      <div className={styles.card}>
        <h3 className={styles.cardTitle}>Gợi ý nâng cấp từ vựng</h3>
        {assessment.vocabulary.length ? (
          <ul className={styles.vocabulary}>
            {assessment.vocabulary.map(
              ({ original, replacement, explanation }) => (
                <li key={original}>
                  <p lang="en" className={styles.label}>
                    {original} → {replacement}
                  </p>
                  <p className={styles.hint}>{explanation}</p>
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className={styles.hint}>AI chưa có gợi ý từ vựng cho bài này.</p>
        )}
      </div>
      {assessment.rewrite && <div className={styles.card}>
        <h3 className={styles.cardTitle}>Bản viết lại tham khảo</h3>
        <p lang="en" className={styles.essay}>
          {assessment.rewrite}
        </p>
      </div>}
    </>
  );
}
