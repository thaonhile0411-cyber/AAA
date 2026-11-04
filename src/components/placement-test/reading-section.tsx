"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  ALL_READING_QUESTIONS,
  READING_PARTS,
} from "@/data/placement-test-data";
import { QuestionNavigator } from "./question-navigator";

type ReadingSectionProps = {
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onNextSection: () => void;
};

export function ReadingSection({
  answers,
  onAnswerChange,
  onNextSection,
}: ReadingSectionProps) {
  const [activeQuestionId, setActiveQuestionId] = useState<string>("R1");
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const totalQuestions = ALL_READING_QUESTIONS.length;
  const answeredCount = ALL_READING_QUESTIONS.filter((q) =>
    Boolean(answers[q.id]?.trim()),
  ).length;
  const remainingCount = totalQuestions - answeredCount;

  function handleSelectQuestion(id: string) {
    setActiveQuestionId(id);
    const element = document.getElementById(`q-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function handleCompleteSection() {
    if (answeredCount < totalQuestions) {
      setShowIncompleteWarning(true);
      return;
    }
    onNextSection();
  }

  const navItems = ALL_READING_QUESTIONS.map((q) => ({
    id: q.id,
    label: q.questionNumber,
    isAnswered: Boolean(answers[q.id]?.trim()),
    isActive: q.id === activeQuestionId,
  }));

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eaf1] pb-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#11213f] m-0">
            Reading Section
          </h2>
          <p className="text-xs text-[#64748b] m-0 mt-0.5">
            Đọc bài bên cột trái và trả lời 12 câu hỏi bên cột phải (cuộn độc lập)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#175cdd] bg-[#edf3ff] px-3 py-1 rounded-full border border-[#d6e4fd]">
            {answeredCount}/{totalQuestions} câu đã làm
          </span>
        </div>
      </div>

      {/* Main Grid: 2 Independent Scrollable Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: All Passages Continuously (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-[#e6eaf1] rounded-2xl p-6 shadow-xs overflow-y-auto max-h-[75vh] space-y-8">
          {READING_PARTS.map((p) => (
            <article key={p.part} className="space-y-4">
              <div className="border-b border-[#edf0f5] pb-3">
                <span className="text-xs font-bold text-[#175cdd] uppercase tracking-wider bg-[#edf3ff] px-2.5 py-1 rounded-md">
                  Reading Passage {p.part}
                </span>
                <h3 className="text-base font-bold text-[#11213f] mt-2 mb-1">
                  {p.passageTitle}
                </h3>
                {p.passageSubtitle && (
                  <p className="text-xs text-[#64748b] italic m-0">
                    {p.passageSubtitle}
                  </p>
                )}
              </div>

              {/* Headings List if available */}
              {p.headingsList && (
                <div className="p-4 bg-[#f8faff] rounded-xl border border-[#dbe6f5] space-y-2">
                  <h4 className="text-xs font-bold text-[#11213f] uppercase tracking-wider">
                    List of Headings
                  </h4>
                  <div className="grid grid-cols-1 gap-1 text-xs text-[#334155]">
                    {p.headingsList.map((h) => (
                      <div key={h.label} className="flex items-start gap-2">
                        <span className="font-bold text-[#175cdd] min-w-5">
                          {h.label}.
                        </span>
                        <span>{h.heading}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Paragraphs */}
              <div className="space-y-3 text-xs md:text-sm text-[#1e293b] leading-relaxed">
                {p.paragraphs.map((para, pIdx) => (
                  <p key={pIdx} className="m-0 text-justify">
                    {para.label && (
                      <span className="font-bold text-[#175cdd] mr-2">
                        [{para.label}]
                      </span>
                    )}
                    {para.text}
                  </p>
                ))}
              </div>
            </article>
          ))}
        </div>

        {/* Right Column: All 12 Questions (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Question Navigator */}
          <QuestionNavigator
            title="Reading (12 câu)"
            items={navItems}
            onSelect={handleSelectQuestion}
          />

          {/* All 12 Questions Continuously */}
          <div className="overflow-y-auto max-h-[62vh] space-y-4 pr-1">
            {ALL_READING_QUESTIONS.map((q) => {
              const currentAnswer = answers[q.id] || "";
              const isAnswered = Boolean(currentAnswer.trim());
              const isActive = q.id === activeQuestionId;

              return (
                <div
                  key={q.id}
                  id={`q-${q.id}`}
                  onClick={() => setActiveQuestionId(q.id)}
                  className={`bg-white border rounded-2xl p-5 shadow-xs transition-all ${
                    isActive
                      ? "border-[#175cdd] ring-2 ring-[#175cdd]/15"
                      : isAnswered
                        ? "border-[#cce5d9] bg-[#fcfefd]"
                        : "border-[#e6eaf1]"
                  }`}
                >
                  {/* Question Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center ${
                          isActive
                            ? "bg-[#175cdd] text-white"
                            : isAnswered
                              ? "bg-[#eefaf4] text-[#147054] border border-[#bce4d6]"
                              : "bg-[#edf1f7] text-[#64748b]"
                        }`}
                      >
                        {q.questionNumber}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#8a95a7]">
                        {q.type === "multiple_choice"
                          ? "Multiple Choice · Trắc nghiệm"
                          : q.type === "true_false_not_given"
                            ? "True / False / Not Given"
                            : "Matching Headings · Nối tiêu đề"}
                      </span>
                    </div>

                    {isAnswered && (
                      <span className="text-[11px] font-semibold text-[#147054] bg-[#eefaf4] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Icon name="check" size={12} />
                        Đã trả lời
                      </span>
                    )}
                  </div>

                  {/* Prompt */}
                  <div className="text-sm font-semibold text-[#11213f] mb-3 leading-relaxed">
                    {q.prompt}
                  </div>

                  {/* Options */}
                  {q.options && (
                    <div className="space-y-2 mt-2">
                      {q.options.map((opt) => {
                        const isSelected = currentAnswer === opt.label;
                        return (
                          <label
                            key={opt.label}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                              isSelected
                                ? "bg-[#edf3ff] border-[#175cdd] text-[#11213f] font-semibold"
                                : "bg-white border-[#e6eaf1] text-[#334155] hover:bg-[#f8fafc]"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`reading-${q.id}`}
                              value={opt.label}
                              checked={isSelected}
                              onChange={() => onAnswerChange(q.id, opt.label)}
                              className="mt-0.5 text-[#175cdd] focus:ring-[#175cdd]"
                            />
                            <span className="font-bold text-[#175cdd]">
                              {opt.label}.
                            </span>
                            <span className="leading-relaxed">{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Action Row */}
            <div className="pt-4 flex flex-wrap items-center justify-end gap-4 border-t border-[#edf0f5]">
              <button
                type="button"
                onClick={handleCompleteSection}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#175cdd] hover:bg-[#104dc1] text-white text-xs md:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <span>Hoàn thành Reading & Tiếp tục</span>
                <Icon name="arrow" size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Warning Modal if Incomplete (Strict validation) */}
      {showIncompleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e6eaf1] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Icon name="alert" size={24} />
              <h3 className="text-base font-bold text-[#11213f] m-0">
                Chưa hoàn thành kỹ năng Reading
              </h3>
            </div>
            <p className="text-xs md:text-sm text-[#475569] leading-relaxed m-0">
              Bạn còn <strong>{remainingCount} câu hỏi</strong> Reading chưa trả lời. Vui lòng hoàn thành tất cả câu hỏi trước khi chuyển sang kỹ năng tiếp theo.
            </p>
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowIncompleteWarning(false)}
                className="px-5 py-2.5 bg-[#175cdd] hover:bg-[#104dc1] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Ở lại làm tiếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
