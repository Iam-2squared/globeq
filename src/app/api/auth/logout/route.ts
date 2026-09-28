import { NextRequest } from 'next/server';
import { clearSession } from '@/lib/auth';
import { noStore, problem, secureMutation } from '@/lib/security';

export async function POST(request: NextRequest) {
  if (!secureMutation(request)) return problem('不正なリクエストです。', 403);
  if (process.env.DATABASE_URL) await clearSession();
  return Response.json({ ok: true }, { headers: noStore });
}
