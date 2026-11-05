import type { GradableQuestion } from "@/lib/practice-grading";

export type TestSkill = "reading" | "listening" | "writing" | "speaking";

export type OriginalPracticeTest = {
  slug: string;
  skill: TestSkill;
  title: string;
  summary: string;
  prompt: string;
  question?: GradableQuestion;
};

const themes = [
  "Community gardens",
  "Remote work habits",
  "Public libraries",
  "Healthy routines",
  "Local transport",
  "Learning new skills",
  "City green spaces",
  "Digital wellbeing",
  "Volunteering",
  "Travel planning",
] as const;

function title(skill: TestSkill, index: number) {
  return `${skill[0].toUpperCase()}${skill.slice(1)} Practice ${String(index + 1).padStart(2, "0")}`;
}

export const originalPracticeTests: OriginalPracticeTest[] = themes.flatMap(
  (theme, index) => {
    const number = index + 1;
    const readingPassage = `In a small neighbourhood, a group of residents started a project about ${theme.toLowerCase()}. They met once a week, shared simple ideas, and adjusted their plan after listening to feedback. Within three months, more people joined because the project was practical, welcoming, and easy to try.`;
    const listeningScript = `You will hear a short announcement about ${theme.toLowerCase()}. The organiser says the activity begins on Saturday morning. Participants should bring a notebook, arrive ten minutes early, and tell a volunteer if they need any support.`;
    return [
      {
        slug: `original-reading-${number}`,
        skill: "reading" as const,
        title: title("reading", index),
        summary: `Bài đọc tự soạn: ${theme}.`,
        prompt: readingPassage,
        question:
          index % 2 === 0
            ? {
                id: `reading-${number}-q1`,
                type: "multiple_choice" as const,
                prompt: "Why did more people join the project?",
                options: [
                  "It was practical and welcoming.",
                  "Residents were required to attend.",
                  "It finished in one week.",
                  "It used expensive equipment.",
                ],
                acceptedAnswers: ["It was practical and welcoming."],
                displayAnswer: "It was practical and welcoming.",
                explanation:
                  "The final sentence directly says that more people joined because the project was practical, welcoming, and easy to try.",
                evidence: "more people joined because the project was practical, welcoming, and easy to try",
              }
            : {
                id: `reading-${number}-q1`,
                type: "gap_fill" as const,
                prompt:
                  "Complete the sentence: The project was practical, welcoming, and ____ to try.",
                acceptedAnswers: ["easy"],
                displayAnswer: "easy",
                explanation:
                  "The passage describes the project as easy to try, which explains why participation increased.",
                evidence: "the project was practical, welcoming, and easy to try",
              },
      },
      {
        slug: `original-listening-${number}`,
        skill: "listening" as const,
        title: title("listening", index),
        summary: `Bài nghe giọng đọc máy từ nội dung tự soạn: ${theme}.`,
        prompt: listeningScript,
        question:
          index % 2 === 0
            ? {
                id: `listening-${number}-q1`,
                type: "multiple_choice" as const,
                prompt: "What should participants bring?",
                options: [
                  "A notebook",
                  "A passport",
                  "Sports equipment",
                  "A laptop",
                ],
                acceptedAnswers: ["A notebook"],
                displayAnswer: "A notebook",
                explanation:
                  "The organiser explicitly tells participants to bring a notebook; the other objects are never requested.",
                evidence: "Participants should bring a notebook",
              }
            : {
                id: `listening-${number}-q1`,
                type: "gap_fill" as const,
                prompt: "Complete the instruction: Participants should bring a ____.",
                acceptedAnswers: ["notebook", "a notebook"],
                displayAnswer: "notebook",
                explanation:
                  "The announcement says that every participant should bring a notebook to the activity.",
                evidence: "Participants should bring a notebook",
              },
      },
      {
        slug: `original-writing-${number}`,
        skill: "writing" as const,
        title: title("writing", index),
        summary: `Đề viết tự soạn theo chủ đề ${theme}.`,
        prompt: `Write at least 120 words about ${theme.toLowerCase()}. Describe one benefit, one challenge, and give one practical recommendation. Support your ideas with a clear example.`,
      },
      {
        slug: `original-speaking-${number}`,
        skill: "speaking" as const,
        title: title("speaking", index),
        summary: `Đề nói tự soạn theo chủ đề ${theme}.`,
        prompt: `Speak for one to two minutes about ${theme.toLowerCase()}. Say what it means to you, describe a personal example, and explain whether it could be useful for other people.`,
      },
    ];
  },
);

export const practiceSkills: { value: TestSkill | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "reading", label: "Reading" },
  { value: "listening", label: "Listening" },
  { value: "writing", label: "Writing" },
  { value: "speaking", label: "Speaking" },
];

export function findOriginalPracticeTest(slug: string) {
  return originalPracticeTests.find((test) => test.slug === slug);
}
