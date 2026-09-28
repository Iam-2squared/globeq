import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
try {
  await sql`create schema if not exists globeq`;
  await sql`create table if not exists globeq.schema_migrations(name text primary key, applied_at timestamptz not null default now())`;
  for (const name of readdirSync('supabase/migrations').filter(name => /^\d+_[\w-]+\.sql$/.test(name)).sort()) {
    const content = readFileSync(resolve('supabase/migrations', name), 'utf8');
    const applied = await sql.begin(async tx => {
      await tx`select pg_advisory_xact_lock(394019843)`;
      const [existing] = await tx`select name from globeq.schema_migrations where name=${name}`;
      if (existing) return false;
      await tx.unsafe(content);
      await tx`insert into globeq.schema_migrations(name) values (${name})`;
      return true;
    });
    console.log(`${applied ? 'APPLIED' : 'ALREADY APPLIED'} ${name}`);
  }
} finally { await sql.end(); }
