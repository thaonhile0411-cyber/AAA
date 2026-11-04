export type PracticeSkill = "reading" | "listening" | "writing" | "speaking";

export type PracticeResource = {
  collection: string;
  title: string;
  description: string;
  skills: PracticeSkill[];
  url: string;
};

const dol = "https://tuhoc.dolenglish.vn/luyen-thi-ielts";
const sourceSuffix = "?utm_source=woot6";
const readingListening: PracticeSkill[] = ["reading", "listening"];

export const practiceResources: PracticeResource[] = [
  ...[19, 18, 17, 16, 15, 14, 13, 12].map((edition) => ({
    collection: "Cambridge IELTS",
    title: `Cambridge IELTS ${edition}`,
    description: "Bộ đề Reading & Listening, Test 1–4.",
    skills: readingListening,
    url: `${dol}/cambridge-ielts-${edition}-reading-listening-test-1-2-3-4-questions-answer-key-de-bai-dap-an-giai-thich-chi-tiet-free-pdf-download${sourceSuffix}`,
  })),
  ...[
    [1, "1–6"],
    [2, "1–9"],
    [3, "1–9"],
    [4, "1–9"],
    [5, "1–9"],
    [6, "1–9"],
  ].map(([edition, tests]) => ({
    collection: "Actual Test",
    title: `IELTS Recent Actual Test ${edition}`,
    description: `Bộ đề Reading & Listening, Test ${tests}.`,
    skills: readingListening,
    url: `${dol}/ielts-recent-actual-test-${edition}-reading-listening-test-${tests.toString().replaceAll("–", "-")}-questions-answer-key-de-bai-dap-an-giai-thich-chi-tiet-free-pdf-download${sourceSuffix}`,
  })),
  ...[
    [1, "1–6"],
    [2, "1–6"],
    [3, "1–7"],
  ].map(([edition, tests]) => ({
    collection: "IELTS Practice Test Plus",
    title: `IELTS Practice Test Plus ${edition}`,
    description: `Bộ đề Reading & Listening, Test ${tests}.`,
    skills: readingListening,
    url: `${dol}/ielts-practice-test-plus-${edition}-reading-listening-test-${tests.toString().replaceAll("–", "-")}-questions-answer-key-de-bai-dap-an-giai-thich-chi-tiet-free-pdf-download${sourceSuffix}`,
  })),
  {
    collection: "IELTS Trainer",
    title: "IELTS Trainer",
    description: "Tài liệu Reading & Listening, Test 1–6.",
    skills: readingListening,
    url: `${dol}/ielts-trainer-reading-listening-test-1-2-3-4-5-6-questions-answer-key-de-bai-dap-an-giai-thich-chi-tiet-free-pdf-download${sourceSuffix}`,
  },
  {
    collection: "Official Guide to IELTS",
    title: "Official Cambridge Guide to IELTS",
    description: "Tài liệu Reading & Listening, Test 1–7.",
    skills: readingListening,
    url: `${dol}/official-cambridge-guide-to-ielts-reading-listening-test-1-2-3-4-5-6-7-questions-answer-key-de-bai-dap-an-giai-thich-chi-tiet-free-pdf-download${sourceSuffix}`,
  },
  {
    collection: "DOL English Samples",
    title: "IELTS Writing Samples",
    description:
      "Bài mẫu Writing Academic & General, dàn ý, từ vựng và bài tập.",
    skills: ["writing"],
    url: "https://tuhoc.dolenglish.vn/category/tong-hop-sample-ielts-writing",
  },
  {
    collection: "DOL English Samples",
    title: "IELTS Speaking Samples",
    description:
      "Bài mẫu Speaking Part 1, 2, 3 kèm chủ đề, từ vựng và bài tập.",
    skills: ["speaking"],
    url: "https://tuhoc.dolenglish.vn/category/tong-hop-bai-mau-ielts-speaking-sample",
  },
];

export const resourceCollections = [
  "Tất cả",
  ...new Set(practiceResources.map((resource) => resource.collection)),
];

export const resourceSheetUrl =
  "https://docs.google.com/spreadsheets/d/19xRTcIW4BzZHeHq34kAOUg8mol4K24cn98FVv5H293s/edit?gid=723818386#gid=723818386";
