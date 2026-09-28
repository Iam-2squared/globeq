-- Additive integrity upgrade. Never changes or deletes existing answers or accounts.
create unique index articles_region_event on globeq.news_articles(region,event_key);
create unique index questions_one_per_article on globeq.questions(article_id);
create index scores_recent_completion on globeq.user_scores(last_completed_day desc, streak_current desc, user_id);

create function globeq.protect_reviewed_question() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then raise exception 'reviewed question is immutable'; end if;
    return old;
  end if;
  if old.status <> 'draft' then
    if row(new.day_id,new.article_id,new.event_key,new.prompt,new.explanation,new.difficulty,new.position)
      is distinct from row(old.day_id,old.article_id,old.event_key,old.prompt,old.explanation,old.difficulty,old.position)
      or not ((old.status='reviewed' and new.status in ('reviewed','published'))
        or (old.status='published' and new.status in ('published','withdrawn'))
        or (old.status='withdrawn' and new.status='withdrawn'))
    then raise exception 'reviewed question is immutable'; end if;
  end if;
  return new;
end;
$$;
create trigger protect_reviewed_question before update or delete on globeq.questions
  for each row execute function globeq.protect_reviewed_question();

create function globeq.protect_reviewed_options() returns trigger language plpgsql as $$
declare v_question uuid;
begin
  if tg_op = 'DELETE' then v_question := old.question_id; else v_question := new.question_id; end if;
  if exists (select 1 from globeq.questions where id=v_question and status <> 'draft')
    or (tg_op='UPDATE' and exists (select 1 from globeq.questions where id=old.question_id and status <> 'draft'))
  then raise exception 'reviewed options are immutable'; end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger protect_reviewed_options before insert or update or delete on globeq.answer_options
  for each row execute function globeq.protect_reviewed_options();

create function globeq.protect_published_article() returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if old.state <> 'draft' then raise exception 'published article is immutable'; end if;
    return old;
  end if;
  if old.state <> 'draft' then
    if row(new.region,new.title,new.summary,new.source_name,new.source_url,new.published_at,new.category,new.tags,new.event_key)
      is distinct from row(old.region,old.title,old.summary,old.source_name,old.source_url,old.published_at,old.category,old.tags,old.event_key)
      or not ((old.state='published' and new.state in ('published','withdrawn'))
        or (old.state='withdrawn' and new.state='withdrawn'))
    then raise exception 'published article is immutable'; end if;
  end if;
  return new;
end;
$$;
create trigger protect_published_article before update or delete on globeq.news_articles
  for each row execute function globeq.protect_published_article();

revoke all on function globeq.protect_reviewed_question() from public;
revoke all on function globeq.protect_reviewed_options() from public;
revoke all on function globeq.protect_published_article() from public;
