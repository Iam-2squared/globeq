import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { japanDate, mondayOf } from '../src/lib/time';
import { rankingQueries } from '../src/lib/ranking-queries';

const today = japanDate();
const questions: {id:string;correct:string;wrong:string}[] = [];
let db: PGlite;
let userId: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(readFileSync('supabase/migrations/20260928000001_japan_v1.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260928000002_content_integrity.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260928000003_answer_correction_lock.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260928000004_security_hardening.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260928000005_first_correct_ranking.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260928000006_daily_automation_runs.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260928000007_daily_automation_lock.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/20260928000008_variable_daily_question_count.sql','utf8'));
  const user = await db.query<{id:string}>("insert into globeq.users(username,username_key) values ('Starter','starter') returning id");
  userId = user.rows[0].id;
  await db.query('insert into globeq.user_scores(user_id) values ($1)',[userId]);
  const day = await db.query<{id:string}>("insert into globeq.quiz_days(region,local_date) values ('japan',$1) returning id",[today]);
  for (let i=1;i<=20;i++) {
    const article = await db.query<{id:string}>(`
      insert into globeq.news_articles(title,summary,source_name,source_url,published_at,category,event_key,state)
      values ($1,$2,'Synthetic fixture','https://example.test/news/' || $3,now(),'テスト',$4,'published') returning id`,
      [`Synthetic fixture article ${i}`,`Synthetic summary for question number ${i}`,i,`event-${i}`]);
    const question = await db.query<{id:string}>(`
      insert into globeq.questions(day_id,article_id,event_key,prompt,explanation,difficulty,status,position)
      values ($1,$2,$3,$4,$5,$6,'draft',$7) returning id`,
      [day.rows[0].id,article.rows[0].id,`event-${i}`,`What is the synthetic value for item ${i}?`,
       `This is a synthetic explanation for item ${i}.`,i<=4?'hard':'normal',i]);
    const options = await db.query<{id:string;is_correct:boolean}>(`
      insert into globeq.answer_options(question_id,position,label,is_correct)
      values ($1,1,'Alpha',true),($1,2,'Beta',false),($1,3,'Gamma',false),($1,4,'Delta',false)
      returning id,is_correct`,[question.rows[0].id]);
    await db.query("update globeq.questions set status='published' where id=$1",[question.rows[0].id]);
    questions.push({id:question.rows[0].id,correct:options.rows.find(o=>o.is_correct)!.id,wrong:options.rows.find(o=>!o.is_correct)!.id});
  }
  await db.query("update globeq.quiz_days set status='published' where id=$1",[day.rows[0].id]);
},30000);
afterAll(async () => { await db?.close(); });

describe('initial migration and answer transaction', () => {
  it('creates every required private table and one-correct guard', async () => {
    const tables = await db.query<{table_name:string}>("select table_name from information_schema.tables where table_schema='globeq'");
    expect(tables.rows).toHaveLength(19);
    for(const name of ['users','sessions','auth_credentials','news_articles','quiz_days','questions','answer_options','user_answers','daily_stats','badges','user_badges','selected_badges'])
      expect(tables.rows.map(row=>row.table_name)).toContain(name);
    await expect(db.query(`insert into globeq.answer_options(question_id,position,label,is_correct) values($1,4,'Duplicate',true)`,[questions[0].id])).rejects.toThrow();
  });
  it('locks the first answer and never double credits a retry with another option', async () => {
    const first = await db.query<{first_submit:boolean;correct:boolean;eligible:boolean;option_id:string}>(
      'select * from globeq.submit_answer($1,$2,$3)',[userId,questions[0].id,questions[0].correct]);
    const second = await db.query<{first_submit:boolean;correct:boolean;option_id:string}>(
      'select * from globeq.submit_answer($1,$2,$3)',[userId,questions[0].id,questions[0].wrong]);
    expect(first.rows[0]).toMatchObject({first_submit:true,correct:true,eligible:true});
    expect(second.rows[0]).toMatchObject({first_submit:false,correct:true,option_id:questions[0].correct});
    await expect(db.query('update globeq.user_answers set is_correct=false where user_id=$1 and question_id=$2',[userId,questions[0].id])).rejects.toThrow(/immutable/);
    const count = await db.query<{total_answers:number}>(`select total_answers from globeq.user_scores where user_id=$1`,[userId]);
    expect(count.rows[0].total_answers).toBe(1);
    await expect(db.query('select * from globeq.submit_answer($1,$2,$3)',[userId,questions[1].id,questions[0].wrong])).rejects.toThrow();
  });
  it('keeps a reviewed question, its answer key and a published article immutable', async () => {
    await expect(db.query("update globeq.questions set prompt='A changed fact after review?' where id=$1",[questions[0].id])).rejects.toThrow(/immutable/);
    await expect(db.query('update globeq.answer_options set is_correct=false where id=$1',[questions[0].correct])).rejects.toThrow(/immutable/);
    await expect(db.query(`update globeq.news_articles set summary='Changed summary after publication'
      where id=(select article_id from globeq.questions where id=$1)`,[questions[0].id])).rejects.toThrow(/immutable/);
    await expect(db.query("update globeq.questions set status='draft' where id=$1",[questions[0].id])).rejects.toThrow(/immutable/);
  });
  it('awards completion and first-correct scores exactly once on 20 first answers', async () => {
    for (const question of questions.slice(1)) await db.query('select * from globeq.submit_answer($1,$2,$3)',[userId,question.id,question.correct]);
    const score = await db.query<{total_answers:number;correct_answers:number;all_time_hard:number;streak_current:number;streak_longest:number}>(
      'select * from globeq.user_scores where user_id=$1',[userId]);
    expect(score.rows[0]).toMatchObject({total_answers:20,correct_answers:20,all_time_hard:0,streak_current:1,streak_longest:1});
    const stat = await db.query<{answered:number;correct:number;completed_at:string}>(
      'select answered,correct,completed_at from globeq.daily_stats where user_id=$1',[userId]);
    expect(stat.rows[0].answered).toBe(20);
    expect(stat.rows[0].completed_at).toBeTruthy();
    const weekly = await db.query<{first_correct:number}>(
      'select first_correct from globeq.user_weekly_scores where user_id=$1 and monday=$2',[userId,mondayOf(today)]);
    expect(weekly.rows[0].first_correct).toBe(20);
    const badges=await db.query<{badge_id:string}>('select badge_id from globeq.user_badges where user_id=$1',[userId]);
    expect(badges.rows.map(b=>b.badge_id)).toEqual(expect.arrayContaining(['first-answer','first-perfect']));
  });
  it('keeps historical study out of competition and only allows earned badge selection', async () => {
    const yesterday = new Date(`${today}T00:00:00Z`); yesterday.setUTCDate(yesterday.getUTCDate()-1);
    const oldDate = yesterday.toISOString().slice(0,10);
    const old = await db.query<{id:string}>("insert into globeq.quiz_days(region,local_date,status) values('japan',$1,'published') returning id",[oldDate]);
    const article = await db.query<{id:string}>(`insert into globeq.news_articles(title,summary,source_name,source_url,published_at,category,event_key,state)
      values('Old fixture article','Old synthetic summary only','Fixture','https://example.test/old',now(),'test','old','published') returning id`);
    const q = await db.query<{id:string}>(`insert into globeq.questions(day_id,article_id,event_key,prompt,explanation,difficulty,status,position)
      values($1,$2,'old','What is the old synthetic value?','An old synthetic explanation.','hard','draft',1) returning id`,[old.rows[0].id,article.rows[0].id]);
    const option=await db.query<{id:string}>(`insert into globeq.answer_options(question_id,position,label,is_correct) values($1,1,'Yes',true) returning id`,[q.rows[0].id]);
    await db.query("update globeq.questions set status='published' where id=$1",[q.rows[0].id]);
    const result=await db.query<{eligible:boolean}>(`select * from globeq.submit_answer($1,$2,$3)`,[userId,q.rows[0].id,option.rows[0].id]);
    expect(result.rows[0].eligible).toBe(false);
    const score=await db.query<{total_answers:number;all_time_hard:number}>('select total_answers,all_time_hard from globeq.user_scores where user_id=$1',[userId]);
    expect(score.rows[0]).toMatchObject({total_answers:20,all_time_hard:0});
    const earned=await db.query(`insert into globeq.selected_badges(user_id,badge_id) values($1,'first-answer') returning badge_id`,[userId]);
    expect(earned.rows).toHaveLength(1);
    await expect(db.query(`insert into globeq.selected_badges(user_id,badge_id) values($1,'week-streak') on conflict(user_id) do update set badge_id=excluded.badge_id`,[userId])).rejects.toThrow();
  });
});

describe('TOP100 + current user rank', () => {
  it('returns 100 sorted rows, tie rank and position outside TOP100 for every metric', async () => {
    await db.exec(`insert into globeq.users(username,username_key)
      select 'member' || lpad(n::text,3,'0'),'member' || lpad(n::text,3,'0') from generate_series(1,105) n;
      insert into globeq.user_scores(user_id,all_time_hard,correct_answers)
      select id,case when username_key='member002' then 299 else 300-substring(username_key,7)::int end,case when username_key='member002' then 299 else 300-substring(username_key,7)::int end
      from globeq.users where username_key like 'member%';`);
    await db.query(`update globeq.user_scores s set streak_current=
      case when u.username_key='member002' then 299 else 300-substring(u.username_key,7)::int end,
      last_completed_day=$1 from globeq.users u where s.user_id=u.id and u.username_key like 'member%'`,[today]);
    await db.query(`insert into globeq.user_weekly_scores(user_id,monday,hard_correct,first_correct)
      select id,$1,case when username_key='member002' then 299 else 300-substring(username_key,7)::int end,case when username_key='member002' then 299 else 300-substring(username_key,7)::int end
      from globeq.users where username_key like 'member%'`,[mondayOf(today)]);
    for(const kind of ['all-time','weekly','streak'] as const){
      const queries=rankingQueries(kind,userId,today,mondayOf(today));
      const positive=await db.query<{id:string;score:number}>(queries.top.text,queries.top.params);
      const zero=queries.zero && positive.rows.length<100 ? queries.zero(100-positive.rows.length) : null;
      const zeros=zero ? await db.query<{id:string;score:number}>(zero.text,zero.params) : {rows:[]};
      const top={rows:[...positive.rows,...zeros.rows]};
      const own=await db.query<{rank:number;score:number}>(queries.own!.text,queries.own!.params);
      expect(top.rows).toHaveLength(100);
      expect(own.rows[0]).toMatchObject({rank:106,score:kind==='streak'?1:20});
      expect(top.rows[0].score).toBe(top.rows[1].score);
    }
  });
});
