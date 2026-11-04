export type CambridgeSkill = "listening" | "reading" | "writing" | "speaking";

export type CambridgePart = {
  id: string;
  label: string;
  questionStart?: number;
  questionEnd?: number;
  sourcePages: number[];
};

export type CambridgeSkillSection = {
  skill: CambridgeSkill;
  label: string;
  parts: CambridgePart[];
};

export type CambridgeTest = {
  id: string;
  title: string;
  edition: "academic" | "general";
  sourcePages: number[];
  skills: CambridgeSkillSection[];
};

function pages(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function numberedParts(
  prefix: string,
  label: string,
  ranges: Array<[number, number, number, number, number]>,
) {
  return ranges.map(([number, questionStart, questionEnd, pageStart, pageEnd]) => ({
    id: `${prefix}-${number}`,
    label: `${label} ${number}`,
    questionStart,
    questionEnd,
    sourcePages: pages(pageStart, pageEnd),
  }));
}

function academicTest(
  number: number,
  pageStart: number,
  readingStart: number,
  writingStart: number,
  speakingPage: number,
): CambridgeTest {
  const id = `academic-test-${number}`;
  return {
    id,
    title: `Cambridge IELTS 10 – Test ${number}`,
    edition: "academic",
    sourcePages: pages(pageStart, speakingPage),
    skills: [
      {
        skill: "listening",
        label: "Listening",
        parts: numberedParts(`${id}-listening`, "Section", [
          [1, 1, 10, pageStart, pageStart + 1],
          [2, 11, 20, pageStart + 2, pageStart + 3],
          [3, 21, 30, pageStart + 4, pageStart + 5],
          [4, 31, 40, pageStart + 6, readingStart - 1],
        ]),
      },
      {
        skill: "reading",
        label: "Academic Reading",
        parts: numberedParts(`${id}-reading`, "Reading Passage", [
          [1, 1, 13, readingStart, readingStart + 3],
          [2, 14, 26, readingStart + 4, readingStart + 7],
          [3, 27, 40, readingStart + 8, writingStart - 1],
        ]),
      },
      {
        skill: "writing",
        label: "Writing",
        parts: [
          { id: `${id}-writing-1`, label: "Writing Task 1", sourcePages: [writingStart] },
          { id: `${id}-writing-2`, label: "Writing Task 2", sourcePages: [writingStart + 1] },
        ],
      },
      {
        skill: "speaking",
        label: "Speaking",
        parts: [
          { id: `${id}-speaking-1`, label: "Speaking Part 1", sourcePages: [speakingPage] },
          { id: `${id}-speaking-2`, label: "Speaking Part 2", sourcePages: [speakingPage] },
          { id: `${id}-speaking-3`, label: "Speaking Part 3", sourcePages: [speakingPage] },
        ],
      },
    ],
  };
}

export const cambridgeIelts10Tests: CambridgeTest[] = [
  academicTest(1, 11, 18, 31, 33),
  academicTest(2, 34, 42, 55, 57),
  academicTest(3, 58, 65, 78, 80),
  academicTest(4, 81, 89, 102, 104),
  {
    id: "general-test-a",
    title: "Cambridge IELTS 10 – General Training Test A",
    edition: "general",
    sourcePages: pages(105, 117),
    skills: [
      {
        skill: "reading",
        label: "General Training Reading",
        parts: [
          { id: "general-a-reading-1", label: "Section 1", questionStart: 1, questionEnd: 14, sourcePages: pages(105, 108) },
          { id: "general-a-reading-2", label: "Section 2", questionStart: 15, questionEnd: 27, sourcePages: pages(109, 112) },
          { id: "general-a-reading-3", label: "Section 3", questionStart: 28, questionEnd: 40, sourcePages: pages(113, 116) },
        ],
      },
      {
        skill: "writing",
        label: "General Training Writing",
        parts: [
          { id: "general-a-writing-1", label: "Writing Task 1", sourcePages: [117] },
          { id: "general-a-writing-2", label: "Writing Task 2", sourcePages: [117] },
        ],
      },
    ],
  },
  {
    id: "general-test-b",
    title: "Cambridge IELTS 10 – General Training Test B",
    edition: "general",
    sourcePages: pages(118, 130),
    skills: [
      {
        skill: "reading",
        label: "General Training Reading",
        parts: [
          { id: "general-b-reading-1", label: "Section 1", questionStart: 1, questionEnd: 14, sourcePages: pages(118, 121) },
          { id: "general-b-reading-2", label: "Section 2", questionStart: 15, questionEnd: 27, sourcePages: pages(122, 125) },
          { id: "general-b-reading-3", label: "Section 3", questionStart: 28, questionEnd: 40, sourcePages: pages(126, 129) },
        ],
      },
      {
        skill: "writing",
        label: "General Training Writing",
        parts: [
          { id: "general-b-writing-1", label: "Writing Task 1", sourcePages: [130] },
          { id: "general-b-writing-2", label: "Writing Task 2", sourcePages: [130] },
        ],
      },
    ],
  },
];

export const cambridgeSkillLabels: Record<CambridgeSkill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};
