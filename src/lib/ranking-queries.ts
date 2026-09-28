import type { RankingKind } from './data';

// SQL syntax is selected only from these literals. User IDs and dates remain bind parameters.
export function rankingQueries(kind: RankingKind, userId: string | null, today: string, monday: string) {
  const score = kind === 'streak'
    ? 'case when s.last_completed_day >= $1::date - 1 then s.streak_current else 0 end'
    : kind === 'weekly' ? 'coalesce(w.hard_correct,0)' : 's.all_time_hard';
  const from = `from globeq.users u join globeq.user_scores s on s.user_id=u.id
    ${kind === 'weekly' ? 'left join globeq.user_weekly_scores w on w.user_id=u.id and w.monday=$1::date' : ''}`;
  const parameters = kind === 'weekly' ? [monday] : kind === 'streak' ? [today] : [];
  const top = {
    text:`select u.id,u.username,b.title as badge,${score} as score ${from}
      left join globeq.selected_badges chosen on chosen.user_id=u.id
      left join globeq.badges b on b.id=chosen.badge_id
      order by score desc,u.username_key,u.id limit 100`,
    params:parameters,
  };
  const own = userId ? {
    text:`with scores as (select u.id,${score} as score ${from})
      select mine.score, 1+(select count(*) from scores other where other.score > mine.score)::integer as rank
      from scores mine where mine.id=$${parameters.length+1}::uuid`,
    params:[...parameters,userId],
  } : null;
  return {top,own};
}
