"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { VoiceRecorder } from "@/components/audio/VoiceRecorder";
import { createPracticeStore } from "./local-store";
import { useShadowPlayer } from "./use-shadow-player";
import { formatTime, sentenceAt, wordAt } from "./timeline";
import { youtubeReferences } from "./data";
import type { Recording, ShadowModel, PracticeMode } from "./types";
import styles from "./shadowing.module.css";

export default function ShadowingPractice({
  model,
  userId,
}: {
  model: ShadowModel;
  userId: string | null;
}) {
  const player = useShadowPlayer(model);
  const router = useRouter();
  const [recording, setRecording] = useState<Recording | null>(null);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [storageBusy, setStorageBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState("");
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [checks, setChecks] = useState([false, false, false]);
  const [video, setVideo] = useState<string | null>(null);
  const ownAudio = useRef<HTMLAudioElement>(null);
  const recordingRevision = useRef(0);
  const activeSentence = player.waiting
    ? Math.max(0, sentenceAt(model.sentences, player.time - 0.001))
    : sentenceAt(model.sentences, player.time);
  const activeWord = wordAt(model.sentences[activeSentence], player.time);

  useEffect(() => {
    if (!recording) return;
    const objectUrl = URL.createObjectURL(recording.blob);
    const frame = requestAnimationFrame(() => setUrl(objectUrl));
    return () => {
      cancelAnimationFrame(frame);
      URL.revokeObjectURL(objectUrl);
    };
  }, [recording]);

  useEffect(() => {
    if (!userId || !window.indexedDB) return;
    let cancelled = false;
    const revision = recordingRevision.current;
    const store = createPracticeStore(window.indexedDB);
    void Promise.all([
      store.load(userId, model.id),
      store.completed(userId, model.id),
    ])
      .then(([restored, done]) => {
        if (cancelled || revision !== recordingRevision.current) return;
        if (restored) {
          setRecording(restored);
          setSaved(true);
          setMessage("Đã khôi phục bản thu đã lưu riêng trên thiết bị.");
        }
        setCompleted(done);
      })
      .catch(() => {
        if (!cancelled)
          setStorageError(
            "Chưa mở được bộ nhớ thiết bị. Bạn vẫn có thể thu và nghe bản tạm.",
          );
      });
    return () => {
      cancelled = true;
    };
  }, [userId, model.id]);

  async function verifyAccount() {
    const response = await fetch("/api/shadowing/session", {
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        "Chưa xác minh được tài khoản. Hãy thử lại khi có kết nối.",
      );
    const data = await response.json();
    if (!userId || data.userId !== userId) {
      router.refresh();
      throw new Error(
        "Phiên đăng nhập đã thay đổi. Đăng nhập lại trước khi lưu.",
      );
    }
    return userId;
  }
  useEffect(() => {
    const check = () => {
      void fetch("/api/shadowing/session", { cache: "no-store" })
        .then((response) => (response.ok ? response.json() : null))
        .then((session) => {
          if (session && session.userId !== userId) router.refresh();
        })
        .catch(() => {});
    };
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [router, userId]);

  function received(value: Recording) {
    ownAudio.current?.pause();
    setRecording(value);
    setSaved(false);
    setStorageError("");
    setMessage(
      "Bản thu tạm đã sẵn sàng. Chưa tải lên server; lưu trên thiết bị nếu muốn mở lại sau reload.",
    );
  }
  async function save() {
    if (!recording || storageBusy) return;
    setStorageBusy(true);
    setStorageError("");
    try {
      const account = await verifyAccount();
      await createPracticeStore(window.indexedDB).save(
        account,
        model.id,
        recording,
      );
      setSaved(true);
      setMessage(
        "Đã lưu riêng theo tài khoản và câu hỏi trên trình duyệt này. Không upload lên cloud.",
      );
    } catch (error) {
      setStorageError(
        error instanceof Error
          ? error.message
          : "Lưu thất bại. Bản thu tạm vẫn còn.",
      );
    } finally {
      setStorageBusy(false);
    }
  }
  async function remove() {
    if (storageBusy) return;
    setStorageBusy(true);
    setStorageError("");
    try {
      if (userId) {
        const account = await verifyAccount();
        await createPracticeStore(window.indexedDB).remove(account, model.id);
      }
      ownAudio.current?.pause();
      setRecording(null);
      setUrl("");
      setSaved(false);
      setMessage("Đã xóa bản thu. Bạn có thể ghi lại.");
    } catch (error) {
      setStorageError(
        error instanceof Error
          ? error.message
          : "Chưa xóa được bản đã lưu. Hãy thử lại.",
      );
    } finally {
      setStorageBusy(false);
    }
  }
  async function confirm() {
    if (completed || !recording || !checks.every(Boolean) || storageBusy)
      return;
    setStorageBusy(true);
    setStorageError("");
    try {
      const account = await verifyAccount();
      await createPracticeStore(window.indexedDB).complete(account, model.id);
      setCompleted(true);
      setMessage("Đã xác nhận hoàn thành bài này một lần trên thiết bị.");
    } catch (error) {
      setStorageError(
        error instanceof Error
          ? error.message
          : "Chưa ghi nhận được hoàn thành.",
      );
    } finally {
      setStorageBusy(false);
    }
  }
  function compare(simultaneous: boolean) {
    if (!ownAudio.current || busy) return;
    ownAudio.current.pause();
    ownAudio.current.currentTime = 0;
    const playOwn = () => {
      void ownAudio.current
        ?.play()
        .catch(() =>
          setStorageError(
            "Trình duyệt chặn phát bản thu. Bấm Listen to My Voice để phát trực tiếp.",
          ),
        );
    };
    if (simultaneous) {
      player.playAll();
      playOwn();
    } else player.playAll(playOwn);
  }

  return (
    <div
      className={styles.page}
      onKeyDown={(event) => {
        const target = event.target as HTMLElement;
        if (
          event.code === "Space" &&
          !event.repeat &&
          !target.closest("button,input,select,textarea,a,audio,iframe") &&
          !busy
        ) {
          event.preventDefault();
          if (player.playing) player.pause();
          else player.play();
        }
      }}
    >
      <Link className={styles.back} href="/shadowing">
        ← Tất cả bài Shadowing
      </Link>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>
          SPEAKING PART {model.part} · {model.topic.toUpperCase()}
        </p>
        <h1>{model.title}</h1>
        <p>Nghe một câu. Bắt nhịp. Nói bằng giọng của bạn.</p>
      </header>
      <div className={styles.mediaNotice}>
        <strong>Audio demo · giọng tổng hợp Anh–Mỹ.</strong> Bài tự biên soạn
        hướng tới Band {model.targetBand}, chưa được giám khảo chấm. Video
        YouTube tham khảo nằm bên dưới; không phải nguồn của transcript này.
      </div>
      <div className={styles.columns}>
        <div>
          <section className={styles.panel}>
            <h2>Your prompt</h2>
            <p className={styles.prompt} lang="en">
              {model.prompt}
            </p>
            {model.cuePoints.length > 0 && (
              <ul className={styles.cues} lang="en">
                {model.cuePoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
          </section>
          <section className={styles.panel} aria-labelledby="player-heading">
            <div className={styles.panelHeader}>
              <h2 id="player-heading">Shadowing player</h2>
              <span>
                {formatTime(player.time)} / {formatTime(model.duration)}
              </span>
            </div>
            <div className={styles.settings}>
              <label>
                Chế độ
                <select
                  value={player.mode}
                  disabled={busy}
                  onChange={(event) =>
                    player.setMode(event.target.value as PracticeMode)
                  }
                >
                  <option value="continuous">Nghe liên tục</option>
                  <option value="sentence">Sentence-by-Sentence</option>
                  <option value="loop">Loop Sentence</option>
                </select>
              </label>
              <label>
                Tốc độ
                <select
                  value={player.speed}
                  disabled={busy}
                  onChange={(event) =>
                    player.setSpeed(Number(event.target.value))
                  }
                >
                  {[0.75, 1, 1.25].map((speed) => (
                    <option key={speed} value={speed}>
                      {speed.toFixed(2)}×
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.controls}>
              <button
                className={styles.primaryButton}
                disabled={busy}
                onClick={() => {
                  setVideo(null);
                  if (player.playing || player.loading) player.pause();
                  else player.play();
                }}
              >
                {player.loading
                  ? "Hủy tải"
                  : player.playing
                    ? "Ⅱ Pause"
                    : player.waiting
                      ? "Continue →"
                      : "▶ Play"}
              </button>
              <button
                className={styles.secondaryButton}
                disabled={busy}
                onClick={() => player.chooseSentence(0)}
              >
                Về câu đầu
              </button>
              <span className={styles.muted}>
                Space: phát / dừng / tiếp tục
              </span>
            </div>
            {player.waiting && (
              <p className={styles.waiting} role="status">
                Đã hết câu {activeSentence + 1}. Hãy nhại lại, rồi bấm Continue
                hoặc Space để sang câu tiếp theo.
              </p>
            )}
            {player.error && (
              <p className={styles.error} role="alert">
                {player.error}
              </p>
            )}
            <p className={styles.muted}>
              Bấm số câu để chọn vị trí bắt đầu hoặc câu muốn lặp.
            </p>
            <div
              className={styles.transcript}
              tabIndex={0}
              aria-label="Transcript đồng bộ audio; phím Space điều khiển phát"
              lang="en"
            >
              {model.sentences.map((sentence, index) => (
                <div
                  key={sentence.id}
                  className={`${styles.sentence} ${index === activeSentence ? styles.activeSentence : ""}`}
                >
                  <button
                    disabled={busy}
                    onClick={() => player.chooseSentence(index)}
                    aria-label={`Chọn câu ${index + 1}`}
                    aria-pressed={index === activeSentence}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                  <p>
                    {sentence.words.length
                      ? sentence.words.map((word, wordIndex) => (
                          <span
                            key={wordIndex}
                            className={
                              index === activeSentence &&
                              wordIndex === activeWord &&
                              player.playing
                                ? styles.activeWord
                                : ""
                            }
                          >
                            {word.text}
                          </span>
                        ))
                      : sentence.text}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <details className={styles.panel}>
            <summary>Nguồn YouTube tham khảo</summary>
            <p className={styles.muted}>
              Xem video gốc. Transcript và timestamp của bài demo phía trên
              không được áp dụng cho video này.
            </p>
            {youtubeReferences.map((reference) => (
              <div key={reference.videoId} className={styles.reference}>
                <strong>{reference.title}</strong>
                <span>{reference.channel}</span>
                <div className={styles.controls}>
                  <button
                    className={styles.secondaryButton}
                    onClick={() => {
                      player.pause();
                      ownAudio.current?.pause();
                      setVideo(
                        video === reference.videoId ? null : reference.videoId,
                      );
                    }}
                  >
                    {video === reference.videoId
                      ? "Đóng video"
                      : "Mở video gốc"}
                  </button>
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Xem trên YouTube ↗
                  </a>
                </div>
                {video === reference.videoId && (
                  <iframe
                    className={styles.video}
                    title={reference.title}
                    src={`https://www.youtube-nocookie.com/embed/${reference.videoId}`}
                    allow="encrypted-media; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}
              </div>
            ))}
          </details>
        </div>
        <aside>
          <section className={styles.panel}>
            <VoiceRecorder
              disabled={storageBusy}
              onBeforeRecord={() => {
                recordingRevision.current++;
                player.pause();
                ownAudio.current?.pause();
                setVideo(null);
              }}
              onRecording={received}
              onBusy={setBusy}
            />
            {recording && url && (
              <section className={styles.ownRecording}>
                <h3>Listen to My Voice</h3>
                <p className={styles.muted}>
                  {formatTime(recording.duration)} ·{" "}
                  {saved ? "Đã lưu trên thiết bị" : "Bản thu tạm trong bộ nhớ"}
                </p>
                <audio
                  ref={ownAudio}
                  controls
                  src={url}
                  preload="metadata"
                  aria-label="Nghe bản thu của tôi"
                  hidden={busy}
                  onError={() =>
                    setStorageError(
                      "Không đọc được định dạng bản thu. Thử ghi lại bằng trình duyệt hiện tại.",
                    )
                  }
                />
                <div className={styles.controls}>
                  <button
                    disabled={busy}
                    className={styles.secondaryButton}
                    onClick={() => compare(false)}
                  >
                    Model → giọng tôi
                  </button>
                  <button
                    disabled={busy}
                    className={styles.secondaryButton}
                    onClick={() => compare(true)}
                  >
                    Nghe song song
                  </button>
                </div>
                <div className={styles.controls}>
                  <button
                    disabled={!userId || busy || storageBusy || saved}
                    onClick={() => void save()}
                    className={styles.primaryButton}
                  >
                    {storageBusy ? "Đang xử lý…" : "Lưu trên thiết bị"}
                  </button>
                  <button
                    disabled={busy || storageBusy}
                    onClick={() => void remove()}
                    className={styles.textButton}
                  >
                    Xóa bản thu
                  </button>
                  <a
                    className={styles.textButton}
                    href={url}
                    download={`${model.id}-${recording.blob.type.includes("mp4") ? "recording.m4a" : "recording.webm"}`}
                  >
                    Tải xuống
                  </a>
                </div>
              </section>
            )}
            {!userId && (
              <p className={styles.muted}>
                <Link href="/login" className={styles.textButton}>
                  Đăng nhập
                </Link>{" "}
                để lưu riêng theo tài khoản và mở lại sau reload. Bản thu tạm
                vẫn nghe được ngay.
              </p>
            )}
            <p className={styles.muted}>
              Bản thu không upload lên cloud. Bản tạm mất khi rời trang; bản đã
              chọn lưu chỉ mở lại ở tài khoản này trên cùng trình duyệt. Không
              dùng thiết bị chung cho bản thu riêng tư.
            </p>
            {message && (
              <p role="status" className={styles.success}>
                {message}
              </p>
            )}
            {storageError && (
              <p role="alert" className={styles.error}>
                {storageError}
              </p>
            )}
          </section>
          <section className={styles.panel}>
            <h2>Tự đánh giá sau khi nghe lại</h2>
            <p className={styles.muted}>
              So sánh độ rõ âm, trọng âm và nhịp nói. Shadowing không tự tạo
              band Speaking.
            </p>
            {[
              "Tôi đã nghe lại và so sánh các âm khó.",
              "Tôi đã kiểm tra trọng âm và ngữ điệu.",
              "Tôi đã thử nói lại với nhịp tự nhiên hơn.",
            ].map((label, index) => (
              <label key={label} className={styles.check}>
                <input
                  type="checkbox"
                  checked={checks[index]}
                  onChange={(event) =>
                    setChecks((previous) =>
                      previous.map((value, i) =>
                        i === index ? event.target.checked : value,
                      ),
                    )
                  }
                />
                {label}
              </label>
            ))}
            <button
              className={styles.primaryButton}
              disabled={
                !userId ||
                !recording ||
                busy ||
                storageBusy ||
                !checks.every(Boolean) ||
                completed
              }
              onClick={() => void confirm()}
            >
              {completed
                ? "✓ Đã hoàn thành · ghi nhận 1 lần"
                : "Xác nhận đã luyện xong"}
            </button>
            <p className={styles.muted}>
              Trạng thái hoàn thành được lưu theo tài khoản và bài trên thiết bị
              này, chưa đồng bộ dashboard của nhóm.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
