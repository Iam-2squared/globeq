import postgres from 'postgres';

let connection: ReturnType<typeof postgres> | undefined;

function configuredUrl(): string | undefined {
  const explicit = process.env.DATABASE_URL?.trim();
  if (explicit && !explicit.startsWith('$')) return explicit;
  return process.env.POSTGRES_URL?.trim() || undefined;
}

export function configured(): boolean {
  return Boolean(configuredUrl());
}

export function db(): ReturnType<typeof postgres> {
  const url = configuredUrl();
  if (!url) throw new Error('DATABASE_URL/POSTGRES_URL is not configured');
  const requested = Number(process.env.DB_POOL_SIZE ?? 4);
  const max = Number.isInteger(requested) && requested >= 1 && requested <= 4 ? requested : 4;
  connection ??= postgres(url, { max, prepare: false, idle_timeout: 15 });
  return connection;
}
