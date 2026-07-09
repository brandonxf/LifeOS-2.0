import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  vector,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

// Requires: CREATE EXTENSION IF NOT EXISTS vector; (run automatically in db/index.ts bootstrap)
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull().default('Untitled'),
    content: text('content').notNull().default(''),
    color: text('color').default('#1f2937'),
    tags: text('tags').array().notNull().default([]),
    pinned: boolean('pinned').notNull().default(false),
    embedding: vector('embedding', { dimensions: 1536 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('notes_user_idx').on(t.userId),
    embeddingIdx: index('notes_embedding_idx').using(
      'hnsw',
      t.embedding.op('vector_cosine_ops'),
    ),
  }),
);

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
