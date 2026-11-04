import Link from "next/link";
import { shadowModels } from "@/features/shadowing/data";
import { formatTime } from "@/features/shadowing/timeline";
import styles from "@/features/shadowing/shadowing.module.css";

export default function ShadowingPage() {
  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>LISTEN. IMITATE. FIND YOUR RHYTHM.</p>
        <h1>Shadowing studio</h1>
        <p>Luyện phát âm, ngữ điệu và độ trôi chảy với từng câu ngắn.</p>
      </header>
      <div className={styles.mediaNotice}>
        Chọn bài mẫu để nghe, luyện từng câu và thu giọng của bạn. Bản thu mặc
        định chỉ ở bộ nhớ tạm; có thể chọn lưu riêng trên thiết bị sau khi đăng
        nhập.
      </div>
      <div className={styles.modelGrid}>
        {shadowModels.map((model) => (
          <article className={styles.panel} key={model.id}>
            <p className={styles.eyebrow}>
              PART {model.part} · {model.topic}
            </p>
            <h2>{model.title}</h2>
            <p className={styles.prompt}>{model.prompt}</p>
            <p className={styles.muted}>
              {model.sentences.length} câu · {formatTime(model.duration)} · mục
              tiêu Band {model.targetBand}
            </p>
            <p className={styles.muted}>
              Bài tự biên soạn · audio demo giọng tổng hợp
            </p>
            <Link
              className={styles.primaryButton}
              href={`/shadowing/${model.id}`}
            >
              Bắt đầu Shadowing →
            </Link>
          </article>
        ))}
      </div>
      <p className={styles.muted}>
        Shadowing không chấm điểm hoặc tạo band Speaking. Nội dung Band
        7.0+/8.0+ thể hiện mục tiêu luyện tập, chưa được giám khảo đánh giá.
      </p>
    </div>
  );
}
