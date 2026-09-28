import postgres from 'postgres';

let connection: ReturnType<typeof postgres> | undefined;

export function configured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function db(): ReturnType<typeof postgres> {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  // A one-connection setting is useful for embedded PostgreSQL fixture runs.
  const requested = Number(process.env.DB_POOL_SIZE ?? 4);
  const max = Number.isInteger(requested) && requested >= 1 && requested <= 4 ? requested : 4;
  connection ??= postgres(process.env.DATABASE_URL, { max, prepare: false, idle_timeout: 15 });
  return connection;
}
