import type {
  ListeningPart,
  ReadingPart,
  SpeakingTestContent,
  WritingTaskData,
} from "@/types/placement-test";

// ==========================================
// 1. LISTENING DATA (4 Parts - 10 Questions)
// ==========================================
export const LISTENING_PARTS: ListeningPart[] = [
  {
    part: 1,
    title: "Part 1: Student Accommodation Registration",
    topic: "Everyday Conversation – Form Completion",
    scenario:
      "A university admissions officer is helping a new international student complete an accommodation application over the telephone.",
    audioScript:
      "Good morning, University Housing Office. How can I help you today? Hello, I would like to register for student accommodation for the upcoming semester. Certainly! May I have your full name and contact telephone number? Yes, my name is Alex Chen, and my contact number is 07855 241908. Thank you, Alex. And what room type are you interested in? We have shared apartments and en-suite single rooms. I would prefer a single room, please, as I need a quiet space to study. Got that. When are you planning to move in? My flight lands on the 14th, so I would like to move in on the 15th of September. Excellent. Finally, how would you prefer to pay your holding deposit? We accept bank transfer and credit card. I will pay using my credit card, please. Perfect, your booking reference is AC-942.",
    estimatedDurationSeconds: 48,
    questions: [
      {
        id: "L1",
        part: 1,
        questionNumber: 1,
        type: "fill_blank",
        prompt: "Preferred room type: [.....] room",
        context: "Alex specified a preference for a quiet studying environment.",
        correctAnswer: ["single", "single room"],
        explanation: "Alex says: 'I would prefer a single room, please.'",
      },
      {
        id: "L2",
        part: 1,
        questionNumber: 2,
        type: "fill_blank",
        prompt: "Move-in date: [.....] of September",
        context: "The student will arrive on campus the day after landing.",
        correctAnswer: ["15th", "15"],
        explanation: "Alex states: 'I would like to move in on the 15th of September.'",
      },
      {
        id: "L3",
        part: 1,
        questionNumber: 3,
        type: "fill_blank",
        prompt: "Deposit payment method: [.....]",
        context: "Choose between available payment options mentioned.",
        correctAnswer: ["credit card", "credit-card", "by credit card"],
        explanation: "Alex says: 'I will pay using my credit card, please.'",
      },
    ],
  },
  {
    part: 2,
    title: "Part 2: Community Sports & Recreation Centre",
    topic: "Social Situation – Multiple Choice",
    scenario:
      "The centre manager is giving an orientation talk to new visitors about recent renovations and visitor safety regulations.",
    audioScript:
      "Welcome everyone to the Riverside Community Sports Complex! Over the past six months, our management team has overseen an extensive redevelopment initiative. While our outdoor tennis courts and fitness gym received minor equipment updates, our Olympic-sized swimming pool has undergone a complete modern renovation, featuring advanced water filtration and energy-efficient temperature controls. Before you enjoy our facilities, please take note of our primary safety guidelines. All visitors entering the aquatic zone must check in at the reception desk to collect an access wristband before heading through the locker rooms. Outdoor shoes are strictly prohibited on the pool deck. We hope you have an invigorating experience with us!",
    estimatedDurationSeconds: 42,
    questions: [
      {
        id: "L4",
        part: 2,
        questionNumber: 4,
        type: "multiple_choice",
        prompt: "Which facility has undergone major renovation?",
        options: [
          { label: "A", text: "The outdoor tennis courts" },
          { label: "B", text: "The Olympic swimming pool" },
          { label: "C", text: "The fitness gym" },
        ],
        correctAnswer: "B",
        explanation:
          "The speaker clarifies: 'our Olympic-sized swimming pool has undergone a complete modern renovation.'",
      },
      {
        id: "L5",
        part: 2,
        questionNumber: 5,
        type: "multiple_choice",
        prompt: "What must visitors do before entering the aquatic zone?",
        options: [
          { label: "A", text: "Take an introductory fitness assessment" },
          { label: "B", text: "Obtain an access wristband at the reception" },
          { label: "C", text: "Book an appointment 24 hours in advance" },
        ],
        correctAnswer: "B",
        explanation:
          "The speaker says: 'All visitors entering the aquatic zone must check in at the reception desk to collect an access wristband.'",
      },
    ],
  },
  {
    part: 3,
    title: "Part 3: Environmental Science Research Project",
    topic: "Academic Discussion – Multiple Choice & Matching",
    scenario:
      "Two university students, Emma and Jack, are discussing tutor feedback on their joint research paper regarding urban soil contamination.",
    audioScript:
      "Jack, did you review Professor Higgins' comments on our research proposal? Yes, Emma. Overall he was impressed by our literature review, though I know you struggled with it at first. Indeed, synthesizing so many contradictory published studies was the most demanding part. What about the field sampling methodology? Well, Professor Higgins warned us against relying on single-point samples because urban soil varies dramatically across even small distances. We agreed that adopting a grid sampling pattern across the four city parks would yield the most reliable data. Exactly. And for analyzing the heavy metal concentrations, he specifically recommended using atomic absorption spectrometry rather than simple chemical reagents because of its high analytical precision. Let's finish updating the bibliography tonight so we can submit the final draft tomorrow morning.",
    estimatedDurationSeconds: 46,
    questions: [
      {
        id: "L6",
        part: 3,
        questionNumber: 6,
        type: "multiple_choice",
        prompt: "What did Emma find most challenging about the literature review?",
        options: [
          { label: "A", text: "Finding peer-reviewed academic journals" },
          { label: "B", text: "Synthesizing contradictory published findings" },
          { label: "C", text: "Understanding the chemical formulas involved" },
        ],
        correctAnswer: "B",
        explanation:
          "Emma explains: 'synthesizing so many contradictory published studies was the most demanding part.'",
      },
      {
        id: "L7",
        part: 3,
        questionNumber: 7,
        type: "multiple_choice",
        prompt: "How do Emma and Jack plan to collect their soil samples?",
        options: [
          { label: "A", text: "By using a grid sampling pattern across parks" },
          { label: "B", text: "By taking samples solely from roadside verges" },
          { label: "C", text: "By gathering topsoil from domestic gardens" },
        ],
        correctAnswer: "A",
        explanation:
          "Emma and Jack agreed that 'adopting a grid sampling pattern across the four city parks would yield the most reliable data.'",
      },
      {
        id: "L8",
        part: 3,
        questionNumber: 8,
        type: "multiple_choice",
        prompt: "Which analysis technique does Professor Higgins recommend?",
        options: [
          { label: "A", text: "Simple indicator reagent testing" },
          { label: "B", text: "Atomic absorption spectrometry" },
          { label: "C", text: "Visual microscopic examination" },
        ],
        correctAnswer: "B",
        explanation:
          "The speaker states: 'he specifically recommended using atomic absorption spectrometry rather than simple chemical reagents.'",
      },
    ],
  },
  {
    part: 4,
    title: "Part 4: Ocean Renewable Energy Technologies",
    topic: "Academic Lecture – Note Completion",
    scenario:
      "A guest lecturer in marine engineering is presenting developments in ocean thermal energy conversion and tidal stream generators.",
    audioScript:
      "Good afternoon, ladies and gentlemen. Today we turn our attention to ocean-based renewable power systems. While offshore wind farms have expanded globally, tidal energy represents a distinct mechanical advantage. Unlike atmospheric winds which are subject to unpredictable meteorological fluctuations, tidal cycles are governed by celestial gravitational forces, offering an unparalleled degree of predictability for grid operators. Furthermore, ocean thermal energy conversion, or OTEC, exploits the dramatic temperature differential between warm surface waters and deep ocean depths. Interestingly, the cold, nutrient-rich deep ocean water pumped to the surface can subsequently be repurposed for agricultural cooling and deep-sea aquaculture, making OTEC a multi-purpose technological asset for coastal communities.",
    estimatedDurationSeconds: 45,
    questions: [
      {
        id: "L9",
        part: 4,
        questionNumber: 9,
        type: "fill_blank",
        prompt: "Key advantage of tidal power over wind: high degree of [.....]",
        context: "Refers to the regular, celestial nature of tidal cycles.",
        correctAnswer: ["predictability", "predictable"],
        explanation:
          "The lecturer highlights: 'offering an unparalleled degree of predictability for grid operators.'",
      },
      {
        id: "L10",
        part: 4,
        questionNumber: 10,
        type: "fill_blank",
        prompt: "Secondary benefit of deep ocean water: agricultural [.....]",
        context: "The cool water can be repurposed for farming infrastructure.",
        correctAnswer: ["cooling", "cooling systems"],
        explanation:
          "The lecturer notes: 'can subsequently be repurposed for agricultural cooling.'",
      },
    ],
  },
];

// ==========================================
// 2. READING DATA (3 Parts - 12 Questions)
// ==========================================
export const READING_PARTS: ReadingPart[] = [
  {
    part: 1,
    title: "Reading Section 1: Urban Architecture and Green Roofs",
    passageTitle: "The Urban Microclimate and Green Roofs in Modern Architecture",
    passageSubtitle:
      "How contemporary landscape engineering is moderating metropolitan temperatures and revitalizing urban biodiversity.",
    paragraphs: [
      {
        label: "Paragraph 1",
        text: "In densely populated metropolitan centers, the replacement of natural vegetation with asphalt, concrete, and brick structures creates what climatologists term the 'Urban Heat Island' (UHI) effect. Traditional dark building materials absorb high levels of solar radiation during the day and re-radiate this heat into the ambient air overnight. Consequently, inner-city temperatures can surpass those of peripheral rural surroundings by as much as 4 to 8 degrees Celsius. This elevated temperature profile triggers increased electricity consumption for air conditioning, accelerates atmospheric smog formation, and impairs public health.",
      },
      {
        label: "Paragraph 2",
        text: "To mitigate these detrimental thermal dynamics, contemporary urban planners are increasingly mandating green roofs—engineered layers of living vegetation planted over waterproof roof membranes. Green roofs operate on the physical principle of evapotranspiration: plants absorb water through their roots and release water vapor through stomata on their leaves. This phase transition consumes substantial latent heat from the atmosphere, directly cooling the roof substrate and the adjacent air mass.",
      },
      {
        label: "Paragraph 3",
        text: "Beyond temperature moderation, vegetated roofs provide critical stormwater retention benefits. In standard urban configurations, torrential downpours generate immense volumes of surface runoff that overwhelm municipal drainage channels and transport toxic contaminants into natural waterways. A well-designed extensive green roof, utilizing drought-tolerant sedum species, can retain up to 70 to 90 percent of summer precipitation, releasing moisture gradually and drastically diminishing flash-flood risks.",
      },
    ],
    questions: [
      {
        id: "R1",
        part: 1,
        questionNumber: 1,
        type: "true_false_not_given",
        prompt:
          "Metropolitan downtown temperatures can exceed surrounding rural areas by up to 8 degrees Celsius.",
        paragraphRef: "Paragraph 1",
        options: [
          { label: "TRUE", text: "True" },
          { label: "FALSE", text: "False" },
          { label: "NOT GIVEN", text: "Not Given" },
        ],
        correctAnswer: "TRUE",
        explanation:
          "Paragraph 1 explicitly confirms: 'inner-city temperatures can surpass those of peripheral rural surroundings by as much as 4 to 8 degrees Celsius.'",
      },
      {
        id: "R2",
        part: 1,
        questionNumber: 2,
        type: "true_false_not_given",
        prompt:
          "Evapotranspiration heats the underlying roof structure by converting liquid water into steam.",
        paragraphRef: "Paragraph 2",
        options: [
          { label: "TRUE", text: "True" },
          { label: "FALSE", text: "False" },
          { label: "NOT GIVEN", text: "Not Given" },
        ],
        correctAnswer: "FALSE",
        explanation:
          "Paragraph 2 states that evapotranspiration 'consumes substantial latent heat... directly cooling the roof substrate', not heating it.",
      },
      {
        id: "R3",
        part: 1,
        questionNumber: 3,
        type: "multiple_choice",
        prompt:
          "According to Paragraph 3, what proportion of summer rainfall can an extensive green roof retain?",
        options: [
          { label: "A", text: "Around 30 to 45 percent" },
          { label: "B", text: "Between 50 and 65 percent" },
          { label: "C", text: "Up to 70 to 90 percent" },
          { label: "D", text: "Exactly 100 percent" },
        ],
        correctAnswer: "C",
        explanation:
          "Paragraph 3 clearly states: 'can retain up to 70 to 90 percent of summer precipitation.'",
      },
      {
        id: "R4",
        part: 1,
        questionNumber: 4,
        type: "true_false_not_given",
        prompt:
          "Municipal governments offer tax reductions for developers who install sedum green roofs.",
        paragraphRef: "Paragraph 3",
        options: [
          { label: "TRUE", text: "True" },
          { label: "FALSE", text: "False" },
          { label: "NOT GIVEN", text: "Not Given" },
        ],
        correctAnswer: "NOT GIVEN",
        explanation:
          "While green roofs are described, no mention is made regarding tax reductions or government financial subsidies.",
      },
    ],
  },
  {
    part: 2,
    title: "Reading Section 2: The Evolution of Written Language",
    passageTitle: "The Genesis and Transformation of Human Inscription",
    passageSubtitle:
      "Tracing the historic leap from pictographic administrative tokens to abstract phonetic alphabets.",
    paragraphs: [
      {
        label: "Section A",
        text: "The dawn of human writing did not emerge from poetic inspiration or religious fervor, but rather from mundane economic necessity. Around 3400 BCE in southern Mesopotamia, the rapid expansion of early Sumerian city-states created complex trade networks that exceeded the limits of human memory. Temple bureaucrats required an infallible method to track quantities of barley, livestock shipments, and tax liabilities. Their ingenious solution was the clay token system, which gradually evolved into pressed pictographic impressions made with reed styluses on damp clay tablets.",
      },
      {
        label: "Section B",
        text: "As administrative transactions grew more nuanced, pictograms encountered intrinsic semantic constraints. While sketching an ox or an ear of grain was straightforward, representing intangible abstract concepts like 'debt', 'ownership', or 'honor' proved insurmountable. Scribes overcame this limitation through the rebus principle: using the symbol of a concrete object not for its literal meaning, but for its phonetic sound. By combining sound-symbols, scribes could inscribe any spoken word, transforming crude pictorial tallies into true linguistic representation.",
      },
      {
        label: "Section C",
        text: "Despite the phonetic breakthrough of cuneiform and Egyptian hieroglyphs, literacy remained the privileged monopoly of an elite caste. These archaic systems demanded mastery of hundreds, sometimes thousands, of intricate signs. Training a professional scribe required over a decade of arduous schooling in dedicated institutions known as edubbas. The average agrarian laborer, artisan, or merchant had neither the leisure nor the economic resources to acquire this specialized knowledge, preserving rigid social stratification.",
      },
      {
        label: "Section D",
        text: "The revolutionary democratization of reading occurred around 1800 BCE in the Sinai Peninsula. Semitic-speaking miners and traders condensed the unwieldy hundreds of Egyptian hieroglyphs into a streamlined set of approximately twenty-two consonants, where each character symbolized a single discrete vocal phoneme. This Proto-Sinaitic script was later perfected by the Phoenicians and transmitted across Mediterranean maritime trade corridors. It served as the direct ancestor of the Greek, Roman, Aramaic, and Arabic alphabets, lowering the barrier to universal literacy forever.",
      },
    ],
    headingsList: [
      { label: "i", heading: "Bureaucratic bookkeeping as the primary catalyst" },
      { label: "ii", heading: "The invention of the printing press in Western Europe" },
      { label: "iii", heading: "Bridging the semantic barrier with phonetic rebus" },
      { label: "iv", heading: "The exclusive monopoly of professional scribes" },
      { label: "v", heading: "The emergence of the simplified phonetic alphabet" },
      { label: "vi", heading: "Astronomical calculations in Mesoamerican codices" },
    ],
    questions: [
      {
        id: "R5",
        part: 2,
        questionNumber: 5,
        type: "matching_headings",
        prompt: "Choose the correct heading for Section A:",
        paragraphRef: "Section A",
        options: [
          { label: "i", text: "Bureaucratic bookkeeping as the primary catalyst" },
          { label: "ii", text: "The invention of the printing press in Western Europe" },
          { label: "iii", text: "Bridging the semantic barrier with phonetic rebus" },
          { label: "iv", text: "The exclusive monopoly of professional scribes" },
          { label: "v", text: "The emergence of the simplified phonetic alphabet" },
          { label: "vi", text: "Astronomical calculations in Mesoamerican codices" },
        ],
        correctAnswer: "i",
        explanation:
          "Section A focuses on economic and accounting needs (tracking barley, livestock, tax) as the catalyst for writing.",
      },
      {
        id: "R6",
        part: 2,
        questionNumber: 6,
        type: "matching_headings",
        prompt: "Choose the correct heading for Section B:",
        paragraphRef: "Section B",
        options: [
          { label: "i", text: "Bureaucratic bookkeeping as the primary catalyst" },
          { label: "ii", text: "The invention of the printing press in Western Europe" },
          { label: "iii", text: "Bridging the semantic barrier with phonetic rebus" },
          { label: "iv", text: "The exclusive monopoly of professional scribes" },
          { label: "v", text: "The emergence of the simplified phonetic alphabet" },
          { label: "vi", text: "Astronomical calculations in Mesoamerican codices" },
        ],
        correctAnswer: "iii",
        explanation:
          "Section B describes using the rebus principle to represent abstract words with phonetic sounds.",
      },
      {
        id: "R7",
        part: 2,
        questionNumber: 7,
        type: "matching_headings",
        prompt: "Choose the correct heading for Section C:",
        paragraphRef: "Section C",
        options: [
          { label: "i", text: "Bureaucratic bookkeeping as the primary catalyst" },
          { label: "ii", text: "The invention of the printing press in Western Europe" },
          { label: "iii", text: "Bridging the semantic barrier with phonetic rebus" },
          { label: "iv", text: "The exclusive monopoly of professional scribes" },
          { label: "v", text: "The emergence of the simplified phonetic alphabet" },
          { label: "vi", text: "Astronomical calculations in Mesoamerican codices" },
        ],
        correctAnswer: "iv",
        explanation:
          "Section C emphasizes that literacy was restricted to an elite caste of scribes who studied for over a decade.",
      },
      {
        id: "R8",
        part: 2,
        questionNumber: 8,
        type: "matching_headings",
        prompt: "Choose the correct heading for Section D:",
        paragraphRef: "Section D",
        options: [
          { label: "i", text: "Bureaucratic bookkeeping as the primary catalyst" },
          { label: "ii", text: "The invention of the printing press in Western Europe" },
          { label: "iii", text: "Bridging the semantic barrier with phonetic rebus" },
          { label: "iv", text: "The exclusive monopoly of professional scribes" },
          { label: "v", text: "The emergence of the simplified phonetic alphabet" },
          { label: "vi", text: "Astronomical calculations in Mesoamerican codices" },
        ],
        correctAnswer: "v",
        explanation:
          "Section D outlines how 22 consonants in the Sinai script revolutionized and democratized the alphabet.",
      },
    ],
  },
  {
    part: 3,
    title: "Reading Section 3: AI in Archaeological Discovery",
    passageTitle: "Machine Learning and Non-Invasive Subterranean Exploration",
    passageSubtitle:
      "How satellite remote sensing and synthetic aperture radar algorithms are uncovering hidden civilizations.",
    paragraphs: [
      {
        label: "Paragraph 1",
        text: "For more than a century, archaeological discovery depended fundamentally on manual spade excavations, oral historical testimonies, and serendipitous discoveries by local farmers. However, dense jungle canopies, extreme desert dunes, and expansive urban sprawl have obscured thousands of ancient settlements from ground-level observers. In recent years, the convergence of satellite LiDAR (Light Detection and Ranging) sensors and deep neural networks has transformed archaeology into a computational, non-invasive discipline.",
      },
      {
        label: "Paragraph 2",
        text: "LiDAR systems discharge hundreds of thousands of infrared laser pulses per second toward the earth's surface from aircraft or aerial drones. While the preponderance of laser light reflects off upper tree branches and thick undergrowth, a minute fraction penetrates minuscule canopy gaps to strike the bare ground. Machine learning classification models are trained to filter out vegetation returns, stripping away millions of virtual trees to produce high-resolution digital elevation models (DEMs). In Guatemala's Petén region, this method illuminated more than 60,000 previously unrecorded Maya structures, including defensive ramparts, elevated agricultural causeways, and ceremonial pyramids.",
      },
      {
        label: "Paragraph 3",
        text: "Nevertheless, senior archaeologists emphasize that algorithmic prediction does not render ground truthing obsolete. Convolutional neural networks can occasionally misclassify modern drainage ditches or geological limestone fissures as ancient human-built canals. Consequently, computational findings serve as prioritization heatmaps for targeted physical expeditions rather than unverified definitive proof. Furthermore, the publication of precise spatial coordinates presents severe cultural heritage risks, as looters can exploit open-access academic datasets to raid vulnerable archaeological sites prior to legal state protection.",
      },
    ],
    questions: [
      {
        id: "R9",
        part: 3,
        questionNumber: 9,
        type: "multiple_choice",
        prompt: "Why was the discovery of ancient settlements previously restricted?",
        options: [
          { label: "A", text: "Archaeologists lacked interest in pre-industrial societies" },
          { label: "B", text: "Natural barriers such as dense canopies and deserts concealed them" },
          { label: "C", text: "International treaties banned all excavations" },
          { label: "D", text: "Satellite imagery was monopolized exclusively by military forces" },
        ],
        correctAnswer: "B",
        explanation:
          "Paragraph 1 notes: 'dense jungle canopies, extreme desert dunes, and expansive urban sprawl have obscured thousands of ancient settlements.'",
      },
      {
        id: "R10",
        part: 3,
        questionNumber: 10,
        type: "multiple_choice",
        prompt: "How does LiDAR reveal terrain beneath thick forest cover?",
        options: [
          { label: "A", text: "By using chemical sprays that cause deciduous leaves to fall" },
          { label: "B", text: "By generating acoustic soundwaves that vibrate tree roots" },
          { label: "C", text: "By sending laser pulses through gaps in foliage to reflect off the ground" },
          { label: "D", text: "By heating the canopy until moisture evaporates" },
        ],
        correctAnswer: "C",
        explanation:
          "Paragraph 2 clarifies: 'a minute fraction penetrates minuscule canopy gaps to strike the bare ground.'",
      },
      {
        id: "R11",
        part: 3,
        questionNumber: 11,
        type: "true_false_not_given",
        prompt:
          "Machine learning algorithms never make errors when identifying subterranean archaeological ruins.",
        paragraphRef: "Paragraph 3",
        options: [
          { label: "TRUE", text: "True" },
          { label: "FALSE", text: "False" },
          { label: "NOT GIVEN", text: "Not Given" },
        ],
        correctAnswer: "FALSE",
        explanation:
          "Paragraph 3 states that algorithms 'can occasionally misclassify modern drainage ditches or geological limestone fissures as ancient human-built canals.'",
      },
      {
        id: "R12",
        part: 3,
        questionNumber: 12,
        type: "true_false_not_given",
        prompt:
          "Publicizing detailed GPS coordinates of newly discovered sites can inadvertently encourage illegal looting.",
        paragraphRef: "Paragraph 3",
        options: [
          { label: "TRUE", text: "True" },
          { label: "FALSE", text: "False" },
          { label: "NOT GIVEN", text: "Not Given" },
        ],
        correctAnswer: "TRUE",
        explanation:
          "Paragraph 3 notes: 'looters can exploit open-access academic datasets to raid vulnerable archaeological sites prior to legal state protection.'",
      },
    ],
  },
];

// ==========================================
// 3. WRITING DATA (Task 1 & Task 2)
// ==========================================
export const WRITING_TASKS: WritingTaskData[] = [
  {
    id: "writing_task_1",
    taskNumber: 1,
    title: "Writing Task 1: Academic Data Description",
    type: "academic_chart",
    prompt:
      "The bar chart below illustrates the percentage of national electricity generated from renewable energy sources (including hydro, solar, and wind) across four countries in 2010, 2016, and 2022.",
    instructions:
      "Summarize the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.",
    minWords: 150,
    recommendedMinutes: 20,
    chart: {
      title: "Renewable Electricity Generation Share (2010 – 2022)",
      description:
        "Percentage of total domestic electrical power generated by renewable sources.",
      xAxisLabel: "Country",
      yAxisLabel: "Renewable Share (%)",
      unit: "%",
      years: ["2010", "2016", "2022"],
      series: [
        {
          country: "Norway",
          color: "#2563eb",
          data: [96, 98, 99],
        },
        {
          country: "Brazil",
          color: "#16a34a",
          data: [82, 79, 87],
        },
        {
          country: "Germany",
          color: "#eab308",
          data: [17, 31, 46],
        },
        {
          country: "Japan",
          color: "#dc2626",
          data: [10, 15, 22],
        },
      ],
    },
  },
  {
    id: "writing_task_2",
    taskNumber: 2,
    title: "Writing Task 2: Academic Discursive Essay",
    type: "essay",
    prompt:
      "Some educational analysts advocate that tertiary university education should be completely funded by the state and provided free of charge to all qualifying students. Others contend that university students themselves should bear the financial burden of tuition fees as direct personal beneficiaries of higher qualification earnings.\n\nDiscuss both views and give your own opinion.",
    instructions:
      "Give reasons for your answer and include any relevant examples from your knowledge or experience. Write at least 250 words.",
    minWords: 250,
    recommendedMinutes: 40,
  },
];

export function getWritingTask(
  idOrTaskNumber: string | number,
): WritingTaskData | undefined {
  if (typeof idOrTaskNumber === "number") {
    return WRITING_TASKS.find((t) => t.taskNumber === idOrTaskNumber);
  }
  return WRITING_TASKS.find(
    (t) =>
      t.id === idOrTaskNumber || t.taskNumber.toString() === idOrTaskNumber,
  );
}

// ==========================================
// 4. SPEAKING DATA (3 Parts)
// ==========================================
export const SPEAKING_CONTENT: SpeakingTestContent = {
  part1: {
    title: "Part 1: Introduction & Everyday Interview",
    instructions:
      "The examiner will ask you general questions about your background, lifestyle, studies, or daily interests. Record a spoken answer for each question (30 to 45 seconds each).",
    questions: [
      {
        id: "S1",
        prompt: "Can you tell me about the town or neighborhood where you currently reside?",
        tip: "Describe its atmosphere, amenities, and what you appreciate most about living there.",
      },
      {
        id: "S2",
        prompt: "Are you currently working or studying, and what aspects of your routine do you find most rewarding?",
        tip: "Provide specific details on your daily field of study or professional duties.",
      },
      {
        id: "S3",
        prompt: "How do you typically like to spend your spare time or recharge during the weekend?",
        tip: "Talk about hobbies, sports, social activities, or creative pursuits.",
      },
    ],
  },
  part2: {
    title: "Part 2: Individual Long Turn (Cue Card)",
    instructions:
      "You will have 1 minute to read the topic and prepare your notes. Then, record your spoken presentation for up to 2 minutes without stopping.",
    cueCard: {
      topic: "Describe an ambitious personal goal that you successfully achieved.",
      intro: "You should say:",
      bulletPoints: [
        "What the goal was and when you decided to pursue it",
        "What detailed steps or preparation you undertook",
        "What difficult challenges or obstacles you faced along the way",
        "And explain how you felt when you finally reached this achievement.",
      ],
      followUp:
        "Do you think having ambitious goals is important for personal fulfillment?",
      prepTimeSeconds: 60,
      maxRecordTimeSeconds: 120,
    },
  },
  part3: {
    title: "Part 3: Two-Way Academic Discussion",
    instructions:
      "The examiner will ask you in-depth questions expanding upon the themes of goal-setting, motivation, and modern societal pressures. Record your answers (45 to 60 seconds each).",
    questions: [
      {
        id: "S4",
        prompt:
          "Why do you think some individuals find it difficult to sustain high motivation when working toward long-term aspirations?",
        followUpContext:
          "Consider external distractions, delayed gratification, and lack of structured feedback.",
      },
      {
        id: "S5",
        prompt:
          "In what ways has modern digital technology and social media influenced the types of goals young people set for themselves?",
        followUpContext:
          "Discuss potential benefits like instant educational resources versus risks like unrealistic comparisons.",
      },
    ],
  },
};

export const COMBINED_LISTENING_AUDIO_SCRIPT = LISTENING_PARTS.map(
  (p) => `${p.title}. ${p.audioScript}`,
).join(" ... Next section. ... ");

export const ALL_LISTENING_QUESTIONS = LISTENING_PARTS.flatMap(
  (p) => p.questions,
);

export const ALL_READING_QUESTIONS = READING_PARTS.flatMap((p) => p.questions);
