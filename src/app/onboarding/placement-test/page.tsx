import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { originalPracticeTests } from "@/data/original-practice-tests";

export const metadata = {
  title: "Xác định trình độ | AAA",
  description: "Bước 2: hoàn thành các bài luyện để xác định điểm xuất phát.",
};

export default function PlacementTestPage() {
  const starters = ["reading", "listening", "writing", "speaking"].map(
    (skill) => originalPracticeTests.find((test) => test.skill === skill)!,
  );
  return (
    <AppShell active="practice">
      <div className="breadcrumb">
        <span>Thiết lập hành trình</span>
        <Icon name="chevron" size={12} />
        <span>Bước 02</span>
      </div>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            <span />
            BƯỚC 02 · XÁC ĐỊNH TRÌNH ĐỘ
          </span>
          <h1>
            Bắt đầu từ điểm xuất phát <span>của bạn.</span>
          </h1>
          <p>
            Hoàn thành một bài khởi động cho từng kỹ năng để làm quen với lộ
            trình luyện tập.
          </p>
        </div>
        <span className="heading-detail">
          <Icon name="target" size={17} /> Placement
        </span>
      </div>
      <section className="practice-hero">
        <div>
          <span className="practice-kicker">GIAI ĐOẠN 2</span>
          <h2>
            Làm bài ngay trong AAA.
            <br />
            Tiếp tục theo nhịp của bạn.
          </h2>
          <p>
            Chọn một kỹ năng để bắt đầu. Các câu trả lời được lưu trên thiết bị.
          </p>
        </div>
        <div className="practice-band-card">
          <Icon name="target" size={27} />
          <small>KHỞI ĐỘNG</small>
          <strong>4</strong>
          <span>kỹ năng IELTS</span>
        </div>
      </section>
      <section
        className="practice-catalog"
        aria-label="Bài khởi động placement"
      >
        <div className="catalog-heading">
          <div>
            <h2>Chọn kỹ năng đầu tiên</h2>
            <p>
              Sau khi hoàn thành, bạn có thể quay lại kho 40 bài luyện bất cứ
              lúc nào.
            </p>
          </div>
        </div>
        <div className="exercise-grid">
          {starters.map((test, index) => (
            <article className="exercise-card" key={test.slug}>
              <div
                className={`exercise-cover ${test.skill === "listening" || test.skill === "speaking" ? "listening" : "reading"}`}
              >
                <span className="exercise-skill">
                  {test.skill.toUpperCase()}
                </span>
                <span className="exercise-cover-number" aria-hidden="true">
                  0{index + 1}
                </span>
                <span className="exercise-band">Bài khởi động</span>
              </div>
              <div className="exercise-card-body">
                <h3>{test.title}</h3>
                <p>{test.summary}</p>
                <div className="exercise-card-footer">
                  <span>Bước 02</span>
                  <Link href={`/practice/${test.slug}`}>
                    Bắt đầu <Icon name="arrow" size={17} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
