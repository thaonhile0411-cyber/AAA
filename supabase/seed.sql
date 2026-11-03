-- Original MVP seed content. It contains no copied IELTS exam passages and no
-- external resource URLs. Safe to rerun because stable UUIDs are upserted.

insert into public.placement_questions
  (id, skill, prompt, options, difficulty, position, is_active)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'reading',
    'The campus library will open at 10:00 on Saturday instead of 08:00 because the electrical system is being checked. What is the main purpose of this notice?',
    '["To announce a temporary opening-time change", "To advertise a new library service", "To cancel a Saturday workshop", "To request student volunteers"]'::jsonb,
    1,
    1,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'reading',
    'A small study compared two note-taking methods. Students who summarized ideas in their own words recalled more information one week later than students who copied sentences. Which conclusion is best supported?',
    '["Summarizing may support longer-term recall", "Copying is always faster", "All students prefer handwritten notes", "Memory cannot be improved through practice"]'::jsonb,
    2,
    2,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'reading',
    'The proposal was initially described as impractical; nevertheless, a limited trial produced enough evidence for the committee to reconsider it. What does nevertheless signal?',
    '["A contrast with the previous idea", "A cause of the trial", "A list of equal options", "A definition of evidence"]'::jsonb,
    3,
    3,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'listening',
    'A tutor says: “Please submit the outline by Thursday. The complete report is not due until next Monday.” When is the outline due?',
    '["Thursday", "Friday", "Monday", "Wednesday"]'::jsonb,
    1,
    1,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'listening',
    'A speaker says: “The morning tour is full, but two places remain on the tour leaving at half past two.” Which tour still has places?',
    '["The 2:30 p.m. tour", "The morning tour", "The noon tour", "The 3:30 p.m. tour"]'::jsonb,
    2,
    2,
    true
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'listening',
    'A lecturer says: “While cost influenced our decision, reliability ultimately proved decisive.” What was the most important factor?',
    '["Reliability", "Cost", "Speed", "Appearance"]'::jsonb,
    3,
    3,
    true
  )
on conflict (id) do update set
  skill = excluded.skill,
  prompt = excluded.prompt,
  options = excluded.options,
  difficulty = excluded.difficulty,
  position = excluded.position,
  is_active = excluded.is_active;

insert into public.placement_question_keys
  (question_id, correct_option, explanation)
values
  (
    '10000000-0000-4000-8000-000000000001',
    'To announce a temporary opening-time change',
    'The notice contrasts the usual and temporary Saturday opening times.'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'Summarizing may support longer-term recall',
    'This cautious conclusion matches the reported one-week comparison.'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'A contrast with the previous idea',
    'The trial result contrasts with the earlier judgment that the proposal was impractical.'
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    'Thursday',
    'The speaker explicitly assigns Thursday to the outline.'
  ),
  (
    '10000000-0000-4000-8000-000000000005',
    'The 2:30 p.m. tour',
    'Half past two means 2:30.'
  ),
  (
    '10000000-0000-4000-8000-000000000006',
    'Reliability',
    'The phrase “ultimately proved decisive” identifies reliability as the determining factor.'
  )
on conflict (question_id) do update set
  correct_option = excluded.correct_option,
  explanation = excluded.explanation;

insert into public.learning_materials
  (id, skill, title, summary, material_type, level_band_min, level_band_max,
   milestone_tag, content, estimated_minutes, is_published)
values
  (
    '20000000-0000-4000-8000-000000000001',
    'reading',
    'Finding the Main Idea',
    'Practice separating the central message from supporting details.',
    'exercise',
    4.0,
    6.0,
    'reading-main-ideas',
    'Read a short paragraph once for its topic. Read it again and write one sentence that covers the whole paragraph. Then label each remaining sentence as an example, reason, or detail.',
    20,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'reading',
    'Recognizing Contrast Signals',
    'Build accuracy with words that signal contrast or qualification.',
    'lesson',
    5.0,
    7.0,
    'reading-cohesion',
    'Review the signals however, although, whereas, despite, and nevertheless. For each signal, identify the two ideas being contrasted and state how the second idea changes the first.',
    15,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    'listening',
    'Listening for Dates and Times',
    'Train recognition of corrected dates, deadlines, and time expressions.',
    'exercise',
    4.0,
    6.0,
    'listening-key-details',
    'Ask a partner to read ten original scheduling statements, including two self-corrections. Record only the final date or time in each statement, then compare your notes with the script.',
    20,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    'writing',
    'Task Response Planning Checklist',
    'Use a short checklist to keep an essay focused on every part of a prompt.',
    'checklist',
    5.0,
    7.0,
    'writing-task-response',
    'Before drafting: underline each instruction, state your position in one sentence, list two distinct supporting ideas, add one specific example for each, and confirm that every idea answers the prompt.',
    15,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000005',
    'writing',
    'Clear Comparison Practice',
    'Practice describing differences without inventing causes.',
    'practice_prompt',
    5.0,
    7.0,
    'writing-comparisons',
    'Create a small table with three categories and values for two imaginary years. Write an overview identifying the largest value and the clearest change, followed by two comparison sentences using accurate figures.',
    25,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000006',
    'speaking',
    'Developing a Two-Minute Response',
    'Organize an extended answer with a clear sequence and supporting detail.',
    'practice_prompt',
    4.0,
    6.5,
    'speaking-fluency',
    'Choose a familiar place. Spend one minute noting: what it is, when you go there, one vivid detail, and why it matters. Speak for up to two minutes, record yourself, and check for long pauses and repeated words.',
    20,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000007',
    'speaking',
    'Giving Reasons and Examples',
    'Extend short answers using a repeatable reason-and-example pattern.',
    'exercise',
    5.0,
    7.0,
    'speaking-development',
    'Answer five opinion questions. For each response, give your view, add one reason beginning with because, and finish with a brief personal or hypothetical example.',
    20,
    true
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    'listening',
    'Following Speaker Corrections',
    'Notice when a speaker replaces an earlier detail with a final answer.',
    'lesson',
    5.0,
    7.0,
    'listening-distractors',
    'Listen for signals such as actually, rather, sorry, and I mean. When one appears, cross out the earlier detail and record only the corrected information.',
    15,
    true
  )
on conflict (id) do update set
  skill = excluded.skill,
  title = excluded.title,
  summary = excluded.summary,
  material_type = excluded.material_type,
  level_band_min = excluded.level_band_min,
  level_band_max = excluded.level_band_max,
  milestone_tag = excluded.milestone_tag,
  content = excluded.content,
  estimated_minutes = excluded.estimated_minutes,
  is_published = excluded.is_published;
