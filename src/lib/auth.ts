import { randomBytes, createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { hash, verify } from '@node-rs/argon2';
import { db } from './db';

const cookieName = 'globeq_session';
const sessionSeconds = 60 * 60 * 24 * 14;
export type CurrentUser = { id: string; username: string; role: 'member' | 'editor' };

export const normalizeUsername = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase('ja-JP');
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export async function passwordHash(password: string): Promise<string> {
  // @node-rs/argon2 defaults to Argon2id; keep its encoded parameters with each hash.
  return hash(password, { memoryCost: 19456, timeCost: 2, parallelism: 1 });
}
export const passwordMatches = (saved: string, password: string) => verify(saved, password);

export async function setSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url');
  await db()`insert into globeq.sessions(token_hash,user_id,expires_at) values (${tokenHash(token)},${userId},now() + interval '14 days')`;
  (await cookies()).set(cookieName, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production',
    path: '/', maxAge: sessionSeconds,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) await db()`delete from globeq.sessions where token_hash = ${tokenHash(token)}`;
  jar.delete(cookieName);
}

export async function currentUser(): Promise<CurrentUser | null> {
  if (!process.env.DATABASE_URL) return null;
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || token.length > 200) return null;
  const rows = await db()`
    select u.id,u.username,u.role from globeq.sessions s
    join globeq.users u on u.id = s.user_id
    where s.token_hash = ${tokenHash(token)} and s.expires_at > now() limit 1`;
  return (rows[0] as CurrentUser | undefined) ?? null;
}
