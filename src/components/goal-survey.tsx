"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";
import {
  addDays,
  formatDate,
  goalWarning,
  overallBand,
  SCORE_BANDS,
  SKILLS,
  STUDY_OPTIONS,
  TARGET_BANDS,
  todayInVietnam,
  validateGoals,
  type FieldErrors,
  type Scores,
  type Skill,
} from "@/lib/goals";
import { loadGoals, saveGoals } from "@/features/auth/onboarding";

type ScoreDraft = Record<Skill, string>;
const EMPTY_SCORES: ScoreDraft = {
  listening: "",
  reading: "",
  writing: "",
  speaking: "",
};

export function GoalSurvey({
  mode = "onboarding",
}: {
  mode?: "onboarding" | "settings";
}) {
  const settings = mode === "settings";
  const formId = useId();
  const [targetBand, setTargetBand] = useState("");
  const [examDate, setExamDate] = useState("");
  const [dailyTime, setDailyTime] = useState<number | null>(null);
  const [useScores, setUseScores] = useState(false);
  const [scores, setScores] = useState<ScoreDraft>(EMPTY_SCORES);
  const [today, setToday] = useState(todayInVietnam);
  const [minDate, setMinDate] = useState(() => addDays(todayInVietnam(), 7));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saved, setSaved] = useState(false);
  const [reload, setReload] = useState(0);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => loadGoals())
      .then((data) => {
        if (cancelled) return;
        setToday(data.today);
        setMinDate(data.minExamDate);
        setDemoMode(data.demoMode);
        if (data.profile) {
          const profile = data.profile;
          setTargetBand(String(profile.targetBand));
          setExamDate(profile.examDate);
          setDailyTime(profile.dailyStudyMinutes);
          setUseScores(profile.useExistingScores);
          setScores(
            profile.scores
              ? (Object.fromEntries(
                  SKILLS.map((s) => [s, String(profile.scores![s])]),
                ) as ScoreDraft)
              : EMPTY_SCORES,
          );
        }
      })
      .catch(() => {
        if (!cancelled)
          setLoadError(
            "Không tải được mục tiêu từ tài khoản. Hãy thử lại.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const completeScores = useScores && SKILLS.every((s) => scores[s] !== "");
  const numericScores = completeScores
    ? (Object.fromEntries(SKILLS.map((s) => [s, Number(scores[s])])) as Scores)
    : null;
  const currentBand = numericScores ? overallBand(numericScores) : null;
  const warning = targetBand
    ? goalWarning(Number(targetBand), currentBand)
    : null;
  const days =
    examDate && examDate >= today
      ? Math.round(
          (Date.parse(`${examDate}T00:00:00Z`) -
            Date.parse(`${today}T00:00:00Z`)) /
            86400000,
        )
      : null;
  const completed =
    Number(Boolean(targetBand)) +
    Number(Boolean(examDate && examDate >= minDate)) +
    Number(dailyTime !== null);
  const studyLabel = STUDY_OPTIONS.find((o) => o.value === dailyTime)?.label;
  const id = (name: string) => `${formId}-${name}`;
  function changed(field: keyof FieldErrors) {
    setSaved(false);
    setError("");
    setErrors((previous) => ({ ...previous, [field]: undefined }));
  }
  function fieldError(field: keyof FieldErrors) {
    return errors[field] ? (
      <p className="field-error" id={id(`${field}-error`)}>
        {errors[field]}
      </p>
    ) : null;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSaved(false);
    const input = {
      targetBand: targetBand ? Number(targetBand) : null,
      examDate,
      dailyStudyMinutes: dailyTime,
      useExistingScores: useScores,
      scores: useScores
        ? Object.fromEntries(
            SKILLS.map((s) => [s, scores[s] === "" ? null : Number(scores[s])]),
          )
        : null,
    };
    const submissionToday = todayInVietnam();
    setToday(submissionToday);
    setMinDate(addDays(submissionToday, 7));
    const validation = validateGoals(input, submissionToday);
    if (!validation.ok) {
      setErrors(validation.errors);
      setError("Vui lòng hoàn thành các thông tin được đánh dấu trên form.");
      requestAnimationFrame(() => {
        document.getElementById(id(Object.keys(validation.errors)[0]))?.focus();
      });
      return;
    }
    setErrors({});
    setSaving(true);
    try {
      const result = await saveGoals(validation.data);
      if (result.error) {
        setError(result.error);
        return;
      }
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Chưa lưu được mục tiêu. Vui lòng thử lại, thông tin bạn nhập vẫn được giữ lại.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell active={settings ? "settings" : "goals"} demoMode={demoMode}>
      <div className="breadcrumb">
        <span>US-102</span>
        <Icon name="chevron" size={12} />
        <span>{settings ? "Cài đặt mục tiêu" : "Khảo sát mục tiêu"}</span>
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <span />
            {settings ? "MỤC TIÊU CỦA BẠN" : "MỘT KHỞI ĐẦU, NHIỀU KHẢ NĂNG"}
          </span>
          <h1>
            {settings ? (
              "Điều chỉnh mục tiêu học tập"
            ) : (
              <>
                Chặng đường mới, <span>mục tiêu mới.</span>
              </>
            )}
          </h1>
          <p>
            {settings
              ? "Kế hoạch thay đổi? Cập nhật mục tiêu để hành trình luôn phù hợp với bạn."
              : "Dành một phút chia sẻ mục tiêu. Cùng tạo nên hành trình IELTS dành riêng cho bạn."}
          </p>
        </div>
        <span className="heading-detail">
          <Icon name="clock" size={16} /> Chỉ khoảng 1 phút
        </span>
      </div>
      {!settings && (
        <ol className="stepper" aria-label="Các bước thiết lập lộ trình">
          <li className="current" aria-current="step">
            <span className="step-number">01</span>
            <span>
              <strong>Đặt mục tiêu</strong>
              <small>Bạn muốn đi đến đâu?</small>
            </span>
          </li>
          <li>
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
      )}
      {loading ? (
        <div className="loading-card" role="status">
          <span className="spinner" />
          Đang tải mục tiêu của bạn…
        </div>
      ) : loadError ? (
        <div className="load-error" role="alert">
          <Icon name="info" />
          <h2>Chưa thể tải thông tin</h2>
          <p>{loadError}</p>
          <button
            className="primary-button"
            onClick={() => {
              setLoading(true);
              setLoadError("");
              setReload((v) => v + 1);
            }}
          >
            Thử lại
          </button>
        </div>
      ) : (
        <div className="survey-layout">
          <form
            className="survey-card"
            onSubmit={submit}
            noValidate
            aria-label={
              settings ? "Cập nhật mục tiêu IELTS" : "Khảo sát mục tiêu IELTS"
            }
            aria-busy={saving}
          >
            <div className="card-intro">
              <div className="section-icon">
                <Icon name="target" size={24} />
              </div>
              <div>
                <h2>Thiết kế mục tiêu của bạn</h2>
                <p>Mỗi mục tiêu rõ ràng là một bước gần hơn đến thành công.</p>
              </div>
              <span className="required-note">* Bắt buộc</span>
            </div>
            <fieldset disabled={saving} className="form-fields">
              <section className="form-section">
                <div className="field-heading">
                  <span className="field-number">01</span>
                  <div>
                    <label htmlFor={id("targetBand")}>
                      Band điểm bạn muốn chinh phục{" "}
                      <span className="required">*</span>
                    </label>
                    <p>Một đích đến cụ thể sẽ giúp bạn học đúng hướng.</p>
                  </div>
                </div>
                <div className="target-input-row">
                  <div className="select-wrap">
                    <Icon name="target" />
                    <select
                      id={id("targetBand")}
                      value={targetBand}
                      required
                      aria-invalid={!!errors.targetBand}
                      aria-describedby={
                        errors.targetBand ? id("targetBand-error") : undefined
                      }
                      onChange={(e) => {
                        setTargetBand(e.target.value);
                        changed("targetBand");
                      }}
                    >
                      <option value="" disabled>
                        Chọn band mục tiêu
                      </option>
                      {TARGET_BANDS.map((band) => (
                        <option key={band} value={band}>
                          {band.toFixed(1)} IELTS
                        </option>
                      ))}
                    </select>
                  </div>
                  <span className="field-hint">
                    Bước nhỏ hôm nay,
                    <br />
                    band điểm lớn ngày mai.
                  </span>
                </div>
                {fieldError("targetBand")}
              </section>
              <section className="form-section">
                <div className="field-heading">
                  <span className="field-number">02</span>
                  <div>
                    <label htmlFor={id("examDate")}>
                      Bạn dự định thi khi nào?{" "}
                      <span className="required">*</span>
                    </label>
                    <p>Chọn ngày thi để phân bổ thời gian học phù hợp.</p>
                  </div>
                </div>
                <div className="date-input-wrap">
                  <input
                    id={id("examDate")}
                    type="date"
                    min={minDate}
                    max="9999-12-31"
                    required
                    value={examDate}
                    aria-invalid={!!errors.examDate}
                    aria-describedby={`${id("date-help")} ${errors.examDate ? id("examDate-error") : ""}`}
                    onChange={(e) => {
                      setExamDate(e.target.value);
                      changed("examDate");
                    }}
                  />
                </div>
                <p className="input-help" id={id("date-help")}>
                  <Icon name="info" size={14} />
                  Sớm nhất là {formatDate(minDate)} · Ít nhất 7 ngày kể từ hôm
                  nay.
                </p>
                {fieldError("examDate")}
              </section>
              <section className="form-section study-section">
                <div className="field-heading">
                  <span className="field-number">03</span>
                  <div id={id("dailyTime-label")}>
                    <h3>
                      Mỗi ngày bạn có thể học bao lâu?{" "}
                      <span className="required">*</span>
                    </h3>
                    <p>
                      Đều đặn quan trọng hơn hoàn hảo. Chọn nhịp học phù hợp với
                      bạn.
                    </p>
                  </div>
                </div>
                <div
                  className="study-options"
                  role="radiogroup"
                  aria-labelledby={id("dailyTime-label")}
                  aria-required="true"
                  aria-invalid={!!errors.dailyStudyMinutes}
                  aria-describedby={
                    errors.dailyStudyMinutes
                      ? id("dailyStudyMinutes-error")
                      : undefined
                  }
                >
                  {STUDY_OPTIONS.map((option, index) => (
                    <label
                      className={`study-option ${dailyTime === option.value ? "selected" : ""}`}
                      key={option.value}
                    >
                      <input
                        type="radio"
                        id={index === 0 ? id("dailyStudyMinutes") : undefined}
                        name="dailyStudyMinutes"
                        value={option.value}
                        checked={dailyTime === option.value}
                        required
                        onChange={() => {
                          setDailyTime(option.value);
                          changed("dailyStudyMinutes");
                        }}
                      />
                      <span className="study-radio" />
                      <strong>{option.label}</strong>
                      <small>{option.caption}</small>
                    </label>
                  ))}
                </div>
                {fieldError("dailyStudyMinutes")}
              </section>
              <section
                className={`existing-scores ${useScores ? "expanded" : ""}`}
              >
                <label className="existing-toggle">
                  <input
                    type="checkbox"
                    checked={useScores}
                    aria-controls={id("scores-panel")}
                    aria-expanded={useScores}
                    onChange={(e) => {
                      setUseScores(e.target.checked);
                      setSaved(false);
                      setErrors({});
                      setError("");
                    }}
                  />
                  <span>
                    <strong>Mình đã có điểm IELTS gần đây</strong>
                    <small>
                      Sử dụng điểm của bạn và bỏ qua bài kiểm tra đầu vào.
                    </small>
                  </span>
                  <Icon name="chevron" size={18} />
                </label>
                {useScores && (
                  <div className="scores-panel" id={id("scores-panel")}>
                    <p>Nhập đủ điểm 4 kỹ năng trong kết quả gần đây của bạn.</p>
                    <div className="score-grid">
                      {SKILLS.map((skill) => (
                        <div key={skill}>
                          <label htmlFor={id(skill)}>
                            {skill[0].toUpperCase() + skill.slice(1)}{" "}
                            <span className="required">*</span>
                          </label>
                          <select
                            id={id(skill)}
                            value={scores[skill]}
                            required
                            aria-invalid={!!errors[skill]}
                            aria-describedby={
                              errors[skill] ? id(`${skill}-error`) : undefined
                            }
                            onChange={(e) => {
                              setScores((s) => ({
                                ...s,
                                [skill]: e.target.value,
                              }));
                              changed(skill);
                            }}
                          >
                            <option value="" disabled>
                              Chọn điểm
                            </option>
                            {SCORE_BANDS.map((band) => (
                              <option key={band} value={band}>
                                {band.toFixed(1)}
                              </option>
                            ))}
                          </select>
                          {fieldError(skill)}
                        </div>
                      ))}
                    </div>
                    {currentBand !== null && (
                      <div className="overall-result">
                        <Icon name="check" size={16} /> Overall của bạn:{" "}
                        <strong>{currentBand.toFixed(1)}</strong>
                        <span>Điểm tự khai báo</span>
                      </div>
                    )}
                  </div>
                )}
              </section>
              {fieldError("scores")}
              {fieldError("useExistingScores")}
              {warning && (
                <div className="warning-box" role="status">
                  <Icon name="info" />
                  <p>{warning}</p>
                </div>
              )}
            </fieldset>
            <div className="form-footer">
              {error && (
                <div className="error-box" role="alert">
                  <Icon name="info" />
                  <p>{error}</p>
                </div>
              )}
              {saved && (
                <div className="success-box" role="status">
                  <Icon name="check" />
                  <p>
                    Đã lưu mục tiêu.{" "}
                    <Link href="/dashboard" className="underline">Tiếp tục tới Dashboard</Link>
                  </p>
                </div>
              )}
              <div className="submit-row">
                <span>
                  <Icon name="shield" size={17} />
                  Bạn có thể thay đổi bất cứ lúc nào.
                </span>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <span className="spinner" />
                      Đang lưu…
                    </>
                  ) : (
                    <>
                      {settings ? "Lưu thay đổi" : "Lưu mục tiêu"}
                      <Icon name="check" size={19} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          <aside className="summary-column" aria-label="Tóm tắt mục tiêu">
            <div className="goal-preview">
              <div className="preview-top">
                <span>
                  <Icon name="sparkle" size={16} />
                  HÀNH TRÌNH CỦA RIÊNG BẠN
                </span>
                <span>•••</span>
              </div>
              <div className="band-orbit">
                <div className="orbit-dot dot-one" />
                <div className="orbit-dot dot-two" />
                <div className="band-display">
                  <small>MỤC TIÊU IELTS</small>
                  <strong>
                    {targetBand ? Number(targetBand).toFixed(1) : "—"}
                    <span> / 9.0</span>
                  </strong>
                  <span className="band-caption">Your next milestone</span>
                </div>
                <span className="orbit-spark">✦</span>
              </div>
              <div className="preview-rows">
                <div>
                  <span>
                    <Icon name="calendar" size={17} />
                    Ngày về đích
                  </span>
                  <strong>
                    {examDate ? formatDate(examDate) : "Chờ bạn chọn"}
                  </strong>
                </div>
                <div>
                  <span>
                    <Icon name="clock" size={17} />
                    Nhịp học mỗi ngày
                  </span>
                  <strong>{studyLabel || "Chờ bạn chọn"}</strong>
                </div>
                {currentBand !== null && (
                  <div>
                    <span>
                      <Icon name="flag" size={17} />
                      Band hiện tại
                    </span>
                    <strong>{currentBand.toFixed(1)}</strong>
                  </div>
                )}
              </div>
              <div className="preview-countdown">
                {days !== null && days >= 7 ? (
                  <>
                    <span className="countdown-number">{days}</span>
                    <span>
                      ngày để tiến gần hơn
                      <br />
                      đến mục tiêu của bạn
                    </span>
                  </>
                ) : (
                  <>
                    <Icon name="route" size={25} />
                    <span>
                      Một kế hoạch tốt bắt đầu
                      <br />
                      từ một mục tiêu rõ ràng.
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="journey-note">
              <span className="note-icon">
                <Icon name="book" size={23} />
              </span>
              <h3>Học theo cách của bạn</h3>
              <p>
                Mục tiêu, trình độ và quỹ thời gian sẽ là nền tảng cho lộ trình
                IELTS phù hợp với bạn.
              </p>
              <div className="note-line">
                <span />
                <span />
                <span />
              </div>
              <small>
                <Icon name="check" size={14} /> Chỉ tập trung vào điều bạn cần
              </small>
            </div>
            <div className="completion-note">
              <span>{completed}/3 thông tin mục tiêu</span>
              <div
                className="completion-track"
                role="progressbar"
                aria-label="Mức độ hoàn thành khảo sát"
                aria-valuemin={0}
                aria-valuemax={3}
                aria-valuenow={completed}
              >
                <span style={{ width: `${(completed / 3) * 100}%` }} />
              </div>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
