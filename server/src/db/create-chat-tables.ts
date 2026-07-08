import 'dotenv/config';
import { neon } from '@neondatabase/serverless';

/**
 * Creates the chat-history tables (conversations + chat_messages) without
 * drizzle-kit, using raw SQL. Idempotent — safe to run repeatedly.
 *
 *   tsx src/db/create-chat-tables.ts
 */
async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set.');
  const sql = neon(process.env.DATABASE_URL);

  await sql`CREATE TABLE IF NOT EXISTS conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL DEFAULT 'Nuevo chat',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
  );`;

  await sql`CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );`;

  await sql`CREATE INDEX IF NOT EXISTS conversations_user_idx ON conversations (user_id);`;
  await sql`CREATE INDEX IF NOT EXISTS conversations_updated_idx ON conversations (updated_at);`;
  await sql`CREATE INDEX IF NOT EXISTS chat_messages_conversation_idx ON chat_messages (conversation_id);`;

  console.log('✓ Tablas de chat creadas (conversations, chat_messages)');
}

main().catch((err) => {
  console.error('Error creando tablas de chat:', err);
  process.exit(1);
});
