import type {
  GrammarSuggestion,
  ShortQuestion,
  SpeakingEdition,
  SpeakingSource,
  SpeakingTopic,
  SpeakingVocabulary,
} from "./types";

const question = (id: string, text: string): ShortQuestion => ({
  id,
  text,
  audioSrc: `/audio/speaking/${id}.wav`,
});
const vocabulary = (
  items: [string, string, string, string][],
): SpeakingVocabulary[] =>
  items.map(([term, ipa, meaningVi, example]) => ({
    term,
    ipa,
    meaningVi,
    example,
  }));
const grammar = (items: [string, string, string][]): GrammarSuggestion[] =>
  items.map(([structure, usageVi, example]) => ({
    structure,
    usageVi,
    example,
  }));

const officialFormatSource: SpeakingSource = {
  title: "IELTS Academic: Speaking test format",
  publisher: "IELTS",
  url: "https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-speaking",
  accessedAt: "2026-11-04",
  kind: "official-format",
};
const forecastThemeSource: SpeakingSource = {
  title: "IELTS Speaking Forecast: Topics to Prepare (Sep–Dec 2026)",
  publisher: "The IELTS Bro",
  url: "https://www.theieltsbro.com/ielts-speaking-forecast",
  accessedAt: "2026-11-04",
  kind: "unofficial-forecast",
};
const edition = (
  label: string,
  status: SpeakingEdition["status"],
  sources: SpeakingSource[],
): SpeakingEdition => ({
  label,
  status,
  sources,
  updatedAt: "2026-11-04",
});
const suggestedBand: SpeakingTopic["suggestedBand"] = {
  "part-1": "7.0+",
  "part-2": "7.0+",
  "part-3": "8.0+",
};

// Questions are original practice content. Forecast sources support topic selection only;
// they are never presented as official IELTS questions or verified exam content.
export const speakingTopics: SpeakingTopic[] = [
  {
    id: "hometown",
    title: "Hometown",
    descriptionVi: "Quê hương, cộng đồng và những thay đổi ở nơi bạn sống.",
    editions: [
      edition("2026-Q4", "unverified-prediction", [
        forecastThemeSource,
        officialFormatSource,
      ]),
      edition("2026-Q3", "original-practice", [officialFormatSource]),
      edition("2025-Q4", "original-practice", [officialFormatSource]),
    ],
    updatedAt: "2026-11-04",
    suggestedBand,
    part1: [
      question("hometown-p1-01", "Where is your hometown?"),
      question("hometown-p1-02", "What do you like most about your hometown?"),
      question(
        "hometown-p1-03",
        "Has your hometown changed much in recent years?",
      ),
      question(
        "hometown-p1-04",
        "Would you like to live in your hometown in the future?",
      ),
    ],
    part2: {
      ...question(
        "hometown-p2-01",
        "Describe a place in your hometown that you enjoy visiting.",
      ),
      cuePoints: [
        "where it is",
        "what it is like",
        "what you do there",
        "and explain why you enjoy visiting it",
      ],
    },
    part3: [
      question(
        "hometown-p3-01",
        "Why do some people prefer living in small towns to large cities?",
      ),
      question(
        "hometown-p3-02",
        "How can urban development affect local communities?",
      ),
      question(
        "hometown-p3-03",
        "Should governments protect old buildings in growing cities?",
      ),
      question(
        "hometown-p3-04",
        "How might people's preferences about where to live change in the future?",
      ),
    ],
    vocabulary: vocabulary([
      [
        "close-knit",
        "/ˌkloʊs ˈnɪt/",
        "gắn bó, có quan hệ gần gũi",
        "I grew up in a close-knit community where neighbours helped each other.",
      ],
      [
        "picturesque",
        "/ˌpɪk.tʃəˈresk/",
        "đẹp như tranh",
        "There is a picturesque riverside walk near my house.",
      ],
      [
        "amenities",
        "/əˈmen.ə.t̬iz/",
        "các tiện ích, cơ sở phục vụ sinh hoạt",
        "My neighbourhood has good amenities, including a library and a sports centre.",
      ],
      [
        "a sense of belonging",
        "/ə sens əv bɪˈlɔːŋ.ɪŋ/",
        "cảm giác gắn bó, thuộc về một nơi hoặc cộng đồng",
        "Knowing my neighbours gives me a sense of belonging.",
      ],
      [
        "cultural heritage",
        "/ˈkʌl.tʃɚ.əl ˈher.ɪ.t̬ɪdʒ/",
        "di sản văn hóa",
        "The old market is an important part of our cultural heritage.",
      ],
    ]),
    grammar: {
      "part-1": grammar([
        [
          "Present simple + because",
          "Mô tả quê hương và giải thích ngắn gọn sở thích.",
          "I like my hometown because people are friendly.",
        ],
        [
          "Present perfect + over the past…",
          "Mô tả những thay đổi từ quá khứ đến hiện tại.",
          "My hometown has changed a lot over the past five years.",
        ],
        [
          "would like to + verb",
          "Nói về mong muốn trong tương lai.",
          "I would like to return there after university.",
        ],
      ]),
      "part-2": grammar([
        [
          "used to + verb",
          "So sánh một địa điểm trước đây và bây giờ.",
          "The park used to be much smaller when I was a child.",
        ],
        [
          "Whenever + clause, present simple",
          "Kể một hoạt động thường lặp lại.",
          "Whenever I feel stressed, I go there for a walk.",
        ],
        [
          "What I enjoy most is…",
          "Nhấn mạnh lý do bạn thích địa điểm đó.",
          "What I enjoy most is the peaceful atmosphere.",
        ],
      ]),
      "part-3": grammar([
        [
          "Although + clause, clause",
          "Thể hiện hai mặt của một vấn đề.",
          "Although cities offer more jobs, small towns can provide a stronger sense of community.",
        ],
        [
          "If + past simple, would + verb",
          "Đưa ra tình huống giả định và hệ quả.",
          "If cities invested in parks, residents would have more places to meet.",
        ],
        [
          "may / might + verb",
          "Dự đoán có mức độ thận trọng.",
          "Remote work might encourage more people to move to smaller towns.",
        ],
      ]),
    },
  },
  {
    id: "work-and-study",
    title: "Work & Study",
    descriptionVi: "Việc học, kỹ năng mới và định hướng nghề nghiệp.",
    editions: [
      edition("2026-Q4", "unverified-prediction", [
        forecastThemeSource,
        officialFormatSource,
      ]),
      edition("2026-Q3", "original-practice", [officialFormatSource]),
    ],
    updatedAt: "2026-11-04",
    suggestedBand,
    part1: [
      question("study-p1-01", "Do you work or are you a student?"),
      question(
        "study-p1-02",
        "What do you enjoy most about your work or studies?",
      ),
      question(
        "study-p1-03",
        "Do you prefer working alone or with other people?",
      ),
      question(
        "study-p1-04",
        "What would you like to do after you finish your current work or studies?",
      ),
    ],
    part2: {
      ...question(
        "study-p2-01",
        "Describe a useful skill that you learned from another person.",
      ),
      cuePoints: [
        "what the skill was",
        "who you learned it from",
        "how you learned it",
        "and explain why this skill has been useful to you",
      ],
    },
    part3: [
      question(
        "study-p3-01",
        "What skills do young people need before starting their first job?",
      ),
      question(
        "study-p3-02",
        "Is practical experience more valuable than academic qualifications?",
      ),
      question(
        "study-p3-03",
        "How can employers encourage their staff to keep learning?",
      ),
      question(
        "study-p3-04",
        "How might the skills needed at work change in the future?",
      ),
    ],
    vocabulary: vocabulary([
      [
        "transferable skills",
        "/trænsˈfɝː.ə.bəl skɪlz/",
        "kỹ năng có thể áp dụng ở nhiều công việc",
        "Group projects have helped me develop transferable skills such as teamwork.",
      ],
      [
        "hands-on experience",
        "/ˌhændzˈɑːn ɪkˈspɪr.i.əns/",
        "kinh nghiệm thực hành trực tiếp",
        "My internship gave me hands-on experience of working with customers.",
      ],
      [
        "a steep learning curve",
        "/ə stiːp ˈlɝː.nɪŋ kɝːv/",
        "giai đoạn phải học nhiều điều mới trong thời gian ngắn",
        "My first month at university involved a steep learning curve.",
      ],
      [
        "self-discipline",
        "/ˌselfˈdɪs.ə.plɪn/",
        "tính tự giác, khả năng tự kỷ luật",
        "Studying independently requires self-discipline.",
      ],
      [
        "career prospects",
        "/kəˈrɪr ˈprɑː.spekts/",
        "triển vọng nghề nghiệp",
        "Improving my English could broaden my career prospects.",
      ],
    ]),
    grammar: {
      "part-1": grammar([
        [
          "be currently + verb-ing",
          "Nói về việc học hoặc công việc hiện tại.",
          "I am currently studying information technology.",
        ],
        [
          "prefer + verb-ing + to + verb-ing",
          "So sánh hai sở thích hoặc cách làm việc.",
          "I prefer working in a small team to working alone.",
        ],
        [
          "hope to + verb",
          "Trình bày dự định nghề nghiệp.",
          "I hope to gain more practical experience next year.",
        ],
      ]),
      "part-2": grammar([
        [
          "Past continuous + when + past simple",
          "Thiết lập bối cảnh cho câu chuyện đã xảy ra.",
          "I was preparing a presentation when my tutor offered to help.",
        ],
        [
          "At first…, but eventually…",
          "Diễn tả sự tiến bộ theo trình tự.",
          "At first I felt nervous, but eventually I became more confident.",
        ],
        [
          "Since then, present perfect",
          "Liên hệ một trải nghiệm quá khứ với hiện tại.",
          "Since then, I have used this skill in several group projects.",
        ],
      ]),
      "part-3": grammar([
        [
          "not only… but also…",
          "Phát triển ý với hai lợi ích liên quan.",
          "Work experience builds not only technical knowledge but also confidence.",
        ],
        [
          "The more…, the more…",
          "Diễn tả mối quan hệ giữa hai mức độ.",
          "The more employees practise, the more confident they become.",
        ],
        [
          "should be + past participle",
          "Đề xuất cách tổ chức việc học và đào tạo.",
          "Training should be adapted to employees' needs.",
        ],
      ]),
    },
  },
  {
    id: "technology",
    title: "Technology",
    descriptionVi:
      "Thiết bị quen thuộc, thói quen sử dụng và tác động của công nghệ.",
    editions: [
      edition("2026-Q4", "unverified-prediction", [
        forecastThemeSource,
        officialFormatSource,
      ]),
    ],
    updatedAt: "2026-11-04",
    suggestedBand,
    part1: [
      question("technology-p1-01", "What technology do you use every day?"),
      question(
        "technology-p1-02",
        "When did you first start using a computer?",
      ),
      question(
        "technology-p1-03",
        "Do you find it easy to learn how to use new devices?",
      ),
      question(
        "technology-p1-04",
        "Would you like to spend less time using your phone?",
      ),
    ],
    part2: {
      ...question(
        "technology-p2-01",
        "Describe a piece of technology that you find useful.",
      ),
      cuePoints: [
        "what it is",
        "when you started using it",
        "how you use it",
        "and explain why you find it useful",
      ],
    },
    part3: [
      question(
        "technology-p3-01",
        "How has technology changed the way people communicate?",
      ),
      question(
        "technology-p3-02",
        "Why do some people find it difficult to use new technology?",
      ),
      question(
        "technology-p3-03",
        "Should schools teach children how to protect their privacy online?",
      ),
      question(
        "technology-p3-04",
        "Do you think people will become more dependent on technology in the future?",
      ),
    ],
    vocabulary: vocabulary([
      [
        "user-friendly",
        "/ˌjuː.zɚˈfrend.li/",
        "thân thiện, dễ sử dụng",
        "The app has a user-friendly interface.",
      ],
      [
        "digital literacy",
        "/ˈdɪdʒ.ə.t̬əl ˈlɪt̬.ɚ.ə.si/",
        "khả năng sử dụng và đánh giá thông tin số",
        "Digital literacy helps people recognise unreliable information online.",
      ],
      [
        "time-consuming",
        "/ˈtaɪm.kənˌsuː.mɪŋ/",
        "tốn nhiều thời gian",
        "Doing this task without a computer would be time-consuming.",
      ],
      [
        "bridge the gap",
        "/brɪdʒ ðə ɡæp/",
        "thu hẹp khoảng cách",
        "Video calls help bridge the gap between family members living far apart.",
      ],
      [
        "over-reliance",
        "/ˌoʊ.vɚ.rɪˈlaɪ.əns/",
        "sự phụ thuộc quá mức",
        "Over-reliance on navigation apps can make it harder to remember routes.",
      ],
    ]),
    grammar: {
      "part-1": grammar([
        [
          "tend to + verb",
          "Mô tả thói quen sử dụng công nghệ.",
          "I tend to check my messages after breakfast.",
        ],
        [
          "find it + adjective + to + verb",
          "Đánh giá mức độ dễ hoặc khó của một hoạt động.",
          "I find it easy to learn new apps.",
        ],
        [
          "If possible, I would…",
          "Nói về điều bạn muốn thay đổi.",
          "If possible, I would spend less time scrolling on my phone.",
        ],
      ]),
      "part-2": grammar([
        [
          "have been + verb-ing + for/since",
          "Nêu khoảng thời gian sử dụng một thiết bị đến hiện tại.",
          "I have been using this laptop for two years.",
        ],
        [
          "It allows me to + verb",
          "Giải thích công dụng của thiết bị.",
          "It allows me to study and collaborate with classmates.",
        ],
        [
          "Without…, would…",
          "Nêu giá trị của thiết bị qua một giả định.",
          "Without it, I would find online study much more difficult.",
        ],
      ]),
      "part-3": grammar([
        [
          "While + clause, clause",
          "Đối chiếu mặt tích cực và tiêu cực.",
          "While technology makes communication easier, it can also reduce face-to-face contact.",
        ],
        [
          "may lead to + noun",
          "Nêu hệ quả một cách thận trọng.",
          "Excessive screen time may lead to poor sleep.",
        ],
        [
          "It is important that…",
          "Nhấn mạnh một đề xuất.",
          "It is important that schools teach students how to evaluate online information.",
        ],
      ]),
    },
  },
];
