import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { noStore, problem, rateLimit, secureMutation } from '@/lib/security';

const input = z.object({ questionId: z.uuid(), reason: z.string().trim().min(10).max(1000) });
export async function POST(request: NextRequest) {
  if (!secureMutation(request)) return problem('不正なリクエストです。', 403);
  const user = await currentUser();
  if (!user) return problem('ログインしてください。', 401);
  const body = input.safeParse(await request.json().catch(() => null));
  if (!body.success) return problem('内容を確認してください。', 400);
  if (!await rateLimit(user.id, 'report', 10, 3600)) return problem('時間をおいて再度お試しください。', 429);
  const [report] = await db()`insert into globeq.question_reports(user_id,question_id,reason)
    select ${user.id},q.id,${body.data.reason} from globeq.questions q
    where q.id=${body.data.questionId} and q.status in ('published','withdrawn') returning id`;
  if (!report) return problem('問題が見つかりません。', 404);
  return Response.json({ reportId: report.id }, { status: 201, headers: noStore });
}
