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
  /** Scan pages from the book's Audioscripts section; reveal only after submission. */
  transcriptPages?: number[];
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
  "academic-test-2": {
    listening: {
      1: ["Hardie"], 2: ["19"], 3: ["GT8 2LC"], 4: ["hairdresser"], 5: ["dentist", "dentist's"],
      6: ["lighting"], 7: ["trains"], 8: ["safe"], 9: ["shower"], 10: ["training"],
      11: ["A"], 12: ["C"], 13: ["C"], 14: ["A"], 15: ["E"], 16: ["F"], 17: ["D"],
      18: ["H"], 19: ["A"], 20: ["B"], 21: ["B", "C"], 22: ["B", "C"],
      23: ["B", "E"], 24: ["B", "E"], 25: ["A"], 26: ["C"], 27: ["C"], 28: ["A"],
      29: ["B"], 30: ["A"], 31: ["competition"], 32: ["global"], 33: ["demand"],
      34: ["customers"], 35: ["regulation"], 36: ["project"], 37: ["flexible"],
      38: ["leadership"], 39: ["women"], 40: ["self-employed"],
    },
    reading: {
      1: ["iv"], 2: ["viii"], 3: ["vii"], 4: ["i"], 5: ["vi"], 6: ["ix"], 7: ["ii"],
      8: ["NOT GIVEN"], 9: ["TRUE"], 10: ["FALSE"], 11: ["FALSE"], 12: ["NOT GIVEN"],
      13: ["TRUE"], 14: ["A"], 15: ["D"], 16: ["F"], 17: ["D"], 18: ["B"], 19: ["D"],
      20: ["E"], 21: ["A"], 22: ["C"], 23: ["books and activities"],
      24: ["internal regulation", "self-regulation"], 25: ["emotional awareness"],
      26: ["spoon-feeding"], 27: ["B"], 28: ["H"], 29: ["L"], 30: ["G"], 31: ["D"],
      32: ["C"], 33: ["D"], 34: ["A"], 35: ["D"], 36: ["NOT GIVEN"], 37: ["NO"],
      38: ["YES"], 39: ["NOT GIVEN"], 40: ["NO"],
    },
  },
  "academic-test-3": {
    listening: {
      1: ["4", "four"], 2: ["46 Wombat"], 3: ["Thursday"], 4: ["8.30", "8:30"],
      5: ["red"], 6: ["lunch"], 7: ["glasses"], 8: ["BALL", "ball"], 9: ["aunt"], 10: ["month"],
      11: ["C", "E"], 12: ["C", "E"], 13: ["B"], 14: ["A"], 15: ["C"], 16: ["B"], 17: ["C"],
      18: ["B"], 19: ["D"], 20: ["A"], 21: ["C"], 22: ["A"], 23: ["A"], 24: ["B"], 25: ["B"],
      26: ["E"], 27: ["D"], 28: ["A"], 29: ["G"], 30: ["C"],
      31: ["achievement", "achievements"], 32: ["personality", "character"], 33: ["situational"],
      34: ["friend"], 35: ["aspirations", "ambitions"], 36: ["style"], 37: ["development"],
      38: ["vision"], 39: ["structures"], 40: ["innovation", "innovations"],
    },
    reading: {
      1: ["ii"], 2: ["i"], 3: ["viii"], 4: ["vii"], 5: ["TRUE"], 6: ["NOT GIVEN"],
      7: ["NOT GIVEN"], 8: ["TRUE"], 9: ["NOT GIVEN"], 10: ["FALSE"],
      11: ["source of income", "industry"], 12: ["employer"], 13: ["domestic tourism"],
      14: ["C"], 15: ["B"], 16: ["H"], 17: ["B"], 18: ["E"], 19: ["sun", "light"], 20: ["upper"],
      21: ["dry"], 22: ["north"], 23: ["FALSE"], 24: ["TRUE"], 25: ["NOT GIVEN"], 26: ["B"],
      27: ["C"], 28: ["F"], 29: ["I"], 30: ["G"], 31: ["D"], 32: ["C"], 33: ["A"], 34: ["D"],
      35: ["C"], 36: ["NO"], 37: ["YES"], 38: ["NOT GIVEN"], 39: ["YES"], 40: ["NOT GIVEN"],
    },
  },
  "academic-test-4": {
    listening: {
      1: ["Pargetter"], 2: ["East"], 3: ["library"], 4: ["morning", "mornings"], 5: ["postbox"],
      6: ["prices"], 7: ["glass"], 8: ["cooker"], 9: ["week"], 10: ["fence"], 11: ["B"], 12: ["B"],
      13: ["A"], 14: ["A"], 15: ["C"], 16: ["trains"], 17: ["dark"], 18: ["games"], 19: ["guided tour"],
      20: ["ladder", "ladders"], 21: ["A", "E"], 22: ["A", "E"], 23: ["B", "C"], 24: ["B", "C"],
      25: ["D"], 26: ["F"], 27: ["G"], 28: ["B"], 29: ["E"], 30: ["C"], 31: ["C"], 32: ["B"],
      33: ["C"], 34: ["metal", "metals"], 35: ["space"], 36: ["memory"], 37: ["solar"], 38: ["oil"],
      39: ["waste"], 40: ["tests"],
    },
    reading: {
      1: ["spread"], 2: ["10", "ten times"], 3: ["below"], 4: ["fuel"], 5: ["seasons"],
      6: ["homes", "housing"], 7: ["TRUE"], 8: ["FALSE"], 9: ["TRUE"], 10: ["TRUE"], 11: ["NOT GIVEN"],
      12: ["FALSE"], 13: ["FALSE"], 14: ["transformation", "change"], 15: ["young age"], 16: ["optimism"],
      17: ["skills", "techniques"], 18: ["negative emotions", "feelings"], 19: ["E"], 20: ["C"], 21: ["G"],
      22: ["A"], 23: ["E"], 24: ["C"], 25: ["G"], 26: ["H"], 27: ["C"], 28: ["D"], 29: ["C"],
      30: ["B"], 31: ["A"], 32: ["F"], 33: ["G"], 34: ["A"], 35: ["B"], 36: ["D"], 37: ["NOT GIVEN"],
      38: ["YES"], 39: ["NO"], 40: ["YES"],
    },
  },
  "general-test-a": {
    reading: {
      1: ["TRUE"], 2: ["FALSE"], 3: ["NOT GIVEN"], 4: ["TRUE"], 5: ["FALSE"], 6: ["TRUE"],
      7: ["NOT GIVEN"], 8: ["C"], 9: ["E"], 10: ["D"], 11: ["E"], 12: ["C"], 13: ["A"], 14: ["G"],
      15: ["decision maker"], 16: ["impact"], 17: ["opening"], 18: ["white envelope"], 19: ["brochure"],
      20: ["free sample"], 21: ["response rate"], 22: ["international profile"], 23: ["publication"],
      24: ["website content"], 25: ["audience"], 26: ["purpose"], 27: ["post-graduate"],
      28: ["E"], 29: ["A"], 30: ["A"], 31: ["B"], 32: ["E"], 33: ["F"], 34: ["A"], 35: ["B"],
      36: ["D"], 37: ["E"], 38: ["I"], 39: ["G"], 40: ["B"],
    },
  },
  "general-test-b": {
    reading: {
      1: ["FALSE"], 2: ["FALSE"], 3: ["TRUE"], 4: ["NOT GIVEN"], 5: ["NOT GIVEN"], 6: ["TRUE"],
      7: ["FALSE"], 8: ["ii"], 9: ["x"], 10: ["v"], 11: ["iii"], 12: ["ix"], 13: ["vi"], 14: ["iv"],
      15: ["FALSE"], 16: ["FALSE"], 17: ["NOT GIVEN"], 18: ["TRUE"], 19: ["TRUE"], 20: ["FALSE"],
      21: ["E"], 22: ["B"], 23: ["G"], 24: ["H"], 25: ["C"], 26: ["G"], 27: ["D"], 28: ["C"],
      29: ["F"], 30: ["A"], 31: ["E"], 32: ["A"], 33: ["B"], 34: ["C"], 35: ["B"], 36: ["C"],
      37: ["C"], 38: ["prepared mind"], 39: ["iodine vapour", "iodine vapor"], 40: ["chemical", "chemicals"],
    },
  },
};

/** Groups explicitly marked IN EITHER ORDER in the book's answer key. */
export const cambridgeAnswerGroups: Partial<Record<string, Partial<Record<"listening" | "reading", CambridgeAnswerGroup[]>>>> = {
  "academic-test-1": {
    listening: [{ numbers: [11, 12], accepted: ["A", "C"] }],
  },
  "academic-test-2": {
    listening: [
      { numbers: [21, 22], accepted: ["B", "C"] },
      { numbers: [23, 24], accepted: ["B", "E"] },
    ],
  },
  "academic-test-3": {
    listening: [{ numbers: [11, 12], accepted: ["C", "E"] }],
  },
  "academic-test-4": {
    listening: [
      { numbers: [21, 22], accepted: ["A", "E"] },
      { numbers: [23, 24], accepted: ["B", "C"] },
    ],
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
    // Test 3 ends and Test 4 begins on scan page 146, so that page belongs
    // to both transcript ranges. These are scan-page numbers, not printed page labels.
    transcriptPages:
      number === 3 ? pages(141, 146) : number === 4 ? pages(146, 151) : pages(131 + (number - 1) * 5, 135 + (number - 1) * 5),
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
