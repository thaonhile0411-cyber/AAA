"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { WRITING_TASKS } from "@/data/placement-test-data";
import { countWords } from "@/lib/placement-scoring";

type WritingSectionProps = {
  writingAnswers: {
    task1: string;
    task2: string;
  };
  onWritingChange: (task: "task1" | "task2", content: string) => void;
  onNextSection: () => void;
  disabled?: boolean;
};

export function WritingSection({
  writingAnswers,
  onWritingChange,
  onNextSection,
  disabled = false,
}: WritingSectionProps) {
  const [prevTask2, setPrevTask2] = useState(writingAnswers.task2);
  const [localText, setLocalText] = useState(writingAnswers.task2 || "");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving">("saved");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync state during render when prop changes externally
  if (writingAnswers.task2 !== prevTask2) {
    setPrevTask2(writingAnswers.task2);
    if (saveStatus === "saved") {
      setLocalText(writingAnswers.task2 || "");
    }
  }

  const task2 = WRITING_TASKS.find((t) => t.taskNumber === 2)!;
  const wordCount = countWords(localText);
  const minWords = task2.minWords; // 250
  const isTargetMet = wordCount >= minWords;

  function handleTextChange(val: string) {
    setLocalText(val);
    setSaveStatus("saving");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onWritingChange("task2", val);
      setSaveStatus("saved");
    }, 700);
  }

  function handleCompleteSection() {
    // Flush any pending save and proceed directly
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onWritingChange("task2", localText);
    setSaveStatus("saved");
    onNextSection();
  }

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eaf1] pb-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#11213f] m-0">
            Writing Section – Academic Essay
          </h2>
          <p className="text-xs text-[#64748b] m-0 mt-0.5">
            Viết một bài luận hoàn chỉnh tối thiểu 250 từ dựa trên đề bài bên dưới
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Subtle Autosave Status */}
          <div className="text-xs text-[#64748b] flex items-center gap-1.5 font-medium">
            {saveStatus === "saving" ? (
              <span className="flex items-center gap-1 text-[#175cdd]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#175cdd] animate-pulse" />
                Đang lưu...
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#147054]">
                <Icon name="check" size={12} />
                Đã lưu
              </span>
            )}
          </div>

          <div
            className={`text-xs font-bold px-3.5 py-1.5 rounded-full border ${
              isTargetMet
                ? "bg-[#eefaf4] text-[#147054] border-[#bce4d6]"
                : "bg-[#fffbeb] text-[#b45309] border-[#fde68a]"
            }`}
          >
            {wordCount} / {minWords} từ {isTargetMet && "✓"}
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Essay Prompt, Right = Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Prompt (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-[#e6eaf1] rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#175cdd] uppercase tracking-wider bg-[#edf3ff] px-2.5 py-1 rounded-md">
              IELTS Writing Task 2
            </span>
            <span className="text-xs text-[#64748b] font-medium">
              Tối thiểu 250 từ
            </span>
          </div>

          <h3 className="text-base font-bold text-[#11213f] m-0">
            Academic Essay Question
          </h3>

          <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] text-sm text-[#1e293b] leading-relaxed whitespace-pre-line font-medium">
            {task2.prompt}
          </div>

          <p className="text-xs text-[#64748b] leading-relaxed m-0 italic">
            {task2.instructions}
          </p>
        </div>

        {/* Right Column: Writing Editor (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-[#e6eaf1] rounded-2xl shadow-xs overflow-hidden flex flex-col h-[600px]">
          {/* Editor Header */}
          <div className="p-4 bg-[#f8faff] border-b border-[#e6eaf1] flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold text-[#11213f]">
              <Icon name="edit" size={16} className="text-[#175cdd]" />
              <span>Bài viết của bạn (Your Response)</span>
            </div>
            <div className="text-[11px] text-[#8c9bb3]">
              Tự động lưu sau khi nhập
            </div>
          </div>

          {/* Textarea Area */}
          <div className="p-4 flex-1 flex flex-col">
            <textarea
              value={localText}
              disabled={disabled}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Write your essay here in English... (Aim for at least 250 words)&#10;&#10;Introduction: Paraphrase topic & state your thesis&#10;Body Paragraph 1: Discuss first viewpoint with examples&#10;Body Paragraph 2: Discuss second viewpoint & your stance&#10;Conclusion: Summarize key arguments & final thoughts"
              className={`w-full flex-1 p-4 rounded-xl border border-[#dce3ee] text-sm text-[#1e2c46] leading-relaxed resize-none focus:border-[#175cdd] focus:ring-2 focus:ring-[#175cdd]/15 outline-none font-sans bg-white transition-all ${
                disabled ? "bg-gray-100 cursor-not-allowed opacity-65" : ""
              }`}
            />
          </div>

          {/* Editor Footer */}
          <div className="p-3.5 bg-[#f8fafc] border-t border-[#edf0f5] flex items-center justify-between text-xs text-[#64748b] flex-shrink-0">
            <span>
              Số từ hiện tại: <strong>{wordCount}</strong> / 250 từ
            </span>
            <span
              className={
                isTargetMet ? "text-emerald-600 font-bold" : "text-amber-600"
              }
            >
              {isTargetMet
                ? "✓ Đã đạt độ dài yêu cầu"
                : `Còn thiếu ${Math.max(0, minWords - wordCount)} từ`}
            </span>
          </div>
        </div>
      </div>

      {/* Action Row */}
      <div className="pt-4 flex flex-wrap items-center justify-end gap-4 border-t border-[#edf0f5]">
        <button
          type="button"
          onClick={handleCompleteSection}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#175cdd] hover:bg-[#104dc1] text-white text-xs md:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
        >
          <span>Hoàn thành Writing & Tiếp tục</span>
          <Icon name="arrow" size={16} />
        </button>
      </div>
    </div>
  );
}
