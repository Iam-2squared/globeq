-- Japan V1 initial schema. Apply once. All later migrations must be additive and preserve users/answers.
create schema if not exists globeq;
revoke all on schema globeq from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on schema globeq from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on schema globeq from authenticated'; end if;
end $$;

create table globeq.users (
  id uuid primary key default gen_random_uuid(),
  username text not null check (char_length(username) between 2 and 32),
  username_key text not null unique,
  role text not null default 'member' check (role in ('member', 'editor')),
  created_at timestamptz not null default now()
);
create table globeq.auth_credentials (
  user_id uuid primary key references globeq.users(id) on delete restrict,
  password_hash text not null,
  updated_at timestamptz not null default now()
);
create table globeq.sessions (
  token_hash text primary key,
  user_id uuid not null references globeq.users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user on globeq.sessions(user_id, expires_at);

create table globeq.news_articles (
  id uuid primary key default gen_random_uuid(),
  region text not null default 'japan' check (region in ('japan', 'world')),
  title text not null check (char_length(title) between 8 and 300),
  summary text not null check (char_length(summary) between 12 and 800),
  source_name text not null,
  source_url text not null unique check (source_url ~ '^https://'),
  published_at timestamptz not null,
  category text not null,
  tags text[] not null default '{}',
  event_key text not null,
  state text not null default 'draft' check (state in ('draft', 'published', 'withdrawn')),
  created_at timestamptz not null default now()
);
create index articles_region_time on globeq.news_articles(region, published_at desc, id);

create table globeq.quiz_days (
  id uuid primary key default gen_random_uuid(),
  region text not null check (region in ('japan', 'world')),
  local_date date not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  published_by uuid references globeq.users(id),
  unique (region, local_date)
);
create index days_published on globeq.quiz_days(region, local_date desc) where status = 'published';

create table globeq.questions (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references globeq.quiz_days(id) on delete restrict,
  article_id uuid not null references globeq.news_articles(id) on delete restrict,
  event_key text not null,
  prompt text not null check (char_length(prompt) between 10 and 500),
  explanation text not null check (char_length(explanation) between 12 and 800),
  difficulty text not null check (difficulty in ('easy', 'normal', 'hard')),
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'published', 'withdrawn')),
  position integer not null check (position > 0),
  created_at timestamptz not null default now(),
  unique (day_id, event_key),
  unique (day_id, position)
);
create index questions_day on globeq.questions(day_id, status, position);
create table globeq.answer_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references globeq.questions(id) on delete restrict,
  position smallint not null check (position between 1 and 4),
  label text not null check (char_length(label) between 1 and 240),
  is_correct boolean not null default false,
  unique (question_id, position)
);
create unique index one_correct_per_question on globeq.answer_options(question_id) where is_correct;

create table globeq.user_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references globeq.users(id) on delete restrict,
  question_id uuid not null references globeq.questions(id) on delete restrict,
  option_id uuid not null references globeq.answer_options(id) on delete restrict,
  is_correct boolean not null,
  competition_eligible boolean not null,
  answered_at timestamptz not null default now(),
  unique (user_id, question_id)
);
create index answers_user_date on globeq.user_answers(user_id, answered_at desc);
create table globeq.daily_stats (
  user_id uuid not null references globeq.users(id) on delete restrict,
  day_id uuid not null references globeq.quiz_days(id) on delete restrict,
  answered integer not null default 0 check (answered >= 0),
  correct integer not null default 0 check (correct >= 0),
  completed_at timestamptz,
  primary key (user_id, day_id)
);
create table globeq.user_scores (
  user_id uuid primary key references globeq.users(id) on delete restrict,
  total_answers integer not null default 0,
  correct_answers integer not null default 0,
  all_time_hard integer not null default 0,
  streak_current integer not null default 0,
  streak_longest integer not null default 0,
  last_completed_day date
);
create index scores_hard on globeq.user_scores(all_time_hard desc, user_id);
create index scores_streak on globeq.user_scores(streak_current desc, last_completed_day desc, user_id);
create table globeq.user_weekly_scores (
  user_id uuid not null references globeq.users(id) on delete restrict,
  monday date not null,
  hard_correct integer not null default 0,
  primary key (user_id, monday)
);
create index weekly_scores_top on globeq.user_weekly_scores(monday, hard_correct desc, user_id);

create table globeq.badges (
  id text primary key,
  title text not null,
  description text not null
);
create table globeq.user_badges (
  user_id uuid not null references globeq.users(id) on delete restrict,
  badge_id text not null references globeq.badges(id) on delete restrict,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
create table globeq.selected_badges (
  user_id uuid primary key references globeq.users(id) on delete restrict,
  badge_id text not null,
  foreign key (user_id, badge_id) references globeq.user_badges(user_id, badge_id) on delete restrict
);
insert into globeq.badges(id,title,description) values
 ('first-answer','はじめの一歩','初めて競技問題に回答'),
 ('first-perfect','正確な一日','20問以上の一日を全問正解'),
 ('week-streak','7日連続','7日連続でその日の問題を完了')
on conflict (id) do nothing;

create table globeq.content_reviews (
  question_id uuid primary key references globeq.questions(id) on delete restrict,
  reviewer_id uuid not null references globeq.users(id),
  verification_note text not null check (char_length(verification_note) >= 12),
  source_checked_at timestamptz not null default now(),
  rights_checked boolean not null check (rights_checked),
  neutrality_checked boolean not null check (neutrality_checked)
);
create table globeq.content_events (
  id bigserial primary key,
  actor_id uuid references globeq.users(id),
  question_id uuid references globeq.questions(id),
  event_type text not null,
  note text not null,
  created_at timestamptz not null default now()
);
create table globeq.question_reports (
  id bigserial primary key,
  user_id uuid not null references globeq.users(id),
  question_id uuid not null references globeq.questions(id),
  reason text not null check (char_length(reason) between 10 and 1000),
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now()
);
create table globeq.rate_limits (
  key_hash text not null,
  bucket text not null,
  window_start timestamptz not null,
  hits integer not null check (hits > 0),
  primary key (key_hash, bucket, window_start)
);

-- Supabase Data API defense: a private, unexposed schema and explicit revoked privileges.
revoke all on all tables in schema globeq from public;
revoke all on all sequences in schema globeq from public;
alter default privileges in schema globeq revoke all on tables from public;
alter default privileges in schema globeq revoke all on sequences from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on all tables in schema globeq from anon';
    execute 'revoke all on all sequences in schema globeq from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on all tables in schema globeq from authenticated';
    execute 'revoke all on all sequences in schema globeq from authenticated';
  end if;
end $$;

-- The sole competitive answer entry point. The user lock serializes concurrent answers
-- to different questions as well as retrying the same question.
create or replace function globeq.submit_answer(p_user uuid, p_question uuid, p_option uuid)
returns table(answer_id uuid, option_id uuid, correct boolean, eligible boolean, first_submit boolean)
language plpgsql
set search_path = globeq, pg_catalog
as $$
declare
  v_day uuid;
  v_date date;
  v_difficulty text;
  v_option_correct boolean;
  v_answer uuid;
  v_existing record;
  v_eligible boolean;
  v_count integer;
  v_correct_count integer;
  v_completed timestamptz;
  v_monday date;
begin
  perform 1 from globeq.users where id = p_user for update;
  if not found then raise exception 'unauthorized' using errcode = '28000'; end if;

  select a.id, a.option_id, a.is_correct, a.competition_eligible
    into v_existing from globeq.user_answers a
    where a.user_id = p_user and a.question_id = p_question;
  if found then
    return query select v_existing.id, v_existing.option_id, v_existing.is_correct, v_existing.competition_eligible, false;
    return;
  end if;

  select q.day_id, d.local_date, q.difficulty into v_day, v_date, v_difficulty
    from globeq.questions q join globeq.quiz_days d on d.id = q.day_id
    where q.id = p_question and q.status = 'published' and d.status = 'published' and d.region = 'japan';
  if not found then raise exception 'question_unavailable' using errcode = '22023'; end if;
  select o.is_correct into v_option_correct from globeq.answer_options o
    where o.id = p_option and o.question_id = p_question;
  if not found then raise exception 'invalid_option' using errcode = '22023'; end if;
  v_eligible := v_date = (now() at time zone 'Asia/Tokyo')::date;

  insert into globeq.user_answers(user_id, question_id, option_id, is_correct, competition_eligible)
  values (p_user, p_question, p_option, v_option_correct, v_eligible)
  on conflict (user_id, question_id) do nothing returning id into v_answer;
  if v_answer is null then
    select a.id, a.option_id, a.is_correct, a.competition_eligible
      into v_existing from globeq.user_answers a
      where a.user_id = p_user and a.question_id = p_question;
    return query select v_existing.id, v_existing.option_id, v_existing.is_correct, v_existing.competition_eligible, false;
    return;
  end if;

  if v_eligible then
    insert into globeq.user_scores(user_id, total_answers, correct_answers, all_time_hard)
    values (p_user, 1, v_option_correct::integer, (v_option_correct and v_difficulty = 'hard')::integer)
    on conflict (user_id) do update set
      total_answers = globeq.user_scores.total_answers + 1,
      correct_answers = globeq.user_scores.correct_answers + excluded.correct_answers,
      all_time_hard = globeq.user_scores.all_time_hard + excluded.all_time_hard;

    insert into globeq.daily_stats(user_id, day_id, answered, correct)
    values (p_user, v_day, 1, v_option_correct::integer)
    on conflict (user_id, day_id) do update set
      answered = globeq.daily_stats.answered + 1,
      correct = globeq.daily_stats.correct + excluded.correct,
      completed_at = case when globeq.daily_stats.answered + 1 >= 20
        then coalesce(globeq.daily_stats.completed_at, now()) else globeq.daily_stats.completed_at end
    returning answered, correct, completed_at into v_count, v_correct_count, v_completed;

    if v_option_correct and v_difficulty = 'hard' then
      v_monday := v_date - (extract(isodow from v_date)::integer - 1);
      insert into globeq.user_weekly_scores(user_id, monday, hard_correct)
      values(p_user, v_monday, 1)
      on conflict (user_id, monday) do update
        set hard_correct = globeq.user_weekly_scores.hard_correct + 1;
    end if;

    if v_count = 1 then
      insert into globeq.user_badges(user_id, badge_id) values (p_user, 'first-answer') on conflict do nothing;
    end if;
    if v_count = 20 then
      update globeq.user_scores s set
        streak_current = case when s.last_completed_day = v_date - 1 then s.streak_current + 1 else 1 end,
        streak_longest = greatest(s.streak_longest, case when s.last_completed_day = v_date - 1 then s.streak_current + 1 else 1 end),
        last_completed_day = v_date
      where s.user_id = p_user and (s.last_completed_day is null or s.last_completed_day < v_date);
      if v_correct_count = 20 then
        insert into globeq.user_badges(user_id, badge_id) values (p_user, 'first-perfect') on conflict do nothing;
      end if;
      if (select streak_current from globeq.user_scores where user_id = p_user) >= 7 then
        insert into globeq.user_badges(user_id, badge_id) values (p_user, 'week-streak') on conflict do nothing;
      end if;
    end if;
  end if;

  return query select v_answer, p_option, v_option_correct, v_eligible, true;
end;
$$;
revoke all on function globeq.submit_answer(uuid, uuid, uuid) from public;
