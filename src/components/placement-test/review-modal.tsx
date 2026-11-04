"use client";

import { useEffect } from "react";
import { Icon } from "@/components/icon";
import { getCompletionStatus } from "@/lib/placement-progress";
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

const SKILL_ROWS: {
  key: TestSkill;
  name: string;
  badgeLetter: string;
}[] = [
  { key: "listening", name: "Listening", badgeLetter: "L" },
  { key: "reading", name: "Reading", badgeLetter: "R" },
  { key: "writing", name: "Writing", badgeLetter: "W" },
  { key: "speaking", name: "Speaking", badgeLetter: "S" },
];

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

  const { hasIncomplete, skills } = getCompletionStatus(answers);

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
                className="text-base font-bold text-[#11213f] m-0"
              >
                Kiểm tra bài làm trước khi nộp
              </h3>
              <p className="text-xs text-[#64748b] m-0 mt-0.5">
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
            {/* Notice if incomplete: 7.5 requirement */}
            {hasIncomplete && (
              <div className="p-3.5 bg-[#fff8eb] border border-[#f5dfb8] rounded-xl flex items-start gap-2.5 text-xs text-[#925507]">
                <Icon name="alert" size={16} className="flex-shrink-0 mt-0.5" />
                <p className="m-0 leading-relaxed">
                  Bạn vẫn còn một số câu chưa hoàn thành. Bạn có thể quay lại kiểm tra hoặc nộp bài ngay.
                </p>
              </div>
            )}

            {/* Breakdown of 4 Skills: 7.2 & 7.3 simplified single line with 'Kiểm tra' button */}
            <div className="space-y-2.5">
              {SKILL_ROWS.map((row) => {
                const info = skills[row.key];
                return (
                  <div
                    key={row.key}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#fafbfd] border border-[#f1f4f9]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[#eff5ff] text-[#175cdd] flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {row.badgeLetter}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-[#1e293b] block">
                          {row.name}
                        </span>
                        <span className="text-xs text-[#64748b]">
                          {info.detailText}
                        </span>
                      </div>
                    </div>

                    {onNavigateSkill && (
                      <button
                        type="button"
                        onClick={() => {
                          onNavigateSkill(row.key);
                          onClose();
                        }}
                        className="text-xs font-semibold text-[#175cdd] hover:text-[#104dc1] hover:underline px-3 py-1.5 rounded-lg border border-[#d4e2f8] bg-white cursor-pointer transition-all"
                      >
                        Kiểm tra
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Modal Buttons: 7.5 Allows submitting incomplete */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#f1f5f9]">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-[#52637a] bg-white border border-[#d8e0ec] rounded-xl hover:bg-[#f8fafc] transition-colors cursor-pointer"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={onConfirmSubmit}
                className="px-5 py-2.5 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 bg-[#175cdd] hover:bg-[#104dc1] text-white cursor-pointer"
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
