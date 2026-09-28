import { NextRequest } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { answerDetails, answersForDay } from '@/lib/data';
import { japanDate, validQuizDate } from '@/lib/time';
import { noStore, problem, rateLimit, requestFingerprint, secureMutation } from '@/lib/security';

const input = z.object({ questionId: z.uuid(), optionId: z.uuid() });

export async function GET(request: NextRequest) {
  const user = await currentUser();
  if (!user) return problem('回答履歴を見るにはログインしてください。', 401);
  const date = validQuizDate(request.nextUrl.searchParams.get('date') ?? japanDate());
  if (!date) return problem('日付が不正です。', 400);
  return Response.json({ answers: await answersForDay(user.id, date) }, { headers: noStore });
}

export async function POST(request: NextRequest) {
  if (!secureMutation(request)) return problem('不正なリクエストです。', 403);
  const user = await currentUser();
  if (!user) return problem('回答するにはログインしてください。', 401);
  const body = input.safeParse(await request.json().catch(() => null));
  if (!body.success) return problem('選択肢を確認してください。', 400);
  if (!await rateLimit(`user:${user.id}`, 'answer', 300, 3600)) return problem('時間をおいて再度お試しください。', 429);
  try {
    const [answer] = await db()`select * from globeq.submit_answer(${user.id},${body.data.questionId},${body.data.optionId})`;
    const details = await answerDetails(user.id, body.data.questionId);
    if (!details) throw new Error('Answer persisted but result unavailable');
    return Response.json({ ...details, firstSubmit: Boolean(answer.first_submit) }, { headers: noStore });
  } catch (error) {
    if ((error as { code?: string }).code === '22023') return problem('この問題や選択肢は現在回答できません。', 400);
    throw error;
  }
}
