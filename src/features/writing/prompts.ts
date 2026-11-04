import type { Vocabulary, OutlineSection, WritingPrompt } from "./types";

const vocab = (items: [string, string, string][]): Vocabulary[] =>
  items.map(([term, meaning, example]) => ({ term, meaning, example }));
const outline = (items: [string, string][]): OutlineSection[] =>
  items.map(([heading, suggestion]) => ({ heading, suggestion }));
const cohesiveDevices = [
  "Overall",
  "By contrast",
  "Furthermore",
  "However",
  "For example",
  "As a result",
  "In conclusion",
  "Initially",
  "Subsequently",
  "Finally",
  "In addition",
  "Nevertheless",
  "Consequently",
];

// Original teaching material and illustrative datasets, not official examination papers.
// Band labels are learning targets; these responses have not received examiner scores.
export const writingPrompts: WritingPrompt[] = [
  {
    id: "technology-in-education",
    title: "Technology in the classroom",
    task: 2,
    type: "Opinion",
    topic: "Technology",
    band: "8.0",
    question:
      "Some people believe that technology makes teachers less important in education. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience.",
    outline: outline([
      [
        "Introduction",
        "Paraphrase the claim and state that technology supports teachers rather than replacing their role.",
      ],
      [
        "Body 1",
        "Explain how digital tools broaden access and personalise practice. Illustrate with adaptive exercises and immediate feedback.",
      ],
      [
        "Body 2",
        "Explain why human guidance remains essential: evaluating sources, motivating learners, and supporting individual needs.",
      ],
      [
        "Conclusion",
        "Restate your disagreement: effective education combines useful technology with skilled teachers.",
      ],
    ]),
    vocabulary: vocab([
      [
        "digital literacy",
        "The ability to use and evaluate digital information effectively.",
        "Teachers help learners develop digital literacy by checking online sources.",
      ],
      [
        "personalised learning",
        "Teaching adapted to an individual learner's needs.",
        "Adaptive quizzes can support personalised learning.",
      ],
      [
        "critical thinking",
        "Careful analysis of information before forming a judgement.",
        "Classroom debates encourage critical thinking.",
      ],
      [
        "bridge the gap",
        "Reduce a difference in access or achievement.",
        "Accessible online resources can bridge the gap between schools.",
      ],
      [
        "human interaction",
        "Direct communication and connection between people.",
        "Human interaction helps students build confidence.",
      ],
    ]),
    sample: [
      "Digital tools have transformed how students find information and practise new skills. This has led some people to argue that teachers are becoming less important. I largely disagree with this view because access to information is only one part of education. Although technology can improve the efficiency of learning, teachers remain essential in helping young people understand ideas and develop sound judgement.",
      "Technology clearly offers considerable educational benefits. Online libraries give students access to material that their own schools may be unable to provide, while adaptive exercises can support personalised learning. For example, a learner who struggles with fractions can receive additional practice without delaying classmates who have already mastered the topic. Such resources may also bridge the gap between well-funded schools and those with limited facilities. However, these advantages depend on appropriate equipment, reliable access and thoughtful selection of material; simply giving every student a device does not ensure meaningful progress.",
      "Teachers supply the guidance that digital resources alone cannot reliably provide. They cultivate critical thinking by asking students to justify an answer rather than merely selecting it. Furthermore, developing digital literacy requires learning to distinguish credible evidence from persuasive misinformation, a process that benefits from discussion with an experienced educator. Human interaction also allows teachers to notice frustration, encourage reluctant participants and adjust explanations in response to confusion. A platform may identify an incorrect response, but a teacher can investigate why the misunderstanding arose and choose a more suitable explanation.",
      "In conclusion, technology changes the tools available to teachers without removing the need for their expertise. The strongest educational approach combines flexible digital resources with skilled human guidance. Schools should therefore invest in teacher development alongside equipment, ensuring that technological convenience contributes to deeper understanding rather than becoming an end in itself.",
    ],
    cohesiveDevices,
  },
  {
    id: "university-or-vocational",
    title: "University or vocational training?",
    task: 2,
    type: "Discussion",
    topic: "Education",
    band: "7.0",
    question:
      "Some people think all young people should attend university, while others believe vocational training is a better choice for some students. Discuss both views and give your own opinion.",
    outline: outline([
      [
        "Introduction",
        "Introduce both routes and state that the right choice depends on career goals and strengths.",
      ],
      [
        "Body 1",
        "Explain the value of university: academic foundations and access to professions such as medicine.",
      ],
      [
        "Body 2",
        "Explain vocational benefits: practical experience, earlier employment, and skilled trades. Give your balanced opinion.",
      ],
      [
        "Conclusion",
        "Support equal respect for both paths rather than compulsory university attendance.",
      ],
    ]),
    vocabulary: vocab([
      [
        "academic foundations",
        "Core theoretical knowledge needed for further study.",
        "A degree provides academic foundations for scientific research.",
      ],
      [
        "vocational training",
        "Education that prepares people for specific occupations.",
        "Vocational training combines instruction with workplace practice.",
      ],
      [
        "practical expertise",
        "Knowledge developed through hands-on experience.",
        "Apprentices build practical expertise in electrical installation.",
      ],
      [
        "labour market",
        "The demand for and supply of workers.",
        "Colleges should respond to changes in the labour market.",
      ],
      [
        "career prospects",
        "Opportunities for future employment and advancement.",
        "Recognised qualifications can improve career prospects.",
      ],
    ]),
    sample: [
      "Choosing what to do after school is an important decision for young people. Some argue that everyone should attend university, whereas others favour vocational training for students whose interests are more practical. Both routes have clear benefits. In my opinion, students should choose according to their abilities and intended careers, rather than treating a university place as the only acceptable outcome.",
      "University education provides academic foundations that are essential in many professions. Doctors and engineers, for instance, need a detailed understanding of scientific principles before they can take responsibility for complex decisions. Studying for a degree also gives students time to investigate different ideas and develop independent research skills. Furthermore, access to university can expand the career prospects of young people whose families have little professional experience. These benefits explain why many parents encourage their children to pursue higher education. However, they do not demonstrate that a degree is necessary for every occupation.",
      "Vocational training offers another valuable route into employment. Apprentices can develop practical expertise while learning directly from experienced workers, and they may begin earning earlier than university students. A community needs qualified electricians and mechanics just as it needs graduates. For example, a student who enjoys repairing equipment may learn more effectively in a supervised workshop than in a lecture hall. Training providers should nevertheless maintain strong standards and offer qualifications that employers recognise. Advice based on the local labour market can help students judge whether a course is likely to lead to suitable work.",
      "In conclusion, university and vocational education serve different but equally worthwhile purposes. I believe young people need accurate information and genuine choice between them. Governments and schools should support both pathways, allowing students to develop their strengths while meeting the wider community's need for a varied and capable workforce.",
    ],
    cohesiveDevices,
  },
  {
    id: "urban-plastic-waste",
    title: "Reducing urban plastic waste",
    task: 2,
    type: "Problem-Solution",
    topic: "Environment",
    band: "8.0",
    question:
      "Many cities are experiencing an increase in plastic waste. What problems does this cause, and what measures could be taken to address them?",
    outline: outline([
      [
        "Introduction",
        "Introduce rising plastic waste and identify environmental damage and disposal pressure as central problems.",
      ],
      [
        "Body 1",
        "Develop the effects: polluted waterways, harm to wildlife, and increasing collection costs.",
      ],
      [
        "Body 2",
        "Match solutions to causes: producer responsibility, reusable packaging, and convenient collection.",
      ],
      [
        "Conclusion",
        "Summarise the need to reduce waste at source and improve collection together.",
      ],
    ]),
    vocabulary: vocab([
      [
        "single-use packaging",
        "Wrapping or containers designed to be discarded after one use.",
        "Shops can reduce single-use packaging by offering refills.",
      ],
      [
        "waste management",
        "The collection, treatment and disposal of waste.",
        "Reliable waste management requires stable funding.",
      ],
      [
        "producer responsibility",
        "The obligation of manufacturers to manage the impact of their products.",
        "Producer responsibility can fund packaging collection.",
      ],
      [
        "environmental degradation",
        "Damage to the natural environment.",
        "Plastic litter contributes to environmental degradation.",
      ],
      [
        "deposit-return scheme",
        "A system that refunds a small payment when a container is returned.",
        "A deposit-return scheme encourages bottle collection.",
      ],
    ]),
    sample: [
      "The growing quantity of plastic discarded in cities creates difficulties that extend beyond untidy streets. Lightweight packaging can escape collection systems, while durable materials remain in the environment long after their useful life has ended. The main problems are environmental degradation and pressure on public waste management. Addressing them requires both less disposable packaging and more effective collection systems.",
      "Plastic litter can be carried through drains into rivers, where it damages habitats and exposes wildlife to material that may be swallowed or cause injury. In neighbourhoods with unreliable collection, accumulated rubbish can also obstruct drainage channels. Furthermore, councils must devote money and staff time to collecting, sorting and disposing of increasing volumes of waste. These costs compete with other public services. Recycling alone cannot resolve this pressure if the amount of single-use packaging entering the system continues to rise, especially when different materials are mixed together and become difficult to separate.",
      "Governments should first encourage businesses to prevent unnecessary waste. Producer responsibility rules can make manufacturers contribute to collection costs, giving them a financial reason to simplify packaging and design reusable alternatives. For example, retailers could provide refill stations for common household products. A deposit-return scheme for drink containers can complement these measures by rewarding consumers for returning empty bottles. However, such policies need convenient collection points and clear instructions; otherwise, participation may remain limited. Councils should also provide consistent collection services so residents can act on the guidance they receive rather than having to travel long distances to dispose of recyclable material.",
      "In conclusion, plastic waste harms urban environments while increasing the burden on public services. A coordinated approach should reduce unnecessary packaging at source and make responsible disposal straightforward. Combining business obligations with practical household services is more likely to produce lasting improvements than relying entirely on individual goodwill or occasional clean-up campaigns.",
    ],
    cohesiveDevices,
  },
  {
    id: "remote-working",
    title: "The rise of remote working",
    task: 2,
    type: "Advantage-Disadvantage",
    topic: "Work",
    band: "7.0",
    question:
      "More people are working from home instead of travelling to an office. Do the advantages of this development outweigh the disadvantages?",
    outline: outline([
      [
        "Introduction",
        "Describe the shift and argue that benefits outweigh drawbacks when suitable support is available.",
      ],
      [
        "Body 1",
        "Explain flexibility and time saved through less commuting, with a concrete example.",
      ],
      [
        "Body 2",
        "Acknowledge isolation and blurred boundaries. Explain how team contact and clear hours reduce these drawbacks.",
      ],
      [
        "Conclusion",
        "Reaffirm your judgement while recognising that not every job suits remote work.",
      ],
    ]),
    vocabulary: vocab([
      [
        "flexible arrangements",
        "Working patterns that can be adapted to people's needs.",
        "Flexible arrangements help employees manage caring responsibilities.",
      ],
      [
        "daily commute",
        "The regular journey between home and work.",
        "Removing the daily commute saves time.",
      ],
      [
        "work-life balance",
        "A sustainable division of time between work and personal life.",
        "Clear working hours support work-life balance.",
      ],
      [
        "social isolation",
        "A lack of contact with other people.",
        "Regular team meetings can reduce social isolation.",
      ],
      [
        "professional boundaries",
        "Limits that separate work duties from personal time.",
        "Remote teams need clear professional boundaries.",
      ],
    ]),
    sample: [
      "Working from home has become an option for many people whose jobs can be performed online. This change offers greater freedom but also raises concerns about teamwork and personal wellbeing. I believe the advantages outweigh the disadvantages for suitable roles, provided that employers establish clear expectations and ensure that staff remain connected to their colleagues.",
      "The most immediate benefit is avoiding the daily commute. Time previously spent travelling can be used for rest, exercise or family responsibilities, which can improve work-life balance. For example, a parent may be able to collect a child from school without reducing the amount of work completed that day. Flexible arrangements can also help employers recruit people who live far from expensive city offices. Furthermore, some tasks requiring sustained concentration may be easier to complete in a quiet home environment. These benefits are particularly valuable when employees have appropriate equipment and a comfortable place to work.",
      "However, remote work can create social isolation and make collaboration less spontaneous. New employees may hesitate to ask questions when they cannot easily approach an experienced colleague. Another concern is that messages arriving late in the evening can weaken professional boundaries, leaving workers feeling permanently available. These disadvantages are serious, but they can be reduced through scheduled mentoring, regular team conversations and agreed hours for responding to messages. Employers should also recognise that some people lack a suitable workspace at home and may need access to an office. A flexible policy should take these differences into account rather than imposing the same arrangement on everyone.",
      "In conclusion, remote working can save time and widen access to employment, so its benefits generally outweigh its drawbacks in appropriate occupations. Its success depends on deliberate support for communication and personal boundaries. Giving employees a practical choice of working arrangements is therefore preferable to assuming that either home or office work suits every individual.",
    ],
    cohesiveDevices,
  },
  {
    id: "internet-access",
    title: "Household internet access",
    task: 1,
    type: "Line graph",
    topic: "Technology",
    band: "7.0",
    question:
      "The line graph shows the percentage of households with internet access in three countries between 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    graphic: {
      type: "Line graph",
      description:
        "Internet access (% of households). Years: 2000, 2005, 2010, 2015, 2020. Country A: 20, 40, 60, 80, 90. Country B: 10, 25, 45, 65, 85. Country C: 5, 15, 30, 50, 70.",
    },
    outline: outline([
      ["Introduction", "Paraphrase the measure, countries and period."],
      [
        "Overview",
        "Access rose in all three countries; A remained highest and C lowest.",
      ],
      ["Body 1", "Compare starting figures and growth to 2010."],
      ["Body 2", "Compare 2020 figures and the narrowing gap between A and B."],
    ]),
    vocabulary: vocab([
      [
        "rose steadily",
        "Increased at a consistent pace.",
        "Access rose steadily over the period.",
      ],
      [
        "percentage points",
        "The numerical difference between two percentages.",
        "The share increased by 20 percentage points.",
      ],
      [
        "remained ahead",
        "Continued to have a higher figure.",
        "Country A remained ahead throughout.",
      ],
      ["narrowed", "Became smaller.", "The gap narrowed by 2020."],
      [
        "respectively",
        "In the same order as previously listed.",
        "A and B reached 90% and 85%, respectively.",
      ],
    ]),
    sample: [
      "The line graph compares the proportion of households connected to the internet in Countries A, B and C at five-year intervals from 2000 to 2020. All figures are expressed as percentages of households in each country.",
      "Overall, internet access rose steadily in all three countries. Country A remained ahead throughout the period, while Country C consistently recorded the lowest proportion. The difference between the two leading countries narrowed towards the end.",
      "In 2000, 20% of households in Country A had access, compared with 10% in B and just 5% in C. By 2010, these figures had reached 60%, 45% and 30%, respectively. A therefore gained 40 percentage points during the first decade, the largest increase among the three countries.",
      "In the following ten years, B added another 40 percentage points, finishing at 85%. A reached 90%, reducing its lead over B from 15 points in 2010 to five in 2020. C also continued to rise, ending at 70%, although this was still 20 points below A.",
    ],
    cohesiveDevices,
  },
  {
    id: "transport-to-work",
    title: "How residents travel to work",
    task: 1,
    type: "Bar chart",
    topic: "Transport",
    band: "7.0",
    question:
      "The bar chart compares the percentage of commuters using four modes of transport in a city in 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    graphic: {
      type: "Bar chart",
      description:
        "Commuters by mode (%). Car: 50 in 2010, 35 in 2020. Bus: 25, 30. Bicycle: 10, 20. Walking: 15, 15. Each year's shares total 100%.",
    },
    outline: outline([
      ["Introduction", "Identify the city transport comparison and years."],
      [
        "Overview",
        "Cars were most popular in both years but their share fell; cycling doubled.",
      ],
      ["Body 1", "Compare car and bus figures."],
      ["Body 2", "Report cycling growth and unchanged walking figures."],
    ]),
    vocabulary: vocab([
      [
        "accounted for",
        "Represented a share of the total.",
        "Cars accounted for half of commuters.",
      ],
      [
        "declined",
        "Fell in amount or proportion.",
        "Car use declined over the decade.",
      ],
      ["doubled", "Became twice as large.", "The cycling share doubled."],
      [
        "unchanged",
        "Remaining at the same level.",
        "Walking was unchanged at 15%.",
      ],
      [
        "proportion",
        "A part or share of a whole.",
        "The proportion taking the bus increased.",
      ],
    ]),
    sample: [
      "The bar chart presents the proportion of commuters travelling by car, bus, bicycle or on foot in one city in 2010 and 2020. The figures indicate how the distribution of these four modes changed over the decade.",
      "Overall, cars were the most common means of commuting in both years, although their share declined considerably. Cycling became more popular, bus use increased modestly, and the percentage of people walking was unchanged.",
      "In 2010, cars accounted for 50% of commuters, exactly twice the bus figure of 25%. By 2020, the car share had fallen to 35%, while the proportion using buses had risen to 30%. Consequently, the gap between these two modes decreased from 25 to just five percentage points.",
      "Bicycles were the least common option initially, at 10%, but this figure doubled to 20% in 2020. This increase put cycling above walking, which remained at 15% in both years. Taken together, the three alternatives to cars represented 65% of commuters in 2020, compared with half in 2010.",
    ],
    cohesiveDevices,
  },
  {
    id: "household-energy",
    title: "Household energy use",
    task: 1,
    type: "Pie chart",
    topic: "Environment",
    band: "8.0",
    question:
      "The pie chart shows how energy was used in an average household in a country in 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    graphic: {
      type: "Pie chart",
      description:
        "Average household energy use in 2020: heating 40%, water heating 25%, appliances 20%, lighting 10%, cooling 5%. Total 100%.",
    },
    outline: outline([
      [
        "Introduction",
        "Identify the energy distribution for an average household in 2020.",
      ],
      [
        "Overview",
        "Heating dominated; cooling was smallest; heating and water heating together made up 65%.",
      ],
      ["Body 1", "Compare the two heating categories and appliances."],
      [
        "Body 2",
        "Compare lighting and cooling, using ratios rather than listing alone.",
      ],
    ]),
    vocabulary: vocab([
      [
        "consumption",
        "The amount of something used.",
        "Heating made up 40% of consumption.",
      ],
      [
        "combined",
        "Considered together.",
        "The combined heating share was 65%.",
      ],
      [
        "a quarter",
        "One fourth, or 25%.",
        "Water heating used a quarter of the total.",
      ],
      [
        "twice as much",
        "Double the amount.",
        "Lighting used twice as much energy as cooling.",
      ],
      [
        "smallest share",
        "The lowest proportion of a total.",
        "Cooling had the smallest share.",
      ],
    ]),
    sample: [
      "The pie chart illustrates the distribution of energy consumption across five uses in an average household in one country in 2020. The categories shown are space heating, water heating, appliances, lighting and cooling.",
      "Overall, heating was the largest use of household energy, whereas cooling represented the smallest share. The combined contribution of space heating and water heating was substantially greater than that of the other three categories together.",
      "Space heating accounted for 40% of total consumption. Water heating was the second largest category, using a quarter of the total, or 25%. Together, these two activities represented 65% of household energy use. Appliances consumed a further 20%, which was half the figure for space heating and five percentage points below water heating.",
      "The remaining energy was divided between lighting and cooling, at 10% and 5%, respectively. Lighting therefore used twice as much energy as cooling, although their combined share of 15% was still below that of appliances alone. Space heating consumed eight times the amount allocated to cooling.",
    ],
    cohesiveDevices,
  },
  {
    id: "library-visitors",
    title: "Visitors to three public libraries",
    task: 1,
    type: "Table",
    topic: "Education",
    band: "7.0",
    question:
      "The table shows annual visitor numbers, in thousands, at three public libraries in 2010, 2015 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    graphic: {
      type: "Table",
      description:
        "Annual library visitors (thousands). Columns: 2010, 2015, 2020. Central: 120, 150, 180. North: 80, 75, 70. South: 50, 70, 100.",
    },
    outline: outline([
      ["Introduction", "State the measure, units, libraries and years."],
      [
        "Overview",
        "Central was busiest throughout; Central and South grew while North declined.",
      ],
      ["Body 1", "Describe Central's steady growth and North's gradual fall."],
      ["Body 2", "Explain South's doubling and its overtaking North by 2020."],
    ]),
    vocabulary: vocab([
      [
        "attendance",
        "The number of people visiting a place.",
        "Attendance increased at Central Library.",
      ],
      [
        "overtook",
        "Moved above another figure.",
        "South overtook North by 2020.",
      ],
      [
        "gradual decline",
        "A slow decrease over time.",
        "North experienced a gradual decline.",
      ],
      [
        "twofold increase",
        "Growth to twice the original value.",
        "South recorded a twofold increase.",
      ],
      [
        "busiest",
        "Having the largest number of visitors.",
        "Central remained the busiest library.",
      ],
    ]),
    sample: [
      "The table compares annual attendance at Central, North and South libraries in 2010, 2015 and 2020. Visitor numbers are given in thousands, allowing changes at each library to be compared over a ten-year period.",
      "Overall, Central remained the busiest library throughout. Both Central and South attracted more visitors over time, while North experienced a gradual decline. South was initially the least visited but overtook North by the end of the period.",
      "Central Library welcomed 120,000 visitors in 2010. This rose to 150,000 in 2015 and 180,000 in 2020, representing equal increases of 30,000 in each five-year interval. By contrast, attendance at North fell from 80,000 to 75,000 and then to 70,000, a total reduction of 10,000 visitors.",
      "South began with only 50,000 visitors, which was 30,000 fewer than North. Its figure rose to 70,000 in 2015 before reaching 100,000 in 2020, a twofold increase over the decade. Although South finished ahead of North, it still attracted 80,000 fewer visitors than Central in the final year.",
    ],
    cohesiveDevices,
  },
  {
    id: "paper-recycling",
    title: "How paper is recycled",
    task: 1,
    type: "Process",
    topic: "Environment",
    band: "8.0",
    question:
      "The diagram shows the process used to recycle waste paper into new paper. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    graphic: {
      type: "Process",
      description:
        "Six stages in order: 1. Collect waste paper. 2. Sort paper. 3. Mix with water to make pulp. 4. Filter and remove ink. 5. Press and dry. 6. Roll into new paper. Arrows connect each consecutive stage.",
    },
    outline: outline([
      [
        "Introduction",
        "Paraphrase the conversion of waste paper into new paper.",
      ],
      [
        "Overview",
        "Describe a six-stage linear process, from collection to finished rolls.",
      ],
      [
        "Body 1",
        "Group collection, sorting and pulping; describe the addition of water.",
      ],
      [
        "Body 2",
        "Group cleaning, pressing/drying and rolling; use passive voice and sequence markers.",
      ],
    ]),
    vocabulary: vocab([
      [
        "pulp",
        "A soft wet mixture of paper fibres and water.",
        "Water is added to create pulp.",
      ],
      [
        "subsequently",
        "After the preceding stage.",
        "The material is subsequently filtered.",
      ],
      [
        "impurities",
        "Unwanted substances within a material.",
        "Filtering removes impurities.",
      ],
      [
        "compressed",
        "Pressed firmly into a smaller or thinner form.",
        "The material is compressed into sheets.",
      ],
      [
        "finished product",
        "The item produced at the end of a process.",
        "New paper is the finished product.",
      ],
    ]),
    sample: [
      "The diagram illustrates how waste paper is transformed into new paper through an industrial recycling process. It presents the sequence from collecting the discarded material to producing rolls that can be used again.",
      "Overall, there are six main stages in this linear process. The first two involve preparing the waste paper, the middle stages turn it into a clean mixture, and the final steps produce the finished product. Water is introduced during the third stage.",
      "Initially, waste paper is collected and taken to the sorting stage. The paper is sorted before being mixed with water, which converts the material into pulp. At this point, the input has changed from dry waste paper into a wet mixture that can be processed further.",
      "The pulp is subsequently filtered and the ink is removed. These operations eliminate impurities before the material proceeds to pressing and drying. During this fifth stage, the cleaned mixture is compressed and moisture is removed. Finally, the resulting paper is rolled, completing the conversion of discarded paper into a new usable product.",
    ],
    cohesiveDevices,
  },
  {
    id: "riverside-park",
    title: "Changes to Riverside Park",
    task: 1,
    type: "Map",
    topic: "Urban Development",
    band: "8.0",
    question:
      "The maps show Riverside Park in 2000 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.",
    graphic: {
      type: "Map",
      description:
        "North is up. In both years a river borders the east edge and the entrance is at the south. In 2000: woodland in the northwest, lawn in the northeast, pond in the southwest, car park in the southeast. In 2020: woodland retained in the northwest, playground replaces the northeastern lawn, garden replaces the southwestern pond, cafe replaces the southeastern car park, and a north-south footpath runs through the centre.",
    },
    outline: outline([
      [
        "Introduction",
        "Paraphrase the park redevelopment between 2000 and 2020.",
      ],
      [
        "Overview",
        "More leisure facilities and a central path were added; woodland, river and entrance remained.",
      ],
      [
        "Body 1",
        "Describe the northern areas: retained woodland and lawn replaced by playground.",
      ],
      [
        "Body 2",
        "Describe the southern changes and new path, using compass directions.",
      ],
    ]),
    vocabulary: vocab([
      [
        "redevelopment",
        "Changes made to improve or repurpose an area.",
        "The maps show the redevelopment of the park.",
      ],
      [
        "retained",
        "Kept in the same place or condition.",
        "The woodland was retained.",
      ],
      [
        "replaced by",
        "Removed so a different feature occupies the site.",
        "The pond was replaced by a garden.",
      ],
      [
        "eastern boundary",
        "The edge on the east side of a site.",
        "The river follows the eastern boundary.",
      ],
      [
        "pedestrian access",
        "A route or entrance for people walking.",
        "The new path improved pedestrian access.",
      ],
    ]),
    sample: [
      "The two maps show the layout of Riverside Park in 2000 and 2020, illustrating the redevelopment that took place over the twenty-year period. They identify changes to the park's facilities as well as features that remained in place.",
      "Overall, the park gained several leisure facilities and a central footpath. While most of its internal areas changed function, the woodland in the northwest was retained. The river along the eastern boundary and the entrance to the south also remained in the same positions.",
      "In the northern part of the park, the woodland continued to occupy the western section in 2020. By contrast, the lawn to its east was replaced by a playground. These two areas were separated by the new footpath, which ran through the centre of the park from north to south.",
      "Further south, the former pond in the southwest was replaced by a garden. On the opposite side, a cafe occupied the site of the earlier car park. The central path connected with the existing southern entrance, providing pedestrian access through the redesigned park.",
    ],
    cohesiveDevices,
  },
];
