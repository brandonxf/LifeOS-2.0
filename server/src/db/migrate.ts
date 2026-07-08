import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

/**
 * Bootstrap script for extensions that Drizzle push cannot create on its own.
 * Run once before `drizzle-kit push` so the pgvector column type resolves.
 *
 *   tsx src/db/migrate.ts
 */
async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set.');
  }
  const sql = neon(process.env.DATABASE_URL);
  console.log('→ Enabling pgvector extension...');
  await sql`CREATE EXTENSION IF NOT EXISTS vector;`;
  console.log('✓ pgvector ready. Now run: npm run db:push');
}

main().catch((err) => {
  console.error('Migration bootstrap failed:', err);
  process.exit(1);
});
