-- Security hardening after first production audit. Additive only.
-- Pin trigger-function search_path values and remove unnecessary public RPC execution.
alter function globeq.reject_answer_change() set search_path = globeq, pg_catalog;
alter function globeq.protect_reviewed_question() set search_path = globeq, pg_catalog;
alter function globeq.protect_reviewed_options() set search_path = globeq, pg_catalog;
alter function globeq.protect_published_article() set search_path = globeq, pg_catalog;

revoke all on function globeq.reject_answer_change() from public;
revoke all on function globeq.protect_reviewed_question() from public;
revoke all on function globeq.protect_reviewed_options() from public;
revoke all on function globeq.protect_published_article() from public;
revoke all on function globeq.submit_answer(uuid, uuid, uuid) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname='anon') then
    execute 'revoke all on function globeq.reject_answer_change() from anon';
    execute 'revoke all on function globeq.protect_reviewed_question() from anon';
    execute 'revoke all on function globeq.protect_reviewed_options() from anon';
    execute 'revoke all on function globeq.protect_published_article() from anon';
    execute 'revoke all on function globeq.submit_answer(uuid, uuid, uuid) from anon';
  end if;
  if exists (select 1 from pg_roles where rolname='authenticated') then
    execute 'revoke all on function globeq.reject_answer_change() from authenticated';
    execute 'revoke all on function globeq.protect_reviewed_question() from authenticated';
    execute 'revoke all on function globeq.protect_reviewed_options() from authenticated';
    execute 'revoke all on function globeq.protect_published_article() from authenticated';
    execute 'revoke all on function globeq.submit_answer(uuid, uuid, uuid) from authenticated';
  end if;
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public';
    if exists (select 1 from pg_roles where rolname='anon') then execute 'revoke all on function public.rls_auto_enable() from anon'; end if;
    if exists (select 1 from pg_roles where rolname='authenticated') then execute 'revoke all on function public.rls_auto_enable() from authenticated'; end if;
  end if;
end $$;
