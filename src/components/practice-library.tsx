import Link from "next/link";
import { AppShell } from "./app-shell";
import { Icon } from "./icon";

/** The library intentionally exposes only the user-supplied Cambridge book. */
export function PracticeLibrary() {
  return (
    <AppShell active="practice">
      <section className="cambridge-library" aria-labelledby="cambridge-library-title">
        <div className="breadcrumb">
          <span>Không gian học tập</span>
          <Icon name="chevron" size={12} />
          <span>Kho tài liệu</span>
        </div>
        <header className="cambridge-library-heading">
          <span className="eyebrow"><span />KHO TÀI LIỆU</span>
          <h1 id="cambridge-library-title">Cambridge IELTS 10</h1>
          <p>Đề Academic Test 1–4 và General Training Test A/B từ tài liệu Cambridge IELTS 10 bạn đã cung cấp.</p>
        </header>
        <section className="cambridge-entry cambridge-library-entry" aria-label="Cambridge IELTS 10">
          <div>
            <span className="eyebrow"><span />CAMBRIDGE IELTS 10</span>
            <h2>Đề thi theo Test, Skill và Part</h2>
            <p>Chọn Test, kỹ năng và Part để mở trình làm bài toàn màn hình.</p>
          </div>
          <Link className="primary-button" href="/practice/cambridge-10">
            Mở Cambridge IELTS 10 <Icon name="arrow" size={17} />
          </Link>
        </section>
      </section>
    </AppShell>
  );
}
