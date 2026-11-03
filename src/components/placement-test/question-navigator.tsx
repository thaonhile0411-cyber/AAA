"use client";

type QuestionItem = {
  id: string;
  label: string | number;
  isAnswered: boolean;
  part?: number;
  isActive?: boolean;
};

type QuestionNavigatorProps = {
  questions?: QuestionItem[];
  items?: QuestionItem[];
  activeId?: string;
  onSelectQuestion?: (id: string) => void;
  onSelect?: (id: string) => void;
  title?: string;
};

export function QuestionNavigator({
  questions,
  items,
  activeId,
  onSelectQuestion,
  onSelect,
  title = "Danh sách câu hỏi",
}: QuestionNavigatorProps) {
  const list = questions || items || [];
  const selectHandler = onSelectQuestion || onSelect || (() => {});

  const answeredCount = list.filter((q) => q.isAnswered).length;
  const totalCount = list.length;
  const percentage =
    totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white border border-[#e6eaf1] rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#6d7890]">
          {title}
        </h4>
        <span className="text-xs font-semibold text-[#175cdd]">
          {answeredCount}/{totalCount} ({percentage}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-[#edf1f7] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[#175cdd] rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Question Pills Grid */}
      <div className="grid grid-cols-5 gap-2">
        {list.map((q) => {
          const isActive = q.isActive ?? (activeId ? q.id === activeId : false);
          const isAnswered = q.isAnswered;

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => selectHandler(q.id)}
              className={`h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                isActive
                  ? "bg-[#175cdd] text-white ring-2 ring-[#175cdd]/30 shadow-sm"
                  : isAnswered
                    ? "bg-[#eef6ff] text-[#175cdd] border border-[#bcd7ff] hover:bg-[#dfeeff]"
                    : "bg-[#f8fafc] text-[#64748b] border border-[#e2e8f0] hover:bg-[#edf2f7]"
              }`}
              title={`Câu ${q.label}: ${isAnswered ? "Đã trả lời" : "Chưa trả lời"}`}
              aria-label={`Câu hỏi ${q.label}`}
            >
              {q.label}
              {isAnswered && !isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#175cdd] ml-1" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-[#f1f4f9] text-[11px] text-[#8c97a8]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#175cdd]" /> Đang xem
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#eef6ff] border border-[#bcd7ff]" /> Đã làm
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded bg-[#f8fafc] border border-[#e2e8f0]" /> Chưa làm
        </span>
      </div>
    </div>
  );
}
