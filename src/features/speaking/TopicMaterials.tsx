import { Icon } from "@/components/icon";
import type { SpeakingPart, SpeakingTopic } from "./types";
import styles from "./speaking.module.css";

export function TopicMaterials({
  topic,
  part,
}: {
  topic: SpeakingTopic;
  part: SpeakingPart;
}) {
  const sources = [
    ...new Map(
      topic.editions
        .flatMap((edition) => edition.sources)
        .map((source) => [source.url, source] as const),
    ).values(),
  ];
  return (
    <aside className={styles.materials} aria-label="Gợi ý từ vựng và ngữ pháp">
      <details className={styles.panel} open>
        <summary>
          <Icon name="book" size={19} />
          Key Vocabulary <span>5 expressions</span>
        </summary>
        <p className={styles.hint}>
          Từ vựng mở rộng · IPA Anh–Mỹ · Nghĩa tiếng Việt
        </p>
        <dl className={styles.vocabulary}>
          {topic.vocabulary.map((item) => (
            <div key={item.term}>
              <dt lang="en">{item.term}</dt>
              <dd>
                <span className={styles.ipa} lang="en">
                  {item.ipa}
                </span>
                <p>{item.meaningVi}</p>
                <blockquote lang="en">{item.example}</blockquote>
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <details className={styles.panel} open>
        <summary>
          <Icon name="sparkle" size={19} />
          Grammar suggestions
        </summary>
        <p className={styles.hint}>
          Chọn cấu trúc phù hợp với ý bạn muốn diễn đạt.
        </p>
        <div className={styles.grammar}>
          {topic.grammar[part].map((item) => (
            <section key={item.structure}>
              <h3 lang="en">{item.structure}</h3>
              <p>{item.usageVi}</p>
              <blockquote lang="en">{item.example}</blockquote>
            </section>
          ))}
        </div>
      </details>
      <details className={styles.panel}>
        <summary>
          <Icon name="info" size={19} />
          Nguồn & trạng thái <span>{sources.length} nguồn</span>
        </summary>
        <p className={styles.hint}>
          Câu hỏi và bài mẫu do AAA tự biên soạn. Nguồn forecast chỉ được dùng
          để chọn chủ đề luyện tập, không phải đề thi chính thức.
        </p>
        <div className={styles.sources}>
          {topic.editions.map((edition) => (
            <section key={edition.label}>
              <h3>{edition.label.replace("-", " · ")}</h3>
              <p>
                {edition.status === "unverified-prediction"
                  ? "Dự đoán chưa xác minh"
                  : "Bộ luyện tập tự biên soạn"}{" "}
                · cập nhật {edition.updatedAt.split("-").reverse().join("/")}
              </p>
            </section>
          ))}
          {sources.map((source) => (
            <section key={source.url}>
              <h3>{source.publisher}</h3>
              <a href={source.url} target="_blank" rel="noopener noreferrer">
                {source.title} ↗
              </a>
              <p>
                {source.kind === "official-format"
                  ? "Nguồn chính thức về cấu trúc bài thi"
                  : "Nguồn forecast bên thứ ba, chưa được IELTS xác nhận"}{" "}
                · truy cập {source.accessedAt.split("-").reverse().join("/")}
              </p>
            </section>
          ))}
        </div>
      </details>
    </aside>
  );
}
