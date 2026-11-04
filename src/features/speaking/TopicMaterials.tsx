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
    </aside>
  );
}
