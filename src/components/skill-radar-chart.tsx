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
  listening: [120, 25],
  reading: [215, 120],
  speaking: [120, 215],
  writing: [25, 120],
};

const LABEL_POSITIONS: Record<Skill, readonly [number, number]> = {
  listening: [120, 14],
  reading: [235, 124],
  speaking: [120, 238],
  writing: [5, 124],
};

const CENTER = 120;
const OUTER_RADIUS = 95;

function pointForBand(skill: Skill, band: number): string {
  const [axisX, axisY] = AXIS_ENDS[skill];
  const ratio = band / 9;
  const x = CENTER + (axisX - CENTER) * ratio;
  const y = CENTER + (axisY - CENTER) * ratio;
  return `${x.toFixed(1)},${y.toFixed(1)}`;
}

function diamond(size: number): string {
  return `${CENTER},${CENTER - size} ${CENTER + size},${CENTER} ${CENTER},${CENTER + size} ${CENTER - size},${CENTER}`;
}

type SkillRadarChartProps = {
  profile: LearnerSkillProfile;
  title?: string;
  subtitle?: string;
};

/** Four-axis IELTS profile chart. Grammar and vocabulary are intentionally not axes. */
export function SkillRadarChart({
  profile,
  title = "Hồ sơ năng lực 4 kỹ năng",
  subtitle = "Listening, Reading, Writing và Speaking trên thang IELTS 9.0.",
}: SkillRadarChartProps) {
  const polygonPoints = profile.isComplete
    ? RADAR_SKILLS.map((skill) => pointForBand(skill, profile.skills[skill]!)).join(" ")
    : null;

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
            profile.isComplete
              ? "bg-[#edf8f2] text-[#147054]"
              : "bg-[#fff8eb] text-[#a16207]"
          }`}
        >
          {profile.isComplete ? "Đã đánh giá đủ 4 kỹ năng" : "Đang chờ đánh giá đủ 4 kỹ năng"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] items-center gap-5">
        <div className="mx-auto w-full max-w-[340px]">
          <svg
            viewBox="0 0 240 250"
            className="w-full h-auto"
            role="img"
            aria-label="Biểu đồ radar gồm bốn kỹ năng IELTS"
          >
            <title>Biểu đồ radar 4 kỹ năng IELTS</title>
            {[1 / 3, 2 / 3, 1].map((level) => (
              <polygon
                key={level}
                points={diamond(OUTER_RADIUS * level)}
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
            {polygonPoints && (
              <polygon
                points={polygonPoints}
                fill="#2563eb"
                fillOpacity="0.18"
                stroke="#175cdd"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
            )}
            {RADAR_SKILLS.map((skill) => {
              const band = profile.skills[skill];
              if (band === null) return null;
              const [x, y] = pointForBand(skill, band).split(",").map(Number);
              return <circle key={skill} cx={x} cy={y} r="4.5" fill="#175cdd" stroke="white" strokeWidth="2" />;
            })}
            {RADAR_SKILLS.map((skill) => {
              const [x, y] = LABEL_POSITIONS[skill];
              const band = profile.skills[skill];
              return (
                <text
                  key={skill}
                  x={x}
                  y={y}
                  textAnchor={skill === "reading" ? "start" : skill === "writing" ? "end" : "middle"}
                  dominantBaseline="middle"
                  className="fill-[#334155] text-[10px] font-semibold"
                >
                  {`${LABELS[skill]} ${band === null ? "—" : band.toFixed(1)}`}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {(["listening", "reading", "writing", "speaking"] as Skill[]).map((skill) => {
            const band = profile.skills[skill];
            const highlighted = skill === profile.weakestSkill || skill === profile.strongestSkill;
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
                  {skill === profile.weakestSkill
                    ? "Ưu tiên cải thiện"
                    : skill === profile.strongestSkill
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

      {!profile.isComplete && (
        <p className="mt-4 rounded-xl bg-[#fff8eb] px-3 py-2 text-xs text-[#925507]">
          Biểu đồ đầy đủ sẽ xuất hiện khi cả 4 kỹ năng có điểm hợp lệ. Hệ thống không tự tạo điểm cho kỹ năng còn thiếu.
        </p>
      )}
    </section>
  );
}
