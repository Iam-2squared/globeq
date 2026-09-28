import { NextRequest } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeUsername, passwordHash, setSession } from '@/lib/auth';
import { noStore, problem, rateLimit, requestFingerprint, secureMutation } from '@/lib/security';

const input = z.object({
  username: z.string().trim().min(2).max(32).regex(/^[\p{L}\p{N}_-]+$/u),
  password: z.string().min(6).max(128),
});

export async function POST(request: NextRequest) {
  if (!secureMutation(request)) return problem('不正なリクエストです。', 403);
  if (!process.env.DATABASE_URL) return problem('登録は準備中です。', 503);
  const data = input.safeParse(await request.json().catch(() => null));
  if (!data.success) return problem('ユーザー名またはパスワードの形式を確認してください。', 400);
  if (!await rateLimit(requestFingerprint(request, normalizeUsername(data.data.username)), 'register', 5, 3600)) return problem('時間をおいて再度お試しください。', 429);
  try {
    const encrypted = await passwordHash(data.data.password);
    const sql = db();
    const id = await sql.begin(async (tx) => {
      const [user] = await tx`
        insert into globeq.users(username,username_key)
        values (${data.data.username},${normalizeUsername(data.data.username)}) returning id`;
      await tx`insert into globeq.auth_credentials(user_id,password_hash) values (${user.id},${encrypted})`;
      await tx`insert into globeq.user_scores(user_id) values (${user.id})`;
      return String(user.id);
    });
    await setSession(id);
    return Response.json({ username: data.data.username }, { status: 201, headers: noStore });
  } catch (error) {
    if ((error as { code?: string }).code === '23505') return problem('このユーザー名は使用されています。', 409);
    throw error;
  }
}
