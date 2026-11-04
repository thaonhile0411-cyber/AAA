import type { Skill } from "@/lib/goals";
import type { LearnerSkillProfile } from "@/lib/learner-skill-profile";

const RADAR_SKILLS: Skill[] = ["listening", "reading", "speaking", "writing"];

const LABELS: Record<Skill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

const AXIS_ENDS: Record<Skill, readonly [number, number]> = {
  listening: [160, 45],
  reading: [275, 160],
  speaking: [160, 275],
  writing: [45, 160],
};

const LABEL_POSITIONS: Record<Skill, readonly [number, number]> = {
  listening: [160, 18],
  reading: [305, 164],
  speaking: [160, 304],
  writing: [15, 164],
};

const CENTER = 160;
const OUTER_RADIUS = 115;

const SERIES_COLORS = ["#2563eb", "#e65d7a", "#16a34a"] as const;

function pointForBand(skill: Skill, band: number): string {
  const [axisX, axisY] = AXIS_ENDS[skill];
  const ratio = band / 9;
  const x = CENTER + (axisX - CENTER) * ratio;
  const y = CENTER + (axisY - CENTER) * ratio;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

export type RadarSeries = {
  profile: LearnerSkillProfile;
  label: string;
  color?: string;
};

type SkillRadarChartProps = {
  /** Use this for the single, current Placement Test result. */
  profile?: LearnerSkillProfile;
  /** Use this to overlay the newest one to three completed assessments. */
  series?: RadarSeries[];
  title?: string;
  subtitle?: string;
};

/** Four-axis IELTS profile chart. Grammar and vocabulary are intentionally not axes. */
export function SkillRadarChart({
  profile,
  series,
  title = "Hồ sơ năng lực 4 kỹ năng",
  subtitle = "Listening, Reading, Writing và Speaking trên thang IELTS 9.0.",
}: SkillRadarChartProps) {
  const chartSeries = (series?.length
    ? series
    : profile
      ? [{ profile, label: "Kết quả hiện tại" }]
      : []).slice(-3).map((entry, index) => ({
    ...entry,
    color: entry.color ?? SERIES_COLORS[index],
  }));
  const currentProfile = chartSeries.at(-1)?.profile ?? profile;
  if (!currentProfile) return null;
  const hasCompleteProfile = chartSeries.some((entry) => entry.profile.isComplete);

  return (
    <section
      className="bg-white border border-[#e6eaf1] rounded-2xl p-5 sm:p-6 shadow-xs"
      aria-labelledby="skill-radar-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-[#175cdd]">
            Personalized skill profile
          </p>
          <h3 id="skill-radar-title" className="mt-1 text-base font-bold text-[#11213f]">
            {title}
          </h3>
          <p className="mt-1 text-xs text-[#64748b]">
            {subtitle}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
            hasCompleteProfile
              ? "bg-[#edf8f2] text-[#147054]"
              : "bg-[#fff8eb] text-[#a16207]"
          }`}
        >
          {hasCompleteProfile
            ? chartSeries.length === 1
              ? "Đã đánh giá đủ 4 kỹ năng"
              : `So sánh ${chartSeries.length} lần test gần nhất`
            : "Đang chờ đánh giá đủ 4 kỹ năng"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] items-center gap-5">
        <div className="mx-auto w-full max-w-[340px]">
          {chartSeries.length > 1 && (
            <div className="mb-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-[11px] text-slate-600">
              {chartSeries.map((entry) => (
                <span key={entry.label} className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                  {entry.label}
                </span>
              ))}
            </div>
          )}
          <svg
            viewBox="-40 0 400 320"
            className="w-full h-auto"
            role="img"
            aria-label="Biểu đồ radar gồm bốn kỹ năng IELTS"
          >
            <title>Biểu đồ radar 4 kỹ năng IELTS</title>
            {Array.from({ length: 10 }, (_, index) => (index + 1) / 10).map((level) => (
              <circle
                key={level}
                cx={CENTER}
                cy={CENTER}
                r={OUTER_RADIUS * level}
                fill="none"
                stroke="#dbe5f2"
                strokeWidth="1"
              />
            ))}
            {RADAR_SKILLS.map((skill) => {
              const [x, y] = AXIS_ENDS[skill];
              return (
                <line
                  key={skill}
                  x1={CENTER}
                  y1={CENTER}
                  x2={x}
                  y2={y}
                  stroke="#dbe5f2"
                  strokeWidth="1"
                />
              );
            })}
            {chartSeries.map((entry) => {
              if (!entry.profile.isComplete) return null;
              const points = RADAR_SKILLS.map((skill) => pointForBand(skill, entry.profile.skills[skill]!)).join(" ");
              return <polygon key={entry.label} points={points} fill={entry.color} fillOpacity="0.14" stroke={entry.color} strokeWidth="2.5" strokeLinejoin="round" />;
            })}
            {chartSeries.flatMap((entry) => RADAR_SKILLS.map((skill) => {
              const band = entry.profile.skills[skill];
              if (band === null) return null;
              const [x, y] = pointForBand(skill, band).split(",").map(Number);
              return <circle key={`${entry.label}-${skill}`} cx={x} cy={y} r="3" fill={entry.color} stroke="white" strokeWidth="1.25" />;
            }))}
            {RADAR_SKILLS.map((skill) => {
              const [x, y] = LABEL_POSITIONS[skill];
              return (
                <text
                  key={skill}
                  x={x}
                  y={y}
                  textAnchor={skill === "reading" ? "start" : skill === "writing" ? "end" : "middle"}
                  dominantBaseline="middle"
                  className="fill-[#334155] text-[10px] font-semibold"
                >
                  {LABELS[skill]}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {(["listening", "reading", "writing", "speaking"] as Skill[]).map((skill) => {
            const band = currentProfile.skills[skill];
            const highlighted = skill === currentProfile.weakestSkill || skill === currentProfile.strongestSkill;
            return (
              <div
                key={skill}
                className={`rounded-xl border p-3 ${
                  highlighted ? "border-[#cfe0ff] bg-[#f6f9ff]" : "border-[#edf1f6] bg-[#fbfcfe]"
                }`}
              >
                <p className="text-[11px] font-medium text-[#64748b]">{LABELS[skill]}</p>
                <p className="mt-0.5 text-lg font-bold text-[#11213f]">
                  {band === null ? "—" : band.toFixed(1)}
                </p>
                <p className="text-[10px] text-[#8c9bb3]">
                  {skill === currentProfile.weakestSkill
                    ? "Ưu tiên cải thiện"
                    : skill === currentProfile.strongestSkill
                      ? "Kỹ năng nổi bật"
                      : band === null
                        ? "Chưa đánh giá"
                        : "Band hiện tại"}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {!hasCompleteProfile && (
        <p className="mt-4 rounded-xl bg-[#fff8eb] px-3 py-2 text-xs text-[#925507]">
          Biểu đồ đầy đủ sẽ xuất hiện khi cả 4 kỹ năng có điểm hợp lệ. Hệ thống không tự tạo điểm cho kỹ năng còn thiếu.
        </p>
      )}
    </section>
  );
}
