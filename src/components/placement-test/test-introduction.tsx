"use client";

import { Icon } from "@/components/icon";

type TestIntroductionProps = {
  onStartTest: () => void;
};

export function TestIntroduction({ onStartTest }: TestIntroductionProps) {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-2">
      {/* Hero Title & Description */}
      <div className="text-center space-y-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-[#175cdd] bg-[#edf3ff] border border-[#d8e6fc]">
          <Icon name="sparkle" size={14} />
          BƯỚC 02 · IELTS DIAGNOSTIC TEST (DEMO)
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-[#11213f] tracking-tight">
          Discover Your <span>IELTS Level</span>
        </h1>
        <p className="text-sm sm:text-base text-[#64748b] max-w-2xl mx-auto leading-relaxed">
          Đánh giá toàn diện 4 kỹ năng Listening, Reading, Writing và Speaking theo
          chuẩn IELTS Academic. Hệ thống sẽ tự động xác định điểm mạnh, điểm cần cải
          thiện và đề xuất lộ trình học tập cá nhân hóa cho bạn.
        </p>
      </div>

      {/* 4 Skill Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Listening */}
        <div className="bg-white border border-[#e6eaf1] rounded-2xl p-5 shadow-xs hover:border-[#175cdd]/40 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#eff5ff] text-[#175cdd] flex items-center justify-center mb-3">
              <Icon name="headphones" size={20} />
            </div>
            <h3 className="font-bold text-base text-[#11213f] mb-1">Listening</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              4 Parts với 10 câu hỏi dạng điền từ và trắc nghiệm. Nghe audio tự
              động bằng giọng đọc chuẩn.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
            <span className="text-[#8c9bb3]">Thời gian</span>
            <span className="font-bold text-[#1e293b]">~ 15 phút</span>
          </div>
        </div>

        {/* Reading */}
        <div className="bg-white border border-[#e6eaf1] rounded-2xl p-5 shadow-xs hover:border-[#175cdd]/40 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#eff5ff] text-[#175cdd] flex items-center justify-center mb-3">
              <Icon name="book" size={20} />
            </div>
            <h3 className="font-bold text-base text-[#11213f] mb-1">Reading</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              3 Parts với 12 câu hỏi: Đọc hiểu học thuật, Matching Headings và
              True / False / Not Given.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
            <span className="text-[#8c9bb3]">Thời gian</span>
            <span className="font-bold text-[#1e293b]">~ 15 phút</span>
          </div>
        </div>

        {/* Writing */}
        <div className="bg-white border border-[#e6eaf1] rounded-2xl p-5 shadow-xs hover:border-[#175cdd]/40 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#eff5ff] text-[#175cdd] flex items-center justify-center mb-3">
              <Icon name="edit" size={20} />
            </div>
            <h3 className="font-bold text-base text-[#11213f] mb-1">Writing</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              2 Tasks: Mô tả biểu đồ năng lượng tái tạo (Task 1) và bài luận học
              thuật (Task 2) có bộ đếm từ tự động.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
            <span className="text-[#8c9bb3]">Thời gian</span>
            <span className="font-bold text-[#1e293b]">~ 20 phút</span>
          </div>
        </div>

        {/* Speaking */}
        <div className="bg-white border border-[#e6eaf1] rounded-2xl p-5 shadow-xs hover:border-[#175cdd]/40 hover:shadow-md transition-all flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-[#eff5ff] text-[#175cdd] flex items-center justify-center mb-3">
              <Icon name="mic" size={20} />
            </div>
            <h3 className="font-bold text-base text-[#11213f] mb-1">Speaking</h3>
            <p className="text-xs text-[#64748b] leading-relaxed">
              3 Parts: Phỏng vấn ngắn, Cue Card cá nhân (1 phút chuẩn bị) và thảo
              luận chuyên sâu qua microphone.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-[#f1f5f9] flex items-center justify-between text-xs">
            <span className="text-[#8c9bb3]">Thời gian</span>
            <span className="font-bold text-[#1e293b]">~ 10 phút</span>
          </div>
        </div>
      </div>

      {/* Equipment Preparation & Guidelines Card */}
      <div className="bg-[#f8faff] border border-[#dbe6f6] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#11213f]">
          <Icon name="shield" size={18} className="text-[#175cdd]" />
          <span>Hướng dẫn chuẩn bị thiết bị làm bài</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#475569]">
          <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-[#e8effd]">
            <div className="w-8 h-8 rounded-lg bg-[#edf3ff] text-[#175cdd] flex items-center justify-center flex-shrink-0">
              <Icon name="headphones" size={16} />
            </div>
            <div>
              <strong className="block text-[#1e293b] font-semibold mb-0.5">
                Tai nghe / Loa máy
              </strong>
              <span>
                Đảm bảo âm lượng rõ ràng để nghe tốt các đoạn hội thoại Listening.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-[#e8effd]">
            <div className="w-8 h-8 rounded-lg bg-[#edf3ff] text-[#175cdd] flex items-center justify-center flex-shrink-0">
              <Icon name="mic" size={16} />
            </div>
            <div>
              <strong className="block text-[#1e293b] font-semibold mb-0.5">
                Microphone thu âm
              </strong>
              <span>
                Cấp quyền Microphone trên trình duyệt để ghi âm câu trả lời Speaking.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-[#e8effd]">
            <div className="w-8 h-8 rounded-lg bg-[#edf3ff] text-[#175cdd] flex items-center justify-center flex-shrink-0">
              <Icon name="clock" size={16} />
            </div>
            <div>
              <strong className="block text-[#1e293b] font-semibold mb-0.5">
                Thời gian liền mạch
              </strong>
              <span>
                Tổng thời lượng khoảng 50–60 phút. Bài làm tự động lưu trên trình
                duyệt nếu bạn tải lại trang.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Start Button Area */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onStartTest}
          className="inline-flex items-center justify-center gap-3 bg-[#175cdd] hover:bg-[#104dc1] text-white text-base font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <span>Bắt đầu bài Placement Test</span>
          <Icon name="arrow" size={18} />
        </button>
        <p className="text-xs text-[#8c9bb3] mt-3">
          Nhấn nút để bắt đầu phần thi đầu tiên: <strong>Listening</strong>
        </p>
      </div>
    </div>
  );
}
