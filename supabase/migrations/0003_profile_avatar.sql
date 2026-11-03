-- Recovered verbatim from the hosted project's migration history (0003).
alter table public.profiles
  add column avatar_url text check (
    avatar_url is null or (char_length(avatar_url) <= 2048 and avatar_url like 'https://%')
  );

alter table public.learning_goals
  add column self_reported_scores jsonb;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  avatar text := new.raw_user_meta_data ->> 'avatar_url';
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name', '')), 80), ''),
    case when char_length(avatar) <= 2048 and avatar like 'https://%' then avatar end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
