import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { noStore, problem, rateLimit, secureMutation } from '@/lib/security';

const input = z.object({ badgeId: z.string().min(1).max(60) });
export async function POST(request: NextRequest) {
  if (!secureMutation(request)) return problem('不正なリクエストです。', 403);
  const user = await currentUser();
  if (!user) return problem('ログインしてください。', 401);
  const body = input.safeParse(await request.json().catch(() => null));
  if (!body.success) return problem('バッジを確認してください。', 400);
  if (!await rateLimit(user.id, 'badge', 30, 3600)) return problem('時間をおいて再度お試しください。', 429);
  const [selected] = await db()`
    insert into globeq.selected_badges(user_id,badge_id)
    select ${user.id}, ub.badge_id from globeq.user_badges ub
    where ub.user_id=${user.id} and ub.badge_id=${body.data.badgeId}
    on conflict (user_id) do update set badge_id=excluded.badge_id returning badge_id`;
  if (!selected) return problem('未獲得のバッジは選べません。', 403);
  return Response.json({ badgeId: selected.badge_id }, { headers: noStore });
}
