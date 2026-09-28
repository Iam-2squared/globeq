import postgres from 'postgres';

let connection: ReturnType<typeof postgres> | undefined;

export function configured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): ReturnType<typeof postgres> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  connection ??= postgres(process.env.DATABASE_URL, { max: 4, prepare: false, idle_timeout: 15 });
  return connection;
}
