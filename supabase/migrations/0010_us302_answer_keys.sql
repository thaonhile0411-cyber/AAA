begin;

insert into public.practice_exercise_grading (exercise_id, transcript)
select e.id, source.transcript
from (values
  ('voa-sleepy-teens-listening', 'Surveys of American teenagers find that about half do not get enough sleep on school nights. They get sixty to ninety minutes less than experts recommend. At St. George''s School, a thirty-minute delay in the start time reduced health-centre visits by tired students and reduced late arrivals. Students said they were less sleepy, while teachers noticed a more positive mood.'),
  ('voa-test-anxiety-listening', 'Some students become so nervous before a test that they perform poorly even when they know the material. Researchers asked anxious students to spend ten minutes writing about their worries. Students who wrote improved their performance by an average of five percent. In a biology class, highly anxious students who did the writing received an average grade of B plus, compared with B minus for students who did not.'),
  ('voa-learning-from-failure-listening', 'A study says organizations learn more from failures than successes and keep that knowledge longer. The researchers examined organizations that launch space vehicles. After the Columbia shuttle broke apart in 2003, NASA suspended flights and an investigation suggested changes. One researcher says searching for solutions after failure can make leaders more open-minded and that organizations should share useful information openly.'),
  ('voa-science-websites-listening', 'The Mad Science Group launched a science-based social network for children called Mad Science Kids Club. It was designed for children aged six to fourteen. Children could join groups about mathematics or space, ask science questions, and try experiments with their parents at home. The report also described websites that explain science news in accessible language and provide definitions of important words.')
) as source(slug, transcript)
join public.practice_exercises e on e.slug = source.slug
on conflict (exercise_id) do update set transcript = excluded.transcript;

with key_data(
  slug, position, accepted_answers, display_answer, explanation,
  evidence_text, evidence_paragraph, audio_start_seconds, audio_end_seconds
) as (values
  ('voa-sleepy-teens-reading', 1, array['Schools may begin very early.'], 'Schools may begin very early.', 'The passage explains that many schools start as early as seven, reducing the sleep available to teenagers.', 'many schools start classes as early as seven in the morning', 0, null::numeric, null::numeric),
  ('voa-sleepy-teens-reading', 2, array['FALSE'], 'FALSE', 'Experts recommend eight to ten hours, so the statement that teenagers need fewer than eight hours is false.', 'teens need eight to ten hours of sleep a night', 1, null, null),
  ('voa-sleepy-teens-reading', 3, array['minutes','minute'], 'minutes', 'The school tested a thirty-minute delay.', 'a thirty-minute delay', 2, null, null),
  ('voa-sleepy-teens-reading', 4, array['TRUE'], 'TRUE', 'The passage directly states that late arrivals fell by a third.', 'Late arrivals to first period fell by a third', 2, null, null),
  ('voa-sleepy-teens-reading', 5, array['mood'], 'mood', 'Teachers observed that students had a more positive mood.', 'teachers noticed a more positive mood', 2, null, null),

  ('voa-test-anxiety-reading', 1, array['Why worry can affect test performance'], 'Why worry can affect test performance', 'Paragraph A explains how worry consumes attention and memory that students need during an exam.', 'worrying about consequences uses attention and memory resources', 0, null, null),
  ('voa-test-anxiety-reading', 2, array['Ten minutes','10 minutes'], 'Ten minutes', 'The researchers asked anxious students to write for ten minutes immediately before the exam.', 'spent ten minutes writing about their worries', 1, null, null),
  ('voa-test-anxiety-reading', 3, array['FALSE'], 'FALSE', 'The quiet group performed twelve percent worse; the group that wrote improved by five percent.', 'students who sat quietly performed an average of twelve percent worse', 1, null, null),
  ('voa-test-anxiety-reading', 4, array['B+','B plus'], 'B+', 'Highly anxious students who completed the writing activity received an average grade of B+.', 'received an average grade of B+', 2, null, null),
  ('voa-test-anxiety-reading', 5, array['FALSE'], 'FALSE', 'The passage says students can also use the technique at home or in a library, not only before an exam.', 'students can also try the technique at home or in a library', 2, null, null),

  ('voa-learning-from-failure-reading', 1, array['It can last for years.'], 'It can last for years.', 'The study found that knowledge gained from failure can remain useful for years.', 'knowledge gained from failure can last for years', 0, null, null),
  ('voa-learning-from-failure-reading', 2, array['FALSE'], 'FALSE', 'Although material damaged Atlantis, the 2002 flight was considered a success.', 'the flight was considered a success', 1, null, null),
  ('voa-learning-from-failure-reading', 3, array['Two shuttle events and their consequences'], 'Two shuttle events and their consequences', 'Paragraph B contrasts the Atlantis and Columbia events and explains the consequences of each.', 'In 2002, insulating material damaged a rocket on Atlantis', 1, null, null),
  ('voa-learning-from-failure-reading', 4, array['suspended'], 'suspended', 'NASA suspended flights after Columbia broke apart.', 'NASA suspended flights', 1, null, null),
  ('voa-learning-from-failure-reading', 5, array['TRUE'], 'TRUE', 'Desai explicitly recommends encouraging open information sharing.', 'encourage the open sharing of information', 2, null, null),

  ('voa-science-websites-reading', 1, array['To support online scientific discovery'], 'To support online scientific discovery', 'The network was designed to build an online community while children explored scientific discovery.', 'build an online community while exploring scientific discovery', 0, null, null),
  ('voa-science-websites-reading', 2, array['Activities and groups within the club'], 'Activities and groups within the club', 'Paragraph B lists club groups, expert answers and at-home experiments.', 'The club included groups such as a Counting Club', 1, null, null),
  ('voa-science-websites-reading', 3, array['TRUE'], 'TRUE', 'The Counting Club is specifically described as a group for children who enjoy mathematics.', 'a Counting Club for children who enjoy mathematics', 1, null, null),
  ('voa-science-websites-reading', 4, array['home'], 'home', 'The Science Zone provided experiments for children and parents to do at home.', 'experiments that children and parents could do at home', 1, null, null),
  ('voa-science-websites-reading', 5, array['It had not tested every activity.'], 'It had not tested every activity.', 'The report acknowledged that it had not tested every activity on the sites.', 'it had not tested every activity itself', 2, null, null),

  ('voa-sleepy-teens-listening', 1, array['American teenagers'], 'American teenagers', 'The announcement opens by identifying American teenagers as the subject.', 'Surveys of American teenagers', null, 0, 4),
  ('voa-sleepy-teens-listening', 2, array['30','thirty'], '30', 'The school delayed its start time by thirty minutes.', 'a thirty-minute delay', null, 7, 11),
  ('voa-sleepy-teens-listening', 3, array['FALSE'], 'FALSE', 'Late arrivals were reduced after the delay, so the statement that they increased is false.', 'reduced late arrivals', null, 10, 14),
  ('voa-sleepy-teens-listening', 4, array['A more positive mood'], 'A more positive mood', 'Teachers noticed a more positive mood among students.', 'teachers noticed a more positive mood', null, 14, 18),
  ('voa-sleepy-teens-listening', 5, array['sleepy'], 'sleepy', 'Students reported that they felt less sleepy.', 'Students said they were less sleepy', null, 12, 17),

  ('voa-test-anxiety-listening', 1, array['10','ten'], '10', 'The students spent ten minutes writing about their worries.', 'spend ten minutes writing about their worries', null, 5, 10),
  ('voa-test-anxiety-listening', 2, array['Their worries'], 'Their worries', 'The researchers asked the students to write about their worries.', 'writing about their worries', null, 7, 11),
  ('voa-test-anxiety-listening', 3, array['TRUE'], 'TRUE', 'The audio states that writers improved by an average of five percent.', 'improved their performance by an average of five percent', null, 10, 15),
  ('voa-test-anxiety-listening', 4, array['biology'], 'biology', 'The later study was conducted in a biology class.', 'In a biology class', null, 14, 18),
  ('voa-test-anxiety-listening', 5, array['B plus','B+'], 'B plus', 'Highly anxious writers received an average grade of B plus.', 'received an average grade of B plus', null, 17, 22),

  ('voa-learning-from-failure-listening', 1, array['Knowledge'], 'Knowledge', 'The study says organizations retain knowledge from failures for longer.', 'keep that knowledge longer', null, 0, 5),
  ('voa-learning-from-failure-listening', 2, array['2003'], '2003', 'The Columbia shuttle broke apart in 2003.', 'broke apart in 2003', null, 7, 11),
  ('voa-learning-from-failure-listening', 3, array['FALSE'], 'FALSE', 'NASA suspended flights and held an investigation, so it did not continue without one.', 'NASA suspended flights and an investigation suggested changes', null, 9, 14),
  ('voa-learning-from-failure-listening', 4, array['More open-minded'], 'More open-minded', 'The researcher says searching for solutions can make leaders more open-minded.', 'make leaders more open-minded', null, 13, 18),
  ('voa-learning-from-failure-listening', 5, array['useful'], 'useful', 'Organizations are advised to share useful information openly.', 'share useful information openly', null, 17, 21),

  ('voa-science-websites-listening', 1, array['A science social network'], 'A science social network', 'The Mad Science Group launched a science-based social network.', 'launched a science-based social network', null, 0, 5),
  ('voa-science-websites-listening', 2, array['14','fourteen'], '14', 'The club was designed for children aged six to fourteen.', 'children aged six to fourteen', null, 5, 9),
  ('voa-science-websites-listening', 3, array['TRUE'], 'TRUE', 'The audio says children could try experiments with their parents at home.', 'try experiments with their parents at home', null, 10, 15),
  ('voa-science-websites-listening', 4, array['Space'], 'Space', 'Space is one of the group topics named in the audio.', 'groups about mathematics or space', null, 8, 13),
  ('voa-science-websites-listening', 5, array['words'], 'words', 'Some websites provided definitions of important words.', 'definitions of important words', null, 16, 21)
)
insert into public.practice_answer_keys (
  question_id, accepted_answers, display_answer, explanation,
  evidence_text, evidence_paragraph, audio_start_seconds, audio_end_seconds
)
select
  q.id, k.accepted_answers, k.display_answer, k.explanation,
  k.evidence_text, k.evidence_paragraph, k.audio_start_seconds, k.audio_end_seconds
from key_data k
join public.practice_exercises e on e.slug = k.slug
join public.practice_questions q on q.exercise_id = e.id and q.position = k.position
on conflict (question_id) do update set
  accepted_answers = excluded.accepted_answers,
  display_answer = excluded.display_answer,
  explanation = excluded.explanation,
  evidence_text = excluded.evidence_text,
  evidence_paragraph = excluded.evidence_paragraph,
  audio_start_seconds = excluded.audio_start_seconds,
  audio_end_seconds = excluded.audio_end_seconds;

do $$
begin
  if (select count(*) from public.practice_answer_keys) < 40 then
    raise exception 'US-302 requires all 40 VOA practice answer keys';
  end if;
end;
$$;

commit;
