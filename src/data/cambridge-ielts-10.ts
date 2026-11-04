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

/** Answer keys transcribed from the book's dedicated Answer Keys pages.
 * Keep this separate from question-page assets so answers can never be
 * rendered before a learner submits a part. */
export type CambridgeAnswerKey = Record<number, string[]>;
export type CambridgeAnswerGroup = {
  numbers: number[];
  accepted: string[];
};

export const cambridgeAnswerKeys: Partial<Record<string, Partial<Record<"listening" | "reading", CambridgeAnswerKey>>>> = {
  "academic-test-1": {
    listening: {
      1: ["Ardleigh"], 2: ["newspaper"], 3: ["theme"], 4: ["tent"], 5: ["castle"],
      6: ["beach", "beaches"], 7: ["2020"], 8: ["flight"], 9: ["429"], 10: ["dinner"],
      11: ["A", "C"], 12: ["A", "C"], 13: ["health problems"], 14: ["safety rules"],
      15: ["plan"], 16: ["joining"], 17: ["free entry"], 18: ["peak"], 19: ["guests"],
      20: ["photo card", "photo cards"], 21: ["C"], 22: ["A"], 23: ["B"], 24: ["A"],
      25: ["C"], 26: ["presentation"], 27: ["model"], 28: ["material", "materials"],
      29: ["grant"], 30: ["technical"], 31: ["gene"], 32: ["power", "powers"],
      33: ["strangers"], 34: ["erosion"], 35: ["islands"], 36: ["roads"], 37: ["fishing"],
      38: ["reproduction"], 39: ["method", "methods"], 40: ["expansion"],
    },
    reading: {
      1: ["FALSE"], 2: ["TRUE"], 3: ["NOT GIVEN"], 4: ["NOT GIVEN"], 5: ["TRUE"],
      6: ["pavilions"], 7: ["drought"], 8: ["tourists"], 9: ["earthquake"],
      10: ["4", "four sides"], 11: ["tank"], 12: ["verandas", "verandahs"], 13: ["underwater"],
      14: ["viii"], 15: ["iii"], 16: ["xi"], 17: ["i"], 18: ["v"], 19: ["x"],
      20: ["ii"], 21: ["iv"], 22: ["TRUE"], 23: ["FALSE"], 24: ["NOT GIVEN"],
      25: ["NOT GIVEN"], 26: ["FALSE"], 27: ["C"], 28: ["A"], 29: ["D"],
      30: ["B"], 31: ["G"], 32: ["E"], 33: ["A"], 34: ["F"], 35: ["B"],
      36: ["NO"], 37: ["YES"], 38: ["NOT GIVEN"], 39: ["NOT GIVEN"], 40: ["NO"],
    },
  },
};

/** Groups explicitly marked IN EITHER ORDER in the book's answer key. */
export const cambridgeAnswerGroups: Partial<Record<string, Partial<Record<"listening" | "reading", CambridgeAnswerGroup[]>>>> = {
  "academic-test-1": {
    listening: [{ numbers: [11, 12], accepted: ["A", "C"] }],
  },
};

export function answerKeyFor(testId: string, skill: CambridgeSkill) {
  if (skill !== "listening" && skill !== "reading") return undefined;
  return cambridgeAnswerKeys[testId]?.[skill];
}

export function answerGroupsFor(testId: string, skill: CambridgeSkill) {
  if (skill !== "listening" && skill !== "reading") return [];
  return cambridgeAnswerGroups[testId]?.[skill] ?? [];
}

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
