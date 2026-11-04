export type CambridgeSkill = "listening" | "reading" | "writing" | "speaking";

export type CambridgePart = {
  id: string;
  label: string;
  questionStart?: number;
  questionEnd?: number;
  sourcePages: number[];
  audioPath?: string;
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

export type CambridgeListeningReview = {
  evidence: string;
  explanation: string;
  audioStartSeconds: number;
  audioEndSeconds: number;
};

/** A timestamped audioscript cue. Cues are kept separate from the scanned
 * book pages so the player can follow the supplied audio in real time. */
export type CambridgeTranscriptCue = {
  startSeconds: number;
  endSeconds: number;
  text: string;
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

/**
 * Evidence is transcribed directly from the supplied Cambridge audio and then
 * checked against the printed answer key. Add a record only after that review;
 * an absent record intentionally means the UI does not invent an explanation.
 */
const cambridgeListeningReviews: Record<string, Record<number, CambridgeListeningReview>> = {
  "academic-test-1-listening-1": {
    1: {
      evidence: "A-R-D-L-E-I-G-H Road.",
      explanation: "The caller spells the road name letter by letter, so the required answer is Ardleigh.",
      audioStartSeconds: 179.44,
      audioEndSeconds: 192.16,
    },
    2: {
      evidence: "No, I read about you in the newspaper.",
      explanation: "The caller says the advertisement was read in a newspaper.",
      audioStartSeconds: 207.2,
      audioEndSeconds: 213.12,
    },
    3: {
      evidence: "there's plenty of time to visit some of the theme parks there",
      explanation: "The first California tour includes time to visit theme parks in Los Angeles.",
      audioStartSeconds: 230.96,
      audioEndSeconds: 241.76,
    },
    4: {
      evidence: "I don't like the idea of staying in a tent.",
      explanation: "The caller rejects the campsite option because it would mean staying in a tent.",
      audioStartSeconds: 248.32,
      audioEndSeconds: 261.04,
    },
    5: {
      evidence: "Hearst Castle is on that road, so you could stop there.",
      explanation: "The agent confirms that the route passes Hearst Castle; the answer key accepts castle.",
      audioStartSeconds: 267.76,
      audioEndSeconds: 279.6,
    },
    6: {
      evidence: "That's good for beaches, isn't it?",
      explanation: "San Diego is described as a good place for beaches, so beach/beaches is accepted.",
      audioStartSeconds: 291.84,
      audioEndSeconds: 302.64,
    },
    7: {
      evidence: "covers 2,020 kilometers.",
      explanation: "The agent gives the first tour's total distance as 2,020 kilometres.",
      audioStartSeconds: 349.52,
      audioEndSeconds: 365.52,
    },
    8: {
      evidence: "That includes accommodation, car rental and a flight but no meals.",
      explanation: "The first tour price includes a flight; meals are specifically excluded.",
      audioStartSeconds: 366.08,
      audioEndSeconds: 374.48,
    },
    9: {
      evidence: "It's 429 pounds per person.",
      explanation: "The agent states the price of the second trip as 429 pounds per person.",
      audioStartSeconds: 387.6,
      audioEndSeconds: 394.72,
    },
    10: {
      evidence: "these hotels offer dinner in the price.",
      explanation: "Although flights are not included in the second trip, dinner is included by the hotels.",
      audioStartSeconds: 394.72,
      audioEndSeconds: 400.64,
    },
  },
};

export function listeningReviewFor(partId: string, questionNumber: number) {
  return cambridgeListeningReviews[partId]?.[questionNumber];
}

/**
 * This first timed audioscript was reviewed against the supplied Test 1,
 * Section 1 MP3. Do not infer a transcript for another section: its source
 * scan remains available after submission until its timestamps are reviewed.
 */
const cambridgeListeningTranscripts: Record<string, CambridgeTranscriptCue[]> = {
  "academic-test-1-listening-1": [
    { startSeconds: 0, endSeconds: 7.12, text: "Cambridge English, IELTS 10, published by Cambridge University Press and Cambridge English Language Assessment 2015." },
    { startSeconds: 20.8, endSeconds: 34.64, text: "You will hear a number of different recordings and you will have to answer questions on what you hear. There will be time for you to read the instructions and questions and you will have a chance to check your work." },
    { startSeconds: 35.84, endSeconds: 50.88, text: "All the recordings will be played once only. The test is in four sections. At the end of the test, you will be given 10 minutes to transfer your answers to an answer sheet." },
    { startSeconds: 50.88, endSeconds: 61.52, text: "Now turn to Section 1. You will hear a telephone conversation between a travel agent and a customer." },
    { startSeconds: 61.52, endSeconds: 108.22, text: "First, you have some time to look at questions 1 to 6. You will see that there is an example that has been done for you. On this occasion only, the conversation relating to this will be played first." },
    { startSeconds: 108.54, endSeconds: 117.3, text: "Travel agent: Good morning. World Tours. My name is Jamie. How can I help you?" },
    { startSeconds: 117.94, endSeconds: 124.58, text: "Customer: Good morning. I want some information on self-drive tours in the USA. Could you send me a brochure?" },
    { startSeconds: 124.58, endSeconds: 134.58, text: "Travel agent: Of course. Could I have your name, please? Customer: Andrea Brown. Narrator: The customer's name is Andrea Brown." },
    { startSeconds: 135.3, endSeconds: 148.34, text: "So Brown has been written in the space. Now we shall begin. You should answer the questions as you listen because you will not hear the recording a second time." },
    { startSeconds: 149.94, endSeconds: 160.56, text: "Listen carefully and answer questions 1 to 6. Travel agent: Good morning. World Tours. My name is Jamie. How can I help you?" },
    { startSeconds: 160.56, endSeconds: 174, text: "Customer: Good morning. I want some information on self-drive tours in the USA. Could you send me a brochure? Travel agent: Of course. Could I have your name, please? Customer: Andrea Brown. Travel agent: Thank you. And your address?" },
    { startSeconds: 174, endSeconds: 192.16, text: "Customer: 24 Ardleigh Road. Travel agent: Can you spell that? Customer: A-R-D-L-E-I-G-H Road. Travel agent: Postcode? Customer: B-H5 2OP. Travel agent: Thanks. And can I have your phone number?" },
    { startSeconds: 192.16, endSeconds: 207.2, text: "Customer: Is a mobile all right? Travel agent: Fine. Customer: It is 0786 643091. Travel agent: Thank you. And can I ask you where you heard about World Tours? From a friend, or did you see an advert somewhere?" },
    { startSeconds: 207.2, endSeconds: 218.08, text: "Customer: No, I read about you in the newspaper. Travel agent: Okay. I will get the brochures in the post to you, but can I give you some information over the phone?" },
    { startSeconds: 218.08, endSeconds: 230.96, text: "Travel agent: What kinds of things do you want to do on your holiday? Customer: I am interested in going to California with my family. I have got two children and we want to hire a car. Travel agent: Okay, we have a couple of self-drive tours there, visiting different places of interest in California." },
    { startSeconds: 230.96, endSeconds: 241.76, text: "Travel agent: The first one begins in Los Angeles and there is plenty of time to visit some of the theme parks there. Customer: Oh, that is something on my children's list, so I would want to include that." },
    { startSeconds: 241.76, endSeconds: 253.2, text: "Travel agent: Good. Then you drive to San Francisco. From San Francisco, you can drive to Yosemite Park, where you spend a couple of nights. You can choose to stay in a lodge or on the campsite." },
    { startSeconds: 253.76, endSeconds: 261.04, text: "Customer: I do not like the idea of staying in a tent. It would be too hot. Travel agent: Right. And the tour ends in Las Vegas." },
    { startSeconds: 261.04, endSeconds: 279.6, text: "Travel agent: Okay. The other trip we can arrange is slightly different. It starts in San Francisco. Then you drive south to Cambria. Customer: Someone told me there is a really nice castle near Cambria. Will we go near that? Travel agent: Hearst Castle is on that road, so you could stop there. Customer: Good. I would like to do that." },
    { startSeconds: 280.24, endSeconds: 291.2, text: "Customer: Does this trip also go into the desert? Travel agent: No. It continues to Santa Monica, where most people like to stop and do some shopping. Customer: We have enough of that at home, so that does not interest us." },
    { startSeconds: 291.84, endSeconds: 307.92, text: "Travel agent: Okay. Well, you could go straight on to San Diego. Customer: That is good for beaches, isn't it? Travel agent: That is right. That is a good place to relax, and your children might like to visit the zoo before flying home. Customer: No, I do not think so. We want some time for sunbathing and swimming." },
    { startSeconds: 311.31, endSeconds: 317.79, text: "Before you hear the rest of the conversation, you have some time to look at questions 7 to 10." },
    { startSeconds: 338.27, endSeconds: 349.52, text: "Now listen and answer questions 7 to 10. Customer: So, how many days are the trips, and how much do they cost?" },
    { startSeconds: 349.52, endSeconds: 365.52, text: "Travel agent: The first one I told you about is a self-drive tour through California, which lasts 12 days and covers 2,020 kilometres. The shortest journey is 206 kilometres and the longest is 632 kilometres." },
    { startSeconds: 366.08, endSeconds: 374.48, text: "Travel agent: The cost is 525 pounds per person. That includes accommodation, car rental and a flight, but no meals." },
    { startSeconds: 374.48, endSeconds: 387.6, text: "Customer: Okay. And the other trip? Travel agent: That lasts nine days, but you spend only three days on the road. You cover about 980 kilometres altogether. Customer: So is that cheaper then? Travel agent: Yes, it is almost 100 pounds cheaper." },
    { startSeconds: 387.6, endSeconds: 400.64, text: "Travel agent: It is 429 pounds per person, which is a good deal. Customer: So that covers accommodation and car hire. What about flights? Travel agent: They are not included, but these hotels offer dinner in the price." },
    { startSeconds: 401.44, endSeconds: 417.33, text: "Customer: Okay. Well, thank you very much. I will be in touch when I have had a chance to look at the brochure. Travel agent: I am pleased to help. Goodbye. Customer: Goodbye. Narrator: That is the end of Section 1." },
    { startSeconds: 417.33, endSeconds: 457.71, text: "You now have half a minute to check your answers. Now turn to Section 2." },
  ],
};

export function listeningTranscriptFor(partId: string) {
  return cambridgeListeningTranscripts[partId] ?? [];
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
        ]).map((part, index) => ({
          ...part,
          // Names are taken directly from the supplied Cambridge IELTS 10 Audio ZIP.
          audioPath: `/assets/cambridge-10/audio/IELTS%2010%20Test%20${number}%20Section%20${index + 1}.mp3`,
        })),
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
