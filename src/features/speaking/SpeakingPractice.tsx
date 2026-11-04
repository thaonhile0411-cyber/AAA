import Link from "next/link";
import { Icon } from "@/components/icon";
import { PartNavigation } from "./PartNavigation";
import { QuestionAudio, QuestionAudioProvider } from "./QuestionAudio";
import { TopicMaterials } from "./TopicMaterials";
import { questionsForPart } from "./bank";
import { partInfo, type SpeakingPart, type SpeakingTopic } from "./types";
import styles from "./speaking.module.css";

export default function SpeakingPractice({
  topic,
  part,
}: {
  topic: SpeakingTopic;
  part: SpeakingPart;
}) {
  const info = partInfo[part];
  const questions = questionsForPart(topic, part);
  return (
    <QuestionAudioProvider key={`${part}:${topic.id}`}>
      <div className={styles.page}>
        <Link href={`/speaking/${part}`} className={styles.backLink}>
          ← Ngân hàng câu hỏi · {info.title}
        </Link>
        <header className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>
              SPEAKING {info.title.toUpperCase()} · TOPIC PRACTICE
            </p>
            <h1 lang="en">{topic.title}</h1>
            <p>{topic.descriptionVi}</p>
          </div>
          <span className={styles.heroIcon}>
            <Icon name="mic" size={32} />
          </span>
        </header>
        <PartNavigation part={part} />
        <div className={styles.practiceGrid}>
          <div className={styles.questionsColumn}>
            <section className={styles.partIntro}>
              <span className={styles.bluePill}>{info.title}</span>
              <div>
                <h2 lang="en">{info.name}</h2>
                <p>
                  {part === "part-1"
                    ? "Trả lời trực tiếp, phát triển ý ngắn gọn bằng lý do hoặc ví dụ."
                    : part === "part-2"
                      ? "Dành một phút chuẩn bị, sau đó nói liên tục từ một đến hai phút."
                      : "Giải thích quan điểm, so sánh và đưa ví dụ để phát triển câu trả lời."}
                </p>
              </div>
            </section>
            {part === "part-2" ? (
              <article className={styles.cueCard} aria-labelledby="cue-title">
                <div className={styles.cueTop}>
                  <span className={styles.cueLabel}>YOUR CUE CARD</span>
                  <QuestionAudio question={topic.part2} />
                </div>
                <h2 id="cue-title" lang="en">
                  {topic.part2.text}
                </h2>
                <div className={styles.cuePoints} lang="en">
                  <p>You should say:</p>
                  <ul>
                    {topic.part2.cuePoints.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
                <div className={styles.cueTiming}>
                  <span>
                    <Icon name="clock" size={17} />1 phút chuẩn bị
                  </span>
                  <span>
                    <Icon name="mic" size={17} />
                    1–2 phút nói
                  </span>
                </div>
                <p className={styles.hint} lang="en">
                  You have one minute to prepare. You should speak for one to
                  two minutes.
                </p>
                <Link
                  className={styles.modelLink}
                  href={`/speaking/${part}/${topic.id}/${topic.part2.id}`}
                >
                  Model Answer & Shadowing <Icon name="arrow" size={16} />
                </Link>
              </article>
            ) : (
              <section aria-labelledby="questions-heading">
                <h2 className={styles.sectionHeading} id="questions-heading">
                  {questions.length} câu hỏi · {info.title}
                </h2>
                <ol className={styles.questionList}>
                  {questions.map((question, index) => (
                    <li key={question.id}>
                      <article className={styles.questionCard}>
                        <span className={styles.questionNumber}>
                          0{index + 1}
                        </span>
                        <div>
                          <h3 lang="en">{question.text}</h3>
                          <QuestionAudio question={question} />
                          <Link
                            className={styles.modelLink}
                            href={`/speaking/${part}/${topic.id}/${question.id}`}
                          >
                            Model Answer & Shadowing{" "}
                            <Icon name="arrow" size={16} />
                          </Link>
                        </div>
                      </article>
                    </li>
                  ))}
                </ol>
              </section>
            )}
            <div className={styles.audioNote}>
              <Icon name="volume" size={17} />
              <p>
                Audio tiếng Anh–Mỹ, giọng tổng hợp Microsoft Zira.{" "}
                {part === "part-2"
                  ? "Nút Pronunciation đọc toàn bộ đề và các ý gợi ý."
                  : "Bấm biểu tượng loa để nghe từng câu hỏi."}{" "}
                Chỉ một bản đọc phát tại một thời điểm.
              </p>
            </div>
            <section className={styles.tip}>
              <Icon name="sparkle" />
              <div>
                <h2>Một cách luyện tập hiệu quả</h2>
                <p>
                  {part === "part-1"
                    ? "Nghe câu hỏi, trả lời bằng ý của mình rồi bổ sung một chi tiết cụ thể. Không cần học thuộc câu trả lời dài."
                    : part === "part-2"
                      ? "Ghi lại một vài từ khóa cho mỗi ý trên cue card. Kể một trải nghiệm cụ thể và giải thích cảm xúc của bạn."
                      : "Bắt đầu bằng quan điểm, giải thích lý do rồi đưa ví dụ. Có thể đề cập một góc nhìn khác trước khi kết luận."}
                </p>
              </div>
            </section>
            <nav
              className={styles.relatedParts}
              aria-label="Luyện tiếp cùng chủ đề"
            >
              {(["part-1", "part-2", "part-3"] as const)
                .filter((item) => item !== part)
                .map((item) => (
                  <Link key={item} href={`/speaking/${item}/${topic.id}`}>
                    {topic.title} · {partInfo[item].title}
                    <Icon name="arrow" size={15} />
                  </Link>
                ))}
            </nav>
            <p className={styles.contentNote}>
              Đề luyện tập tự biên soạn · cập nhật{" "}
              {topic.updatedAt.split("-").reverse().join("/")} · Mục tiêu luyện
              tập Band {topic.suggestedBand[part]}, không phải kết quả giám khảo
              chấm. Từ vựng là gợi ý mở rộng.
            </p>
          </div>
          <TopicMaterials topic={topic} part={part} />
        </div>
      </div>
    </QuestionAudioProvider>
  );
}
