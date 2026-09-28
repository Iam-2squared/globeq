-- Ranking now counts all correct first competitive attempts, regardless of difficulty.
alter table globeq.user_weekly_scores add column if not exists first_correct integer not null default 0;

update globeq.user_weekly_scores w set first_correct=x.correct
from (
  select a.user_id,(d.local_date-(extract(isodow from d.local_date)::integer-1))::date monday,
    count(*) filter(where a.is_correct)::integer correct
  from globeq.user_answers a
  join globeq.questions q on q.id=a.question_id
  join globeq.quiz_days d on d.id=q.day_id
  where a.competition_eligible and q.status='published'
  group by a.user_id,(d.local_date-(extract(isodow from d.local_date)::integer-1))::date
) x where w.user_id=x.user_id and w.monday=x.monday;

insert into globeq.user_weekly_scores(user_id,monday,hard_correct,first_correct)
select a.user_id,(d.local_date-(extract(isodow from d.local_date)::integer-1))::date,0,
  count(*) filter(where a.is_correct)::integer
from globeq.user_answers a
join globeq.questions q on q.id=a.question_id
join globeq.quiz_days d on d.id=q.day_id
where a.competition_eligible and q.status='published'
group by a.user_id,(d.local_date-(extract(isodow from d.local_date)::integer-1))::date
on conflict(user_id,monday) do update set first_correct=excluded.first_correct;

create index if not exists weekly_scores_first_correct on globeq.user_weekly_scores(monday,first_correct desc,user_id);
create index if not exists scores_correct on globeq.user_scores(correct_answers desc,user_id);

create or replace function globeq.submit_answer(p_user uuid,p_question uuid,p_option uuid)
returns table(answer_id uuid,option_id uuid,correct boolean,eligible boolean,first_submit boolean)
language plpgsql set search_path=globeq,pg_catalog as $$
declare
 v_day uuid;v_date date;v_difficulty text;v_option_correct boolean;v_answer uuid;v_existing record;
 v_eligible boolean;v_count integer;v_correct_count integer;v_completed timestamptz;v_monday date;
begin
 perform 1 from globeq.users where id=p_user for update;
 if not found then raise exception 'unauthorized' using errcode='28000'; end if;
 select a.id,a.option_id,a.is_correct,a.competition_eligible into v_existing from globeq.user_answers a
  where a.user_id=p_user and a.question_id=p_question;
 if found then return query select v_existing.id,v_existing.option_id,v_existing.is_correct,v_existing.competition_eligible,false;return;end if;
 select q.day_id,d.local_date,q.difficulty into v_day,v_date,v_difficulty from globeq.questions q join globeq.quiz_days d on d.id=q.day_id
  where q.id=p_question and q.status='published' and d.status='published' and d.region='japan';
 if not found then raise exception 'question_unavailable' using errcode='22023'; end if;
 select o.is_correct into v_option_correct from globeq.answer_options o where o.id=p_option and o.question_id=p_question;
 if not found then raise exception 'invalid_option' using errcode='22023'; end if;
 v_eligible:=v_date=(now() at time zone 'Asia/Tokyo')::date;
 insert into globeq.user_answers(user_id,question_id,option_id,is_correct,competition_eligible)
 values(p_user,p_question,p_option,v_option_correct,v_eligible) on conflict(user_id,question_id) do nothing returning id into v_answer;
 if v_answer is null then
  select a.id,a.option_id,a.is_correct,a.competition_eligible into v_existing from globeq.user_answers a where a.user_id=p_user and a.question_id=p_question;
  return query select v_existing.id,v_existing.option_id,v_existing.is_correct,v_existing.competition_eligible,false;return;
 end if;
 if v_eligible then
  insert into globeq.user_scores(user_id,total_answers,correct_answers,all_time_hard)
  values(p_user,1,v_option_correct::integer,0) on conflict(user_id) do update set
   total_answers=globeq.user_scores.total_answers+1,correct_answers=globeq.user_scores.correct_answers+excluded.correct_answers;
  insert into globeq.daily_stats as ds(user_id,day_id,answered,correct) values(p_user,v_day,1,v_option_correct::integer)
  on conflict(user_id,day_id) do update set answered=ds.answered+1,correct=ds.correct+excluded.correct,
   completed_at=case when ds.answered+1>=20 then coalesce(ds.completed_at,now()) else ds.completed_at end
  returning ds.answered,ds.correct,ds.completed_at into v_count,v_correct_count,v_completed;
  if v_option_correct then
   v_monday:=v_date-(extract(isodow from v_date)::integer-1);
   insert into globeq.user_weekly_scores(user_id,monday,hard_correct,first_correct) values(p_user,v_monday,0,1)
   on conflict(user_id,monday) do update set first_correct=globeq.user_weekly_scores.first_correct+1;
  end if;
  if v_count=1 then insert into globeq.user_badges(user_id,badge_id) values(p_user,'first-answer') on conflict do nothing;end if;
  if v_count=20 then
   update globeq.user_scores s set streak_current=case when s.last_completed_day=v_date-1 then s.streak_current+1 else 1 end,
    streak_longest=greatest(s.streak_longest,case when s.last_completed_day=v_date-1 then s.streak_current+1 else 1 end),last_completed_day=v_date
    where s.user_id=p_user and(s.last_completed_day is null or s.last_completed_day<v_date);
   if v_correct_count=20 then insert into globeq.user_badges(user_id,badge_id) values(p_user,'first-perfect') on conflict do nothing;end if;
   if(select streak_current from globeq.user_scores where user_id=p_user)>=7 then insert into globeq.user_badges(user_id,badge_id) values(p_user,'week-streak') on conflict do nothing;end if;
  end if;
 end if;
 return query select v_answer,p_option,v_option_correct,v_eligible,true;
end;$$;

revoke all on function globeq.submit_answer(uuid,uuid,uuid) from public;
do $$ begin
 if exists(select 1 from pg_roles where rolname='anon') then execute 'revoke all on function globeq.submit_answer(uuid,uuid,uuid) from anon';end if;
 if exists(select 1 from pg_roles where rolname='authenticated') then execute 'revoke all on function globeq.submit_answer(uuid,uuid,uuid) from authenticated';end if;
end $$;
