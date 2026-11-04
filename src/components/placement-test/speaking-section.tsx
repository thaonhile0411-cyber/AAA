"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { SPEAKING_CONTENT } from "@/data/placement-test-data";
import { uploadSpeakingAudio } from "@/lib/supabase-client";
import type { SpeakingRecordingInfo } from "@/types/placement-test";

type SpeakingSectionProps = {
  recordings: Record<string, SpeakingRecordingInfo>;
  onRecordingComplete: (
    questionKey: string,
    data: {
      blobUrl: string;
      duration: number;
      audioBase64?: string;
      storagePath?: string;
    },
  ) => void;
  onOpenReviewModal: () => void;
};

export function SpeakingSection({
  recordings,
  onRecordingComplete,
  onOpenReviewModal,
}: SpeakingSectionProps) {
  const [activePartIndex, setActivePartIndex] = useState<1 | 2 | 3>(1);
  const [micPermissionError, setMicPermissionError] = useState<string>("");
  const [activeRecordingKey, setActiveRecordingKey] = useState<string | null>(null);
  const [recordingElapsed, setRecordingElapsed] = useState(0);

  // Incomplete warning modal state
  const [incompleteWarning, setIncompleteWarning] = useState<string | null>(null);

  // Audio playback state
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Cue card prep timer state
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(60);
  const [isPrepping, setIsPrepping] = useState(false);
  const prepTimerRef = useRef<NodeJS.Timeout | null>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Completion check per part
  const isPart1Complete = SPEAKING_CONTENT.part1.questions.every(
    (q) => recordings[q.id]?.hasRecorded,
  );
  const isPart2Complete = Boolean(recordings["part2_cue_card"]?.hasRecorded);
  const isPart3Complete = SPEAKING_CONTENT.part3.questions.every(
    (q) => recordings[q.id]?.hasRecorded,
  );

  function stopActiveStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }

  // Clean up streams and timers on unmount
  useEffect(() => {
    return () => {
      stopActiveStream();
      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      if (prepTimerRef.current) clearInterval(prepTimerRef.current);
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
    };
  }, []);

  // 1-minute prep timer for Part 2
  function startPrepTimer() {
    setIsPrepping(true);
    setPrepSecondsLeft(60);
    if (prepTimerRef.current) clearInterval(prepTimerRef.current);

    prepTimerRef.current = setInterval(() => {
      setPrepSecondsLeft((prev) => {
        if (prev <= 1) {
          if (prepTimerRef.current) clearInterval(prepTimerRef.current);
          setIsPrepping(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // Start recording
  async function startRecording(questionKey: string, maxDuration = 120) {
    let elapsedSeconds = 0;
    setMicPermissionError("");
    if (playingKey) {
      stopPlayingAudio();
    }
    if (activeRecordingKey) {
      stopRecording();
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        const blobUrl = URL.createObjectURL(audioBlob);
        const finalDuration = elapsedSeconds;

        // Convert to base64 for real AI evaluation
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;

          // Asynchronously attempt upload to Supabase Storage
          uploadSpeakingAudio(audioBlob, questionKey).then((uploadRes) => {
            onRecordingComplete(questionKey, {
              blobUrl,
              duration: finalDuration,
              audioBase64: base64Data,
              storagePath: uploadRes.storagePath,
            });
          });
        };
        reader.readAsDataURL(audioBlob);

        stopActiveStream();
        setActiveRecordingKey(null);
        setRecordingElapsed(0);
      };

      mediaRecorder.start(250);
      setActiveRecordingKey(questionKey);
      setRecordingElapsed(0);

      if (recordIntervalRef.current) clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = setInterval(() => {
        elapsedSeconds += 1;
        setRecordingElapsed(elapsedSeconds);

        if (elapsedSeconds >= maxDuration) {
          stopRecording();
        }
      }, 1000);
    } catch (err: unknown) {
      console.warn("Microphone access error:", err);
      const isNotAllowed =
        err instanceof Error &&
        (err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError");
      setMicPermissionError(
        isNotAllowed
          ? "Bạn chưa cấp quyền Microphone trên trình duyệt. Vui lòng cho phép truy cập micro để làm bài Speaking."
          : "Không tìm thấy thiết bị Microphone khả dụng. Vui lòng kiểm tra lại micrô kết nối.",
      );
      setActiveRecordingKey(null);
      setRecordingElapsed(0);
    }
  }

  function stopRecording() {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
  }

  // Audio Playback
  function playAudio(key: string, url: string) {
    if (playingKey === key) {
      stopPlayingAudio();
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new Audio(url);
    audioPlayerRef.current = audio;
    setPlayingKey(key);

    audio.onended = () => {
      setPlayingKey(null);
    };
    audio.onerror = () => {
      setPlayingKey(null);
    };
    audio.play().catch(() => setPlayingKey(null));
  }

  function stopPlayingAudio() {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setPlayingKey(null);
  }

  function formatSeconds(secs: number): string {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  }

  // Part switching handlers
  function handleGoToPart(targetPart: 1 | 2 | 3) {
    // Can always access Part 1
    if (targetPart === 1) {
      setActivePartIndex(1);
      return;
    }
    // Can access Part 2 only if Part 1 is complete
    if (targetPart === 2) {
      if (!isPart1Complete) {
        const missing = SPEAKING_CONTENT.part1.questions.filter(
          (q) => !recordings[q.id]?.hasRecorded,
        ).length;
        setIncompleteWarning(`Bạn còn ${missing} câu hỏi Speaking Part 1 chưa ghi âm.`);
        return;
      }
      setActivePartIndex(2);
      return;
    }
    // Can access Part 3 only if Part 1 and Part 2 are complete
    if (targetPart === 3) {
      if (!isPart1Complete) {
        setIncompleteWarning("Vui lòng hoàn thành Part 1 trước.");
        return;
      }
      if (!isPart2Complete) {
        setIncompleteWarning("Bạn chưa hoàn thành bản ghi âm Cue Card của Part 2.");
        return;
      }
      setActivePartIndex(3);
      return;
    }
  }

  function handleFinishPart1() {
    if (!isPart1Complete) {
      const missing = SPEAKING_CONTENT.part1.questions.filter(
        (q) => !recordings[q.id]?.hasRecorded,
      ).length;
      setIncompleteWarning(`Bạn còn ${missing} câu hỏi Speaking Part 1 chưa ghi âm.`);
      return;
    }
    setActivePartIndex(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFinishPart2() {
    if (!isPart2Complete) {
      setIncompleteWarning("Bạn chưa hoàn thành bản ghi âm Cue Card của Part 2.");
      return;
    }
    setActivePartIndex(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFinishPart3() {
    if (!isPart3Complete) {
      const missing = SPEAKING_CONTENT.part3.questions.filter(
        (q) => !recordings[q.id]?.hasRecorded,
      ).length;
      setIncompleteWarning(`Bạn còn ${missing} câu hỏi Speaking Part 3 chưa ghi âm.`);
      return;
    }
    onOpenReviewModal();
  }

  const cueCard = SPEAKING_CONTENT.part2.cueCard;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6eaf1] pb-3">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-[#11213f] m-0">
            Speaking Section
          </h2>
          <p className="text-xs text-[#64748b] m-0 mt-0.5">
            Ghi âm câu trả lời thực tế cho 3 phần thi
          </p>
        </div>
      </div>

      {/* Part Navigation Pills (Allows returning to completed parts) */}
      <div className="grid grid-cols-3 gap-3">
        {/* Part 1 */}
        <button
          type="button"
          onClick={() => handleGoToPart(1)}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left cursor-pointer ${
            activePartIndex === 1
              ? "bg-white border-[#175cdd] ring-2 ring-[#175cdd]/15 shadow-sm"
              : isPart1Complete
                ? "bg-[#fafdfe] border-[#cce8dc] hover:border-[#34aa8b]"
                : "bg-[#f8fafc] border-[#e6eaf1]"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                isPart1Complete
                  ? "bg-[#eefaf4] text-[#147054]"
                  : activePartIndex === 1
                    ? "bg-[#175cdd] text-white"
                    : "bg-[#edf1f7] text-[#8b95a8]"
              }`}
            >
              {isPart1Complete ? <Icon name="check" size={13} /> : "1"}
            </span>
            <span className="font-bold text-xs md:text-sm text-[#11213f]">
              Part 1: Phỏng vấn
            </span>
          </div>
          {isPart1Complete && (
            <span className="w-2 h-2 rounded-full bg-[#147054]" />
          )}
        </button>

        {/* Part 2 */}
        <button
          type="button"
          disabled={!isPart1Complete}
          onClick={() => handleGoToPart(2)}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
            !isPart1Complete
              ? "bg-[#f8fafc] border-[#e6eaf1] opacity-50 cursor-not-allowed"
              : activePartIndex === 2
                ? "bg-white border-[#175cdd] ring-2 ring-[#175cdd]/15 shadow-sm cursor-pointer"
                : isPart2Complete
                  ? "bg-[#fafdfe] border-[#cce8dc] hover:border-[#34aa8b] cursor-pointer"
                  : "bg-white border-[#e6eaf1] cursor-pointer"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                isPart2Complete
                  ? "bg-[#eefaf4] text-[#147054]"
                  : activePartIndex === 2
                    ? "bg-[#175cdd] text-white"
                    : "bg-[#edf1f7] text-[#8b95a8]"
              }`}
            >
              {isPart2Complete ? <Icon name="check" size={13} /> : "2"}
            </span>
            <span className="font-bold text-xs md:text-sm text-[#11213f]">
              Part 2: Cue Card
            </span>
          </div>
          {isPart2Complete && (
            <span className="w-2 h-2 rounded-full bg-[#147054]" />
          )}
        </button>

        {/* Part 3 */}
        <button
          type="button"
          disabled={!isPart1Complete || !isPart2Complete}
          onClick={() => handleGoToPart(3)}
          className={`p-3 rounded-xl border flex items-center justify-between transition-all text-left ${
            !isPart1Complete || !isPart2Complete
              ? "bg-[#f8fafc] border-[#e6eaf1] opacity-50 cursor-not-allowed"
              : activePartIndex === 3
                ? "bg-white border-[#175cdd] ring-2 ring-[#175cdd]/15 shadow-sm cursor-pointer"
                : isPart3Complete
                  ? "bg-[#fafdfe] border-[#cce8dc] hover:border-[#34aa8b] cursor-pointer"
                  : "bg-white border-[#e6eaf1] cursor-pointer"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${
                isPart3Complete
                  ? "bg-[#eefaf4] text-[#147054]"
                  : activePartIndex === 3
                    ? "bg-[#175cdd] text-white"
                    : "bg-[#edf1f7] text-[#8b95a8]"
              }`}
            >
              {isPart3Complete ? <Icon name="check" size={13} /> : "3"}
            </span>
            <span className="font-bold text-xs md:text-sm text-[#11213f]">
              Part 3: Thảo luận
            </span>
          </div>
          {isPart3Complete && (
            <span className="w-2 h-2 rounded-full bg-[#147054]" />
          )}
        </button>
      </div>

      {/* Mic Permission Alert */}
      {micPermissionError && (
        <div className="p-4 bg-[#fef2f2] border border-[#fecaca] rounded-xl flex items-start gap-3 text-xs text-[#b91c1c]">
          <Icon name="alert" size={18} className="flex-shrink-0 mt-0.5" />
          <p className="m-0 leading-relaxed">{micPermissionError}</p>
        </div>
      )}

      {/* PART 1 CONTENT */}
      {activePartIndex === 1 && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-[#e6eaf1] rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#11213f] m-0">
              Part 1: Introduction and Interview
            </h3>

            <div className="space-y-4">
              {SPEAKING_CONTENT.part1.questions.map((q, idx) => {
                const rec = recordings[q.id];
                const isRecording = activeRecordingKey === q.id;
                const isPlaying = playingKey === q.id;

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-[#edf0f5] bg-[#fafbfd] space-y-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-[#edf3ff] text-[#175cdd] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs md:text-sm font-semibold text-[#11213f] m-0 leading-relaxed">
                        {q.prompt}
                      </p>
                    </div>

                    {/* Recording Controls */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={() => startRecording(q.id, 60)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#eff5ff] hover:bg-[#dbeafe] text-[#175cdd] text-xs font-bold rounded-lg border border-[#bed7ff] transition-all cursor-pointer"
                        >
                          <Icon name="mic" size={14} />
                          <span>{rec?.hasRecorded ? "Ghi âm lại" : "Bắt đầu ghi âm"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-lg transition-all animate-pulse cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-white" />
                          <span>Dừng ghi âm ({formatSeconds(recordingElapsed)})</span>
                        </button>
                      )}

                      {/* Playback Button */}
                      {rec?.hasRecorded && rec.blobUrl && !isRecording && (
                        <button
                          type="button"
                          onClick={() => playAudio(q.id, rec.blobUrl!)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#cbd5e1] hover:bg-gray-50 text-[#334155] text-xs font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          <Icon name={isPlaying ? "pause" : "play"} size={13} />
                          <span>{isPlaying ? "Tạm dừng" : "Nghe lại"} ({rec.durationSeconds}s)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-end">
            <button
              type="button"
              onClick={handleFinishPart1}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#175cdd] hover:bg-[#104dc1] text-white text-xs md:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Chuyển sang Part 2</span>
              <Icon name="arrow" size={15} />
            </button>
          </div>
        </div>
      )}

      {/* PART 2 CONTENT */}
      {activePartIndex === 2 && (
        <div className="space-y-4">
          <div className="p-6 bg-white border border-[#e6eaf1] rounded-2xl shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#edf0f5] pb-3">
              <h3 className="text-sm font-bold text-[#11213f] m-0">
                Part 2: Individual Long Turn (Cue Card)
              </h3>
              <span className="text-xs text-[#64748b]">
                1 phút chuẩn bị · Nói từ 1 - 2 phút
              </span>
            </div>

            {/* Cue Card Prompt Box */}
            <div className="p-5 rounded-xl bg-[#f8faff] border border-[#d6e3f5] space-y-3">
              <h4 className="text-sm font-bold text-[#11213f] m-0">
                {cueCard.topic}
              </h4>
              <p className="text-xs text-[#334155] m-0 font-medium">
                {cueCard.intro}
              </p>
              <ul className="text-xs text-[#475569] space-y-1 pl-4 list-disc">
                {cueCard.bulletPoints.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            {/* Preparation Timer */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#fafbfd] border border-[#edf0f5]">
              <span className="text-xs text-[#475569] font-medium">
                Thời gian chuẩn bị (1 phút):
              </span>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold text-[#175cdd]">
                  {formatSeconds(prepSecondsLeft)}
                </span>
                {!isPrepping && prepSecondsLeft === 60 && (
                  <button
                    type="button"
                    onClick={startPrepTimer}
                    className="px-3 py-1 bg-[#eff5ff] border border-[#bed7ff] text-[#175cdd] text-xs font-semibold rounded-lg hover:bg-[#dbeafe] cursor-pointer"
                  >
                    Bắt đầu 1 phút chuẩn bị
                  </button>
                )}
              </div>
            </div>

            {/* Part 2 Recording Controls */}
            {(() => {
              const rec = recordings["part2_cue_card"];
              const isRecording = activeRecordingKey === "part2_cue_card";
              const isPlaying = playingKey === "part2_cue_card";

              return (
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#edf0f5]">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={() => startRecording("part2_cue_card", 120)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#eff5ff] hover:bg-[#dbeafe] text-[#175cdd] text-xs font-bold rounded-lg border border-[#bed7ff] transition-all cursor-pointer"
                    >
                      <Icon name="mic" size={14} />
                      <span>{rec?.hasRecorded ? "Ghi âm lại Cue Card" : "Bắt đầu bài nói (Tối đa 2 phút)"}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-lg transition-all animate-pulse cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>Dừng ghi âm ({formatSeconds(recordingElapsed)})</span>
                    </button>
                  )}

                  {rec?.hasRecorded && rec.blobUrl && !isRecording && (
                    <button
                      type="button"
                      onClick={() => playAudio("part2_cue_card", rec.blobUrl!)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#cbd5e1] hover:bg-gray-50 text-[#334155] text-xs font-semibold rounded-lg transition-all cursor-pointer"
                    >
                      <Icon name={isPlaying ? "pause" : "play"} size={13} />
                      <span>{isPlaying ? "Tạm dừng" : "Nghe lại"} ({rec.durationSeconds}s)</span>
                    </button>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePartIndex(1)}
              className="px-4 py-2 text-xs font-semibold text-[#175cdd] hover:underline cursor-pointer"
            >
              ← Quay lại Part 1
            </button>
            <button
              type="button"
              onClick={handleFinishPart2}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#175cdd] hover:bg-[#104dc1] text-white text-xs md:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Chuyển sang Part 3</span>
              <Icon name="arrow" size={15} />
            </button>
          </div>
        </div>
      )}

      {/* PART 3 CONTENT */}
      {activePartIndex === 3 && (
        <div className="space-y-4">
          <div className="p-4 bg-white border border-[#e6eaf1] rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#11213f] m-0">
              Part 3: Discussion (Thảo luận hai chiều)
            </h3>

            <div className="space-y-4">
              {SPEAKING_CONTENT.part3.questions.map((q, idx) => {
                const rec = recordings[q.id];
                const isRecording = activeRecordingKey === q.id;
                const isPlaying = playingKey === q.id;

                return (
                  <div
                    key={q.id}
                    className="p-4 rounded-xl border border-[#edf0f5] bg-[#fafbfd] space-y-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-[#edf3ff] text-[#175cdd] flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="text-xs md:text-sm font-semibold text-[#11213f] m-0 leading-relaxed">
                        {q.prompt}
                      </p>
                    </div>

                    {/* Recording Controls */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                      {!isRecording ? (
                        <button
                          type="button"
                          onClick={() => startRecording(q.id, 90)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#eff5ff] hover:bg-[#dbeafe] text-[#175cdd] text-xs font-bold rounded-lg border border-[#bed7ff] transition-all cursor-pointer"
                        >
                          <Icon name="mic" size={14} />
                          <span>{rec?.hasRecorded ? "Ghi âm lại" : "Bắt đầu ghi âm"}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-lg transition-all animate-pulse cursor-pointer"
                        >
                          <span className="w-2 h-2 rounded-full bg-white" />
                          <span>Dừng ghi âm ({formatSeconds(recordingElapsed)})</span>
                        </button>
                      )}

                      {rec?.hasRecorded && rec.blobUrl && !isRecording && (
                        <button
                          type="button"
                          onClick={() => playAudio(q.id, rec.blobUrl!)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-[#cbd5e1] hover:bg-gray-50 text-[#334155] text-xs font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          <Icon name={isPlaying ? "pause" : "play"} size={13} />
                          <span>{isPlaying ? "Tạm dừng" : "Nghe lại"} ({rec.durationSeconds}s)</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setActivePartIndex(2)}
              className="px-4 py-2 text-xs font-semibold text-[#175cdd] hover:underline cursor-pointer"
            >
              ← Quay lại Part 2
            </button>
            <button
              type="button"
              onClick={handleFinishPart3}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs md:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Icon name="check" size={15} />
              <span>Xem lại & Nộp bài</span>
            </button>
          </div>
        </div>
      )}

      {/* Incomplete Warning Modal */}
      {incompleteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#e6eaf1] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Icon name="alert" size={24} />
              <h3 className="text-base font-bold text-[#11213f] m-0">
                Chưa hoàn thành phần nói
              </h3>
            </div>
            <p className="text-xs md:text-sm text-[#475569] leading-relaxed m-0">
              {incompleteWarning}
            </p>
            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setIncompleteWarning(null)}
                className="px-5 py-2.5 bg-[#175cdd] hover:bg-[#104dc1] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Ở lại làm tiếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
