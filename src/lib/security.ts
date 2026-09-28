import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { db } from './db';

export const noStore = { 'Cache-Control': 'private, no-store' };

export function secureMutation(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}

export async function rateLimit(key: string, bucket: string, limit: number, seconds: number): Promise<boolean> {
  const sql = db();
  const digest = createHash('sha256').update(key).digest('hex');
  const start = new Date(Math.floor(Date.now() / (seconds * 1000)) * seconds * 1000);
  const result = await sql`
    insert into globeq.rate_limits(key_hash,bucket,window_start,hits) values (${digest},${bucket},${start},1)
    on conflict (key_hash,bucket,window_start) do update set hits = globeq.rate_limits.hits + 1
    where globeq.rate_limits.hits < ${limit} returning hits`;
  return result.length > 0;
}

export function requestFingerprint(request: NextRequest, suffix = ''): string {
  // Vercel supplies the forwarding address; username is included to limit expensive hashes per account.
  return `${request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'}:${suffix}`;
}

export function problem(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: noStore });
}
