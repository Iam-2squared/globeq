-- Operational audit log for the automatic Japan daily-content pipeline.
create table globeq.automation_runs (
  id bigserial primary key,
  local_date date not null,
  status text not null check (status in ('running','published','failed')),
  candidate_count integer not null default 0 check (candidate_count >= 0),
  accepted_count integer not null default 0 check (accepted_count >= 0),
  note text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index automation_runs_date on globeq.automation_runs(local_date desc,started_at desc);
create unique index automation_one_active_day on globeq.automation_runs(local_date) where status in ('running','published');
revoke all on globeq.automation_runs from public;
do $$ begin
  if exists(select 1 from pg_roles where rolname='anon') then execute 'revoke all on globeq.automation_runs from anon'; end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then execute 'revoke all on globeq.automation_runs from authenticated'; end if;
end $$;
