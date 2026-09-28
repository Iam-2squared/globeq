import { readFileSync, existsSync } from 'node:fs';
import postgres from 'postgres';
import { z } from 'zod';
import { validatePublishRows } from './content-rules.mjs';
import { normalizeCandidate } from './article-normalization.mjs';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (!process.env.DATABASE_URL || !process.env.EDITOR_USER_ID) throw new Error('DATABASE_URL and EDITOR_USER_ID are required');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const [action, ...rest] = process.argv.slice(2);
const flags = Object.fromEntries(rest.filter(p => p.startsWith('--')).map(p => [p.slice(2), rest[rest.indexOf(p) + 1]]));
const editorId = process.env.EDITOR_USER_ID;
const id = z.uuid();
const day = z.iso.date();
const item = z.object({
  article: z.object({
    title:z.string().min(8).max(300), summary:z.string().min(12).max(800),
    sourceName:z.string().min(2), sourceUrl:z.url().refine(v=>v.startsWith('https://')),
    publishedAt:z.iso.datetime({offset:true}), category:z.string().min(2),
    tags:z.array(z.string().min(1)).max(12), eventKey:z.string().min(4),
  }),
  question:z.object({
    prompt:z.string().min(10).max(500), explanation:z.string().min(12).max(800),
    difficulty:z.enum(['easy','normal','hard']),
    options:z.array(z.object({label:z.string().min(1).max(240),correct:z.boolean()})).length(4),
  }),
});
const pack = z.object({ date:day, region:z.literal('japan'), items:z.array(item).min(1).max(200) });

async function requireEditor() {
  const [editor] = await sql`select role from globeq.users where id=${id.parse(editorId)}`;
  if (editor?.role !== 'editor') throw new Error('EDITOR_USER_ID is not an editor');
}

async function importDraft() {
  const raw = pack.parse(JSON.parse(readFileSync(flags.file, 'utf8')));
  const input = pack.parse({...raw,items:raw.items.map(normalizeCandidate)});
  for (const entry of input.items) {
    if (entry.question.options.filter(option=>option.correct).length !== 1 || new Set(entry.question.options.map(o=>o.label.trim().toLowerCase())).size !== 4)
      throw new Error('Each question needs four distinct options and one correct answer');
  }
  const ids = await sql.begin(async tx => {
    await tx`insert into globeq.quiz_days(region,local_date) values('japan',${input.date}) on conflict do nothing`;
    const [quizDay] = await tx`select id from globeq.quiz_days where region='japan' and local_date=${input.date} for update`;
    const created = [];
    for (let i=0;i<input.items.length;i++) {
      const {article,question} = input.items[i];
      const [newArticle] = await tx`insert into globeq.news_articles(title,summary,source_name,source_url,published_at,category,tags,event_key)
        values(${article.title},${article.summary},${article.sourceName},${article.sourceUrl},${article.publishedAt},${article.category},${article.tags},${article.eventKey})
        on conflict(source_url) do nothing returning id`;
      const [oldArticle] = newArticle ? [newArticle] : await tx`select id from globeq.news_articles where source_url=${article.sourceUrl}`;
      const [position] = await tx`select coalesce(max(position),0)+1 as position from globeq.questions where day_id=${quizDay.id}`;
      const [q] = await tx`insert into globeq.questions(day_id,article_id,event_key,prompt,explanation,difficulty,position)
        values(${quizDay.id},${oldArticle.id},${article.eventKey},${question.prompt},${question.explanation},${question.difficulty},${position.position}) returning id`;
      for (let j=0;j<4;j++) await tx`insert into globeq.answer_options(question_id,position,label,is_correct)
        values(${q.id},${j+1},${question.options[j].label},${question.options[j].correct})`;
      await tx`insert into globeq.content_events(actor_id,question_id,event_type,note)
        values(${editorId},${q.id},'draft_imported','Manual candidate; requires source and factual review')`;
      created.push(q.id);
    }
    return created;
  });
  console.log(JSON.stringify({ date:input.date, createdQuestionIds:ids },null,2));
}

async function review() {
  const questionId = id.parse(flags.question);
  const note = z.string().min(12).parse(flags.note);
  if (flags['rights-confirmed'] !== 'yes' || flags['neutrality-confirmed'] !== 'yes')
    throw new Error('Explicit --rights-confirmed yes and --neutrality-confirmed yes are required');
  await sql.begin(async tx=>{
    const [q] = await tx`select status from globeq.questions where id=${questionId} for update`;
    if (!q || q.status !== 'draft') throw new Error('Only drafts can be reviewed');
    await tx`insert into globeq.content_reviews(question_id,reviewer_id,verification_note,rights_checked,neutrality_checked)
      values(${questionId},${editorId},${note},true,true)`;
    await tx`update globeq.questions set status='reviewed' where id=${questionId}`;
    await tx`insert into globeq.content_events(actor_id,question_id,event_type,note)
      values(${editorId},${questionId},'reviewed',${note})`;
  });
  console.log(`REVIEWED ${questionId}`);
}

async function publish() {
  const localDate = day.parse(flags.date);
  const total = await sql.begin(async tx=>{
    const [quizDay] = await tx`select id from globeq.quiz_days where region='japan' and local_date=${localDate} for update`;
    if (!quizDay) throw new Error('Quiz day does not exist');
    const rows = await tx`
      select q.id,q.status,q.event_key,n.source_url,n.published_at,r.reviewer_id,r.rights_checked,
        r.neutrality_checked,r.verification_note,count(o.id)::integer as option_count,
        count(*) filter(where o.is_correct)::integer as correct_count,
        count(distinct lower(trim(o.label)))::integer as distinct_labels
      from globeq.questions q join globeq.news_articles n on n.id=q.article_id
      left join globeq.answer_options o on o.question_id=q.id
      left join globeq.content_reviews r on r.question_id=q.id
      where q.day_id=${quizDay.id} group by q.id,n.id,r.question_id`;
    const problems = validatePublishRows(rows,localDate);
    if (problems.length) throw new Error(`Publish blocked:\n${problems.join('\n')}`);
    await tx`update globeq.questions set status='published' where day_id=${quizDay.id} and status='reviewed'`;
    await tx`update globeq.news_articles set state='published' where id in
      (select article_id from globeq.questions where day_id=${quizDay.id} and status='published') and state='draft'`;
    await tx`update globeq.quiz_days set status='published',published_at=coalesce(published_at,now()),published_by=${editorId}
      where id=${quizDay.id}`;
    await tx`insert into globeq.content_events(actor_id,event_type,note)
      values(${editorId},'day_published',${`japan ${localDate}: ${rows.filter(row=>row.status!=='withdrawn').length} reviewed questions`})`;
    return rows.filter(row=>row.status!=='withdrawn').length;
  });
  console.log(`PUBLISHED japan ${localDate}: ${total} questions`);
}

async function withdraw() {
  const questionId = id.parse(flags.question);
  const note = z.string().min(12).parse(flags.note);
  await sql.begin(async tx=>{
    const [candidate] = await tx`select q.day_id from globeq.questions q where q.id=${questionId}`;
    if (!candidate) throw new Error('Question not found');
    // Publication takes the day lock first. Match that order, then exclude new
    // first answers on this question and lock affected users before recomputing.
    const [dayRow] = await tx`select id from globeq.quiz_days where id=${candidate.day_id} for update`;
    const [question] = await tx`select q.id,q.day_id,q.article_id,q.status from globeq.questions q where q.id=${questionId} for update`;
    if (!question || question.status !== 'published') throw new Error('Only published questions can be withdrawn');
    const [counts] = await tx`select count(*)::integer as total from globeq.questions where day_id=${dayRow.id} and status='published'`;
    if (Number(counts.total) <= 20) throw new Error('Publish and review a replacement first; at least 20 must stay active');
    await tx`update globeq.questions set status='withdrawn' where id=${questionId}`;
    await tx`update globeq.news_articles set state='withdrawn' where id=${question.article_id}`;
    await tx`insert into globeq.content_events(actor_id,question_id,event_type,note)
      values(${editorId},${questionId},'withdrawn',${note})`;
    // Preserve immutable answer rows. Recalculate only affected users' derived competitive stats.
    const users = await tx`select u.id as user_id from globeq.users u
      where u.id in (select a.user_id from globeq.user_answers a where a.question_id=${questionId})
      order by u.id for update`;
    for (const {user_id:userId} of users) {
      const answers = await tx`select d.id as day_id,to_char(d.local_date,'YYYY-MM-DD') as date,
        a.is_correct as correct,q.difficulty from globeq.user_answers a
        join globeq.questions q on q.id=a.question_id join globeq.quiz_days d on d.id=q.day_id
        where a.user_id=${userId} and a.competition_eligible and q.status='published' order by d.local_date`;
      const perDay = new Map(); const weeks = new Map();
      let total=0,correct=0,hard=0;
      for(const answer of answers){
        total++; if(answer.correct)correct++;
        const current=perDay.get(answer.date)??{id:answer.day_id,answered:0,correct:0};
        current.answered++; if(answer.correct)current.correct++;
        perDay.set(answer.date,current);
        if(answer.correct&&answer.difficulty==='hard'){
          hard++;const date=new Date(`${answer.date}T00:00:00Z`);
          date.setUTCDate(date.getUTCDate()-((date.getUTCDay()+6)%7));
          const monday=date.toISOString().slice(0,10);weeks.set(monday,(weeks.get(monday)??0)+1);
        }
      }
      const oldDays = await tx`select s.day_id,to_char(d.local_date,'YYYY-MM-DD') as date
        from globeq.daily_stats s join globeq.quiz_days d on d.id=s.day_id where s.user_id=${userId}`;
      for(const old of oldDays){const stat=perDay.get(old.date)??{answered:0,correct:0};await tx`update globeq.daily_stats set answered=${stat.answered},correct=${stat.correct},
        completed_at=case when ${stat.answered}>=20 then coalesce(completed_at,now()) else null end
        where user_id=${userId} and day_id=${old.day_id}`;}
      let current=0,longest=0,last=null;
      for(const [date,stat] of perDay){if(stat.answered<20)continue;
        current=last&&Date.parse(`${date}T00:00:00Z`)-Date.parse(`${last}T00:00:00Z`)===86400000?current+1:1;
        longest=Math.max(longest,current);last=date;
      }
      await tx`update globeq.user_scores set total_answers=${total},correct_answers=${correct},
        all_time_hard=${hard},streak_current=${current},streak_longest=${longest},
        last_completed_day=${last} where user_id=${userId}`;
      await tx`update globeq.user_weekly_scores set hard_correct=0 where user_id=${userId}`;
      for(const [monday,count] of weeks) await tx`insert into globeq.user_weekly_scores(user_id,monday,hard_correct)
        values(${userId},${monday},${count}) on conflict(user_id,monday) do update set hard_correct=excluded.hard_correct`;
    }
  });
  console.log(`WITHDRAWN ${questionId}; answer history preserved; derived scores recalculated`);
}

try {
  await requireEditor();
  if(action==='import') await importDraft();
  else if(action==='review') await review();
  else if(action==='publish') await publish();
  else if(action==='withdraw') await withdraw();
  else throw new Error('Usage: import --file FILE | review --question ID --note NOTE --rights-confirmed yes --neutrality-confirmed yes | publish --date YYYY-MM-DD | withdraw --question ID --note NOTE');
} finally { await sql.end(); }
