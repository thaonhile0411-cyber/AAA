"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  ALL_LISTENING_QUESTIONS,
  COMBINED_LISTENING_AUDIO_SCRIPT,
} from "@/data/placement-test-data";
import { AudioSpeechPlayer } from "./audio-speech-player";
import { QuestionNavigator } from "./question-navigator";

type ListeningSectionProps = {
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, answer: string) => void;
  onNextSection: () => void;
};

export function ListeningSection({
  answers,
  onAnswerChange,
  onNextSection,
}: ListeningSectionProps) {
  const [activeQuestionId, setActiveQuestionId] = useState<string>("L1");
  const [showIncompleteWarning, setShowIncompleteWarning] = useState(false);

  const totalQuestions = ALL_LISTENING_QUESTIONS.length;
  const answeredCount = ALL_LISTENING_QUESTIONS.filter((q) =>
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

  const navItems = ALL_LISTENING_QUESTIONS.map((q) => ({
    id: q.id,
    label: q.questionNumber,
    isAnswered: Boolean(answers[q.id]?.trim()),
    isActive: q.id === activeQuestionId,
  }));

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eaf1] pb-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#11213f] m-0">
            Listening Section
          </h2>
          <p className="text-xs text-[#64748b] m-0 mt-0.5">
            Nghe bài ghi âm và trả lời liên tục toàn bộ 10 câu hỏi bên dưới
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-[#175cdd] bg-[#edf3ff] px-3 py-1 rounded-full border border-[#d6e4fd]">
            {answeredCount}/{totalQuestions} câu đã làm
          </span>
        </div>
      </div>

      {/* Single Audio Player */}
      <AudioSpeechPlayer script={COMBINED_LISTENING_AUDIO_SCRIPT} />

      {/* Main Grid: Left = 10 Questions, Right = Question Navigator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: All 10 Questions Continuously (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {ALL_LISTENING_QUESTIONS.map((q) => {
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
                      {q.type === "fill_blank"
                        ? "Form Completion · Điền từ"
                        : "Multiple Choice · Trắc nghiệm"}
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

                {/* Context if available */}
                {q.context && (
                  <div className="text-xs text-[#52637a] bg-[#f8fafc] p-3 rounded-xl border border-[#edf0f5] mb-3 leading-relaxed">
                    {q.context}
                  </div>
                )}

                {/* Input Controls */}
                {q.type === "multiple_choice" && q.options && (
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
                            name={`listening-${q.id}`}
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

                {q.type === "fill_blank" && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={currentAnswer}
                      onChange={(e) => onAnswerChange(q.id, e.target.value)}
                      placeholder="Nhập câu trả lời (tối đa 2 từ hoặc 1 số)..."
                      className="w-full p-3 rounded-xl border border-[#dce3ee] text-xs focus:border-[#175cdd] focus:ring-2 focus:ring-[#175cdd]/15 outline-none font-medium bg-white"
                    />
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
              <span>Hoàn thành Listening & Tiếp tục</span>
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>

        {/* Right Column: Question Navigator (4 cols) */}
        <div className="lg:col-span-4 sticky top-4 space-y-4">
          <QuestionNavigator
            title="Listening (10 câu)"
            items={navItems}
            onSelect={handleSelectQuestion}
          />
        </div>
      </div>

      {/* Warning Modal if Incomplete (Strict validation) */}
      {showIncompleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e6eaf1] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Icon name="alert" size={24} />
              <h3 className="text-base font-bold text-[#11213f] m-0">
                Chưa hoàn thành kỹ năng Listening
              </h3>
            </div>
            <p className="text-xs md:text-sm text-[#475569] leading-relaxed m-0">
              Bạn còn <strong>{remainingCount} câu hỏi</strong> Listening chưa trả lời. Vui lòng hoàn thành tất cả câu hỏi trước khi chuyển sang kỹ năng tiếp theo.
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
