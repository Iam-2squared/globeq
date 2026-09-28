import type { RankingKind } from './data';

type Query = { text: string; params: (string | number)[] };
const badgeJoin = `left join globeq.selected_badges chosen on chosen.user_id=u.id
  left join globeq.badges b on b.id=chosen.badge_id`;

// Syntax is selected only from fixed variants. User IDs, dates and limits are bound values.
// Indexed positive scores supply TOP100; indexed usernames fill any zero-score slots.
export function rankingQueries(kind: RankingKind, userId: string | null, today: string, monday: string): {
  top: Query; zero: ((limit:number)=>Query) | null; own: Query | null;
} {
  if(kind==='all-time') return {
    top:{text:`select u.id,u.username,b.title as badge,s.correct_answers as score
      from globeq.user_scores s join globeq.users u on u.id=s.user_id ${badgeJoin}
      where u.role='member' and s.correct_answers>0 order by s.correct_answers desc,u.username_key,u.id limit 100`,params:[]},
    zero:(limit)=>({text:`select u.id,u.username,b.title as badge,0 as score
      from globeq.users u join globeq.user_scores s on s.user_id=u.id ${badgeJoin}
      where u.role='member' and s.correct_answers=0 order by u.username_key,u.id limit $1::integer`,params:[limit]}),
    own:userId?{text:`with mine as (select correct_answers as score from globeq.user_scores where user_id=$1::uuid)
      select mine.score,1+(select count(*) from globeq.user_scores s join globeq.users ru on ru.id=s.user_id where ru.role='member' and s.correct_answers>mine.score)::integer as rank from mine`,params:[userId]}:null,
  };
  if(kind==='weekly') return {
    top:{text:`select u.id,u.username,b.title as badge,w.first_correct as score
      from globeq.user_weekly_scores w join globeq.users u on u.id=w.user_id ${badgeJoin}
      where u.role='member' and w.monday=$1::date and w.first_correct>0
      order by w.first_correct desc,u.username_key,u.id limit 100`,params:[monday]},
    zero:(limit)=>({text:`select u.id,u.username,b.title as badge,0 as score
      from globeq.users u left join globeq.user_weekly_scores w on w.user_id=u.id and w.monday=$1::date
      ${badgeJoin} where u.role='member' and (w.user_id is null or w.first_correct=0)
      order by u.username_key,u.id limit $2::integer`,params:[monday,limit]}),
    own:userId?{text:`with mine as (select coalesce(w.first_correct,0) as score from globeq.users u
      left join globeq.user_weekly_scores w on w.user_id=u.id and w.monday=$1::date where u.id=$2::uuid)
      select mine.score,1+(select count(*) from globeq.user_weekly_scores other join globeq.users ru on ru.id=other.user_id
        where ru.role='member' and other.monday=$1::date and other.first_correct>mine.score)::integer as rank from mine`,params:[monday,userId]}:null,
  };
  return {
    top:{text:`select u.id,u.username,b.title as badge,s.streak_current as score
      from globeq.user_scores s join globeq.users u on u.id=s.user_id ${badgeJoin}
      where u.role='member' and s.last_completed_day >= $1::date-1 and s.streak_current>0
      order by s.streak_current desc,u.username_key,u.id limit 100`,params:[today]},
    zero:(limit)=>({text:`select u.id,u.username,b.title as badge,0 as score
      from globeq.users u join globeq.user_scores s on s.user_id=u.id ${badgeJoin}
      where u.role='member' and (s.last_completed_day is null or s.last_completed_day < $1::date-1 or s.streak_current=0)
      order by u.username_key,u.id limit $2::integer`,params:[today,limit]}),
    own:userId?{text:`with mine as (select case when last_completed_day >= $1::date-1
      then streak_current else 0 end as score from globeq.user_scores where user_id=$2::uuid)
      select mine.score,1+(select count(*) from globeq.user_scores other join globeq.users ru on ru.id=other.user_id
        where ru.role='member' and other.last_completed_day >= $1::date-1 and other.streak_current>mine.score)::integer as rank from mine`,params:[today,userId]}:null,
  };
}
