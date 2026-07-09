import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const diaryEntries = pgTable(
  'diary_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'),
    content: text('content').notNull().default(''),
    mood: integer('mood').notNull().default(3), // 1-5
    tags: text('tags').array().notNull().default([]),
    date: date('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('diary_entries_user_idx').on(t.userId),
    dateIdx: index('diary_entries_date_idx').on(t.date),
    userDateIdx: index('diary_entries_user_date_idx').on(t.userId, t.date),
  }),
);

export type DiaryEntry = typeof diaryEntries.$inferSelect;
export type NewDiaryEntry = typeof diaryEntries.$inferInsert;
