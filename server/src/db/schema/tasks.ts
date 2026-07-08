import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users';

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    priority: text('priority', {
      enum: ['low', 'medium', 'high', 'urgent'],
    })
      .notNull()
      .default('medium'),
    status: text('status', {
      enum: ['todo', 'in_progress', 'done'],
    })
      .notNull()
      .default('todo'),
    tags: text('tags').array().notNull().default([]),
    dueDate: timestamp('due_date', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('tasks_user_idx').on(t.userId),
    statusIdx: index('tasks_status_idx').on(t.status),
    dueDateIdx: index('tasks_due_date_idx').on(t.dueDate),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
