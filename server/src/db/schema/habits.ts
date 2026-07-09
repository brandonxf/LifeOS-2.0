import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  date,
  numeric,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const habits = pgTable(
  'habits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    icon: text('icon').default('flame'),
    color: text('color').default('#7C3AED'),
    frequency: text('frequency', { enum: ['daily', 'weekly'] })
      .notNull()
      .default('daily'),
    targetPerWeek: integer('target_per_week').notNull().default(7),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('habits_user_idx').on(t.userId),
  }),
);

export const habitLogs = pgTable(
  'habit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    habitId: uuid('habit_id')
      .notNull()
      .references(() => habits.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    habitIdx: index('habit_logs_habit_idx').on(t.habitId),
    userDateIdx: index('habit_logs_user_date_idx').on(t.userId, t.date),
    uniqueLog: unique('habit_logs_unique').on(t.habitId, t.date),
  }),
);

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    category: text('category').default('personal'),
    targetValue: numeric('target_value', { precision: 12, scale: 2 }).notNull().default('100'),
    currentValue: numeric('current_value', { precision: 12, scale: 2 }).notNull().default('0'),
    unit: text('unit').default('%'),
    status: text('status', { enum: ['active', 'completed', 'archived'] })
      .notNull()
      .default('active'),
    deadline: date('deadline'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('goals_user_idx').on(t.userId),
  }),
);

export type Habit = typeof habits.$inferSelect;
export type NewHabit = typeof habits.$inferInsert;
export type HabitLog = typeof habitLogs.$inferSelect;
export type NewHabitLog = typeof habitLogs.$inferInsert;
export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;
