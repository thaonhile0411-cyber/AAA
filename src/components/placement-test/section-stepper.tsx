"use client";

import { Icon } from "@/components/icon";
import type { TestSkill } from "@/types/placement-test";

type SectionStepperProps = {
  currentSkill: TestSkill;
  completedSkills: TestSkill[];
  answeredCountMap: Record<TestSkill, { answered: number; total: number }>;
  onSelectSkill?: (skill: TestSkill) => void;
};

const SKILL_INFO: {
  key: TestSkill;
  label: string;
  icon: "headphones" | "book" | "edit" | "mic";
  subtitle: string;
}[] = [
  {
    key: "listening",
    label: "Listening",
    icon: "headphones",
    subtitle: "10 câu hỏi",
  },
  {
    key: "reading",
    label: "Reading",
    icon: "book",
    subtitle: "12 câu hỏi",
  },
  {
    key: "writing",
    label: "Writing",
    icon: "edit",
    subtitle: "1 Task · Essay",
  },
  {
    key: "speaking",
    label: "Speaking",
    icon: "mic",
    subtitle: "3 Parts · Ghi âm",
  },
];

export function SectionStepper({
  currentSkill,
  completedSkills,
  answeredCountMap,
  onSelectSkill,
}: SectionStepperProps) {
  return (
    <div
      className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 select-none"
      aria-label="Tiến trình 4 kỹ năng"
    >
      {SKILL_INFO.map((item, index) => {
        const isCompleted = completedSkills.includes(item.key);
        const isActive = item.key === currentSkill;
        const isAccessible = isCompleted || isActive;
        const counts = answeredCountMap[item.key] || { answered: 0, total: 1 };

        return (
          <button
            key={item.key}
            type="button"
            disabled={!isAccessible}
            onClick={() => {
              if (isAccessible && onSelectSkill) {
                onSelectSkill(item.key);
              }
            }}
            className={`flex flex-col text-left p-3.5 rounded-xl border transition-all relative overflow-hidden text-inherit ${
              isActive
                ? "bg-white border-[#175cdd] shadow-md ring-2 ring-[#175cdd]/15 cursor-pointer"
                : isCompleted
                  ? "bg-[#fafdfe] border-[#cce8dc] shadow-2xs hover:border-[#34aa8b] cursor-pointer"
                  : "bg-[#f8fafc] border-[#e6eaf1] opacity-55 cursor-not-allowed"
            }`}
          >
            {/* Top row */}
            <div className="flex items-center justify-between gap-2 mb-2 w-full">
              <div className="flex items-center gap-2">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    isActive
                      ? "bg-[#175cdd] text-white"
                      : isCompleted
                        ? "bg-[#eefaf4] text-[#147054] border border-[#bce4d6]"
                        : "bg-[#edf1f7] text-[#8b95a8]"
                  }`}
                >
                  {isCompleted ? (
                    <Icon name="check" size={14} />
                  ) : (
                    `0${index + 1}`
                  )}
                </span>
                <span
                  className={`font-bold text-sm ${
                    isActive
                      ? "text-[#175cdd]"
                      : isCompleted
                        ? "text-[#11213f]"
                        : "text-[#64748b]"
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {/* Status visual cue (No text labels) */}
              {isCompleted ? (
                <span className="w-2.5 h-2.5 rounded-full bg-[#147054] flex-shrink-0" />
              ) : isActive ? (
                <span className="w-2.5 h-2.5 rounded-full bg-[#175cdd] animate-pulse flex-shrink-0" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-[#cbd5e1] flex-shrink-0" />
              )}
            </div>

            {/* Bottom info */}
            <div className="flex items-center justify-between text-xs text-[#6d7890] mt-auto pt-1 w-full">
              <span>{item.subtitle}</span>
              <span className="font-semibold text-[#1e2c46]">
                {!isAccessible ? "—" : `${counts.answered}/${counts.total}`}
              </span>
            </div>

            {/* Progress line */}
            <div className="w-full h-1 bg-[#edf0f5] rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isCompleted
                    ? "bg-[#34aa8b]"
                    : isActive
                      ? "bg-[#175cdd]"
                      : "bg-transparent"
                }`}
                style={{
                  width: `${
                    isCompleted
                      ? 100
                      : isAccessible && counts.total > 0
                        ? Math.min(100, (counts.answered / counts.total) * 100)
                        : 0
                  }%`,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
