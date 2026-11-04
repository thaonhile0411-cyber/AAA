"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icon";
import { countWords } from "@/lib/placement-scoring";
import type { PlacementTestAnswers, TestSkill } from "@/types/placement-test";

type ReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirmSubmit: () => void;
  answers: PlacementTestAnswers;
  onNavigateSkill?: (skill: TestSkill) => void;
  isSubmitting?: boolean;
  evaluationStep?: string;
};

export function ReviewModal({
  isOpen,
  onClose,
  onConfirmSubmit,
  answers,
  onNavigateSkill,
  isSubmitting = false,
  evaluationStep = "",
}: ReviewModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isSubmitting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  // Counts
  const listeningAnswered = Object.values(answers.listening).filter((v) =>
    Boolean(v?.trim()),
  ).length;
  const listeningTotal = 10;
  const listeningRemaining = listeningTotal - listeningAnswered;

  const readingAnswered = Object.values(answers.reading).filter((v) =>
    Boolean(v?.trim()),
  ).length;
  const readingTotal = 12;
  const readingRemaining = readingTotal - readingAnswered;

  const t2Words = countWords(answers.writing.task2 || "");
  const writingIncomplete = t2Words < 150; // At least reasonable essay substance

  const speakingRecordingsCount = Object.values(
    answers.speakingRecordings,
  ).filter((v) => v?.hasRecorded).length;
  const speakingTotal = 6;
  const speakingRemaining = speakingTotal - speakingRecordingsCount;

  const hasIncomplete =
    listeningRemaining > 0 ||
    readingRemaining > 0 ||
    writingIncomplete ||
    speakingRemaining > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#e2e8f0] space-y-5 animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#eff5ff] text-[#175cdd] flex items-center justify-center">
              <Icon name="shield" size={18} />
            </div>
            <div>
              <h3
                id="review-modal-title"
                className="text-base font-bold text-[#11213f]"
              >
                Kiểm tra bài làm trước khi nộp
              </h3>
              <p className="text-xs text-[#64748b]">
                Xác nhận hoàn thành 4 kỹ năng IELTS Academic
              </p>
            </div>
          </div>

          {!isSubmitting && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#94a3b8] hover:text-[#334155] rounded-lg transition-colors cursor-pointer"
              aria-label="Đóng bảng xác nhận"
            >
              <Icon name="x" size={18} />
            </button>
          )}
        </div>

        {/* Evaluation Progress State (When Submitting) */}
        {isSubmitting ? (
          <div className="p-6 bg-[#f0f7ff] border border-[#bfdbfe] rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#175cdd] border-t-transparent animate-spin" />
            <div>
              <h4 className="text-sm font-bold text-[#11213f] mb-1">
                Đang xử lý và chấm điểm bài thi...
              </h4>
              <p className="text-xs text-[#175cdd] font-medium animate-pulse">
                {evaluationStep || "AI đang đánh giá bài thi với tiêu chí IELTS..."}
              </p>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Vui lòng không tắt hoặc tải lại trang trong quá trình này.
            </p>
          </div>
        ) : (
          <>
            {/* Warning if incomplete */}
            {hasIncomplete && (
              <div className="p-3.5 bg-[#fff8eb] border border-[#f5dfb8] rounded-xl flex items-start gap-2.5 text-xs text-[#925507]">
                <Icon name="alert" size={16} className="flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Chưa hoàn thành:</strong>
                  <span>
                    Bạn vẫn còn câu hỏi hoặc phần thi chưa hoàn thành. Vui lòng kiểm tra lại để hệ thống có thể chấm điểm chính xác.
                  </span>
                </div>
              </div>
            )}

            {/* Breakdown of 4 Skills */}
            <div className="space-y-2.5">
              {/* Listening */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fafbfd] border border-[#f1f4f9]">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#eff5ff] text-[#175cdd] flex items-center justify-center text-xs font-bold">
                    L
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#1e293b] block">
                      Listening
                    </span>
                    <span className="text-[11px] text-[#64748b]">
                      {listeningAnswered}/{listeningTotal} câu
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {listeningRemaining > 0 ? (
                    <span className="text-[11px] font-semibold text-[#dc2626] bg-[#fef2f2] px-2.5 py-1 rounded-full">
                      Còn {listeningRemaining} câu
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#147054] bg-[#eefaf4] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Icon name="check" size={12} />
                      10/10
                    </span>
                  )}
                  {onNavigateSkill && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateSkill("listening");
                        onClose();
                      }}
                      className="text-xs font-semibold text-[#175cdd] hover:underline px-2 py-1 cursor-pointer"
                    >
                      Kiểm tra
                    </button>
                  )}
                </div>
              </div>

              {/* Reading */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fafbfd] border border-[#f1f4f9]">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#eff5ff] text-[#175cdd] flex items-center justify-center text-xs font-bold">
                    R
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#1e293b] block">
                      Reading
                    </span>
                    <span className="text-[11px] text-[#64748b]">
                      {readingAnswered}/{readingTotal} câu
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {readingRemaining > 0 ? (
                    <span className="text-[11px] font-semibold text-[#dc2626] bg-[#fef2f2] px-2.5 py-1 rounded-full">
                      Còn {readingRemaining} câu
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#147054] bg-[#eefaf4] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Icon name="check" size={12} />
                      12/12
                    </span>
                  )}
                  {onNavigateSkill && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateSkill("reading");
                        onClose();
                      }}
                      className="text-xs font-semibold text-[#175cdd] hover:underline px-2 py-1 cursor-pointer"
                    >
                      Kiểm tra
                    </button>
                  )}
                </div>
              </div>

              {/* Writing */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fafbfd] border border-[#f1f4f9]">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#eff5ff] text-[#175cdd] flex items-center justify-center text-xs font-bold">
                    W
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#1e293b] block">
                      Writing (Task 2)
                    </span>
                    <span className="text-[11px] text-[#64748b]">
                      {t2Words}/250 từ
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {writingIncomplete ? (
                    <span className="text-[11px] font-semibold text-[#dc2626] bg-[#fef2f2] px-2.5 py-1 rounded-full">
                      Chưa đủ bài ({t2Words} từ)
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#147054] bg-[#eefaf4] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Icon name="check" size={12} />
                      Đã hoàn thành
                    </span>
                  )}
                  {onNavigateSkill && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateSkill("writing");
                        onClose();
                      }}
                      className="text-xs font-semibold text-[#175cdd] hover:underline px-2 py-1 cursor-pointer"
                    >
                      Kiểm tra
                    </button>
                  )}
                </div>
              </div>

              {/* Speaking */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#fafbfd] border border-[#f1f4f9]">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-[#eff5ff] text-[#175cdd] flex items-center justify-center text-xs font-bold">
                    S
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#1e293b] block">
                      Speaking
                    </span>
                    <span className="text-[11px] text-[#64748b]">
                      {speakingRecordingsCount}/{speakingTotal} phần đã ghi âm
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {speakingRemaining > 0 ? (
                    <span className="text-[11px] font-semibold text-[#dc2626] bg-[#fef2f2] px-2.5 py-1 rounded-full">
                      Còn {speakingRemaining} phần
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-[#147054] bg-[#eefaf4] px-2.5 py-1 rounded-full flex items-center gap-1">
                      <Icon name="check" size={12} />
                      6/6
                    </span>
                  )}
                  {onNavigateSkill && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateSkill("speaking");
                        onClose();
                      }}
                      className="text-xs font-semibold text-[#175cdd] hover:underline px-2 py-1 cursor-pointer"
                    >
                      Kiểm tra
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f1f5f9]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-[#52637a] bg-white border border-[#d8e0ec] rounded-lg hover:bg-[#f8fafc] transition-colors cursor-pointer"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                disabled={hasIncomplete}
                onClick={onConfirmSubmit}
                className={`px-5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5 ${
                  hasIncomplete
                    ? "bg-[#94a3b8] text-white cursor-not-allowed opacity-60"
                    : "bg-[#175cdd] hover:bg-[#104dc1] text-white cursor-pointer"
                }`}
              >
                <span>Xác nhận nộp bài</span>
                <Icon name="arrow" size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
