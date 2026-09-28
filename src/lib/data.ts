import { db } from './db';
import { japanDate, mondayOf } from './time';
import { rankingQueries } from './ranking-queries';
import { publicQuestion, type PublicQuestion } from './public-question';

export type { PublicQuestion } from './public-question';
export type AnswerResult = {
  questionId: string; optionId: string; correctOptionId: string; correct: boolean;
  eligible: boolean; explanation: string; sourceName: string; sourceUrl: string;
  sourcePublishedAt: string; withdrawn: boolean; firstSubmit?: boolean;
};

export async function publishedQuestions(date: string): Promise<PublicQuestion[]> {
  const rows = await db()`
    select q.id,q.prompt,q.difficulty,q.position,
      json_agg(json_build_object('id',o.id,'label',o.label,'position',o.position) order by o.position) as options
    from globeq.quiz_days d join globeq.questions q on q.day_id=d.id
    join globeq.answer_options o on o.question_id=q.id
    where d.region='japan' and d.local_date=${date} and d.status='published' and q.status='published'
    group by q.id order by q.position`;
  return rows.map(row => publicQuestion(row)) as PublicQuestion[];
}

export async function answerDetails(userId: string, questionId: string): Promise<AnswerResult | null> {
  const rows = await db()`
    select q.id as "questionId",a.option_id as "optionId",o.id as "correctOptionId",
      a.is_correct as correct,a.competition_eligible as eligible,
      q.explanation, n.source_name as "sourceName",n.source_url as "sourceUrl",
      n.published_at as "sourcePublishedAt",(q.status='withdrawn') as withdrawn
    from globeq.user_answers a join globeq.questions q on q.id=a.question_id
    join globeq.answer_options o on o.question_id=q.id and o.is_correct
    join globeq.news_articles n on n.id=q.article_id
    where a.user_id=${userId} and a.question_id=${questionId} limit 1`;
  return (rows[0] as AnswerResult | undefined) ?? null;
}

export async function answersForDay(userId: string, date: string): Promise<AnswerResult[]> {
  const rows = await db()`
    select q.id as "questionId",a.option_id as "optionId",o.id as "correctOptionId",
      a.is_correct as correct,a.competition_eligible as eligible,
      q.explanation,n.source_name as "sourceName",n.source_url as "sourceUrl",
      n.published_at as "sourcePublishedAt",(q.status='withdrawn') as withdrawn
    from globeq.user_answers a join globeq.questions q on q.id=a.question_id
    join globeq.quiz_days d on d.id=q.day_id
    join globeq.answer_options o on o.question_id=q.id and o.is_correct
    join globeq.news_articles n on n.id=q.article_id
    where a.user_id=${userId} and d.region='japan' and d.local_date=${date}`;
  return rows as unknown as AnswerResult[];
}

export async function newsSearch(query = '', before?: string) {
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const sql = db();
  const rows = await sql`
    select n.id,n.title,n.summary,n.source_name as "sourceName",n.source_url as "sourceUrl",
      n.published_at as "publishedAt",n.category,n.tags
    from globeq.news_articles n
    where n.region='japan' and n.state='published'
      and (${!query} or n.title ilike ${pattern} escape '\' or n.summary ilike ${pattern} escape '\'
        or array_to_string(n.tags,' ') ilike ${pattern} escape '\')
      and (${!before} or n.published_at < ${before ?? '9999-12-31T00:00:00Z'})
    order by n.published_at desc,n.id desc limit 40`;
  return rows as unknown as Array<{
    id: string; title: string; summary: string; sourceName: string; sourceUrl: string;
    publishedAt: string; category: string; tags: string[];
  }>;
}

export async function homeData(userId: string | null, today = japanDate(), month = today.slice(0, 7)) {
  const sql = db();
  const [dayRows, activityRows, scoreRows, todayRows] = await Promise.all([
    sql`select to_char(local_date,'YYYY-MM-DD') as date,
      (select count(*)::integer from globeq.questions q where q.day_id=d.id and q.status='published') as total
      from globeq.quiz_days d where region='japan' and status='published'
      and to_char(local_date,'YYYY-MM')=${month}`,
    userId ? sql`select to_char(d.local_date,'YYYY-MM-DD') as date,s.answered,s.completed_at is not null as completed
      from globeq.daily_stats s join globeq.quiz_days d on d.id=s.day_id
      where s.user_id=${userId} and d.region='japan' and to_char(d.local_date,'YYYY-MM')=${month}` : Promise.resolve([]),
    userId ? sql`select case when last_completed_day >= ${today}::date-1 then streak_current else 0 end as streak
      from globeq.user_scores where user_id=${userId}` : Promise.resolve([]),
    sql`select (select count(*)::integer from globeq.questions q where q.day_id=d.id and q.status='published') as total,
      ${userId ? sql`coalesce((select s.answered from globeq.daily_stats s where s.day_id=d.id and s.user_id=${userId}),0)` : sql`0`} as answered
      from globeq.quiz_days d where d.region='japan' and d.status='published' and d.local_date=${today} limit 1`,
  ]);
  const days = dayRows as unknown as { date: string; total: number }[];
  const activity = activityRows as unknown as { date: string; answered: number; completed: boolean }[];
  return {
    days, activity, streak: Number(scoreRows[0]?.streak ?? 0),
    todayTotal: Number(todayRows[0]?.total ?? 0),
    todayAnswered: Number(todayRows[0]?.answered ?? 0),
  };
}

export async function accountData(userId: string, today = japanDate()) {
  const monday = mondayOf(today);
  const [row] = await db()`
    select u.username,s.total_answers as "totalAnswers",s.correct_answers as "correctAnswers",
      s.all_time_hard as "allTimeHard",s.streak_longest as "longestStreak",
      case when s.last_completed_day >= ${today}::date-1 then s.streak_current else 0 end as "currentStreak",
      coalesce(w.hard_correct,0) as "weeklyHard",b.id as "selectedBadgeId",b.title as "selectedBadge"
    from globeq.users u join globeq.user_scores s on s.user_id=u.id
    left join globeq.user_weekly_scores w on w.user_id=u.id and w.monday=${monday}
    left join globeq.selected_badges chosen on chosen.user_id=u.id
    left join globeq.badges b on b.id=chosen.badge_id
    where u.id=${userId}`;
  const badges = await db()`
    select b.id,b.title,b.description,ub.earned_at as "earnedAt" from globeq.user_badges ub
    join globeq.badges b on b.id=ub.badge_id where ub.user_id=${userId} order by ub.earned_at,b.id`;
  type Stats = {
    username: string; totalAnswers: number; correctAnswers: number; allTimeHard: number;
    longestStreak: number; currentStreak: number; weeklyHard: number;
    selectedBadgeId: string | null; selectedBadge: string | null;
  };
  return { ...(row as unknown as Stats), badges: badges as unknown as {id:string;title:string;description:string;earnedAt:Date}[] };
}

export type RankingKind = 'streak' | 'weekly' | 'all-time';
export async function ranking(kind: RankingKind, userId: string | null, today = japanDate()) {
  const sql = db();
  const monday = mondayOf(today);
  const queries = rankingQueries(kind,userId,today,monday);
  const rows = await sql.unsafe(queries.top.text,queries.top.params);
  const top = rows.map((row, index) => ({
    id: String(row.id), username: String(row.username), badge: row.badge as string | null,
    score: Number(row.score), rank: 1 + rows.slice(0, index).filter((previous) => Number(previous.score) > Number(row.score)).length,
  }));
  let own: { rank: number; score: number } | null = null;
  if (queries.own) {
    const [record] = await sql.unsafe(queries.own.text,queries.own.params);
    if (record) own = { rank: Number(record.rank), score: Number(record.score) };
  }
  return { top, own };
}
