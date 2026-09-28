import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeUsername, passwordMatches, setSession } from '@/lib/auth';
import { noStore, problem, rateLimit, requestFingerprint, secureMutation } from '@/lib/security';

const input = z.object({ username: z.string().trim().min(2).max(32), password: z.string().min(6).max(128) });

export async function POST(request: NextRequest) {
  if (!secureMutation(request)) return problem('不正なリクエストです。', 403);
  if (!process.env.DATABASE_URL) return problem('ログインは準備中です。', 503);
  const data = input.safeParse(await request.json().catch(() => null));
  if (!data.success) return problem('入力を確認してください。', 400);
  const key = normalizeUsername(data.data.username);
  if (!await rateLimit(requestFingerprint(request, key), 'login', 8, 900)) return problem('時間をおいて再度お試しください。', 429);
  const [user] = await db()`
    select u.id,u.username,c.password_hash from globeq.users u
    join globeq.auth_credentials c on c.user_id=u.id where u.username_key=${key}`;
  if (!user || !await passwordMatches(String(user.password_hash), data.data.password)) return problem('ユーザー名かパスワードが違います。', 401);
  await setSession(String(user.id));
  return Response.json({ username: user.username }, { headers: noStore });
}
