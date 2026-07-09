import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  date,
  index,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const financeEntries = pgTable(
  'finance_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    category: text('category').notNull(),
    description: text('description'),
    date: date('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('finance_entries_user_idx').on(t.userId),
    dateIdx: index('finance_entries_date_idx').on(t.date),
    userDateIdx: index('finance_entries_user_date_idx').on(t.userId, t.date),
  }),
);

export const financeBudgets = pgTable(
  'finance_budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category: text('category').notNull(),
    limit: numeric('limit_amount', { precision: 12, scale: 2 }).notNull(),
    period: text('period', { enum: ['monthly', 'weekly', 'yearly'] })
      .notNull()
      .default('monthly'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('finance_budgets_user_idx').on(t.userId),
  }),
);

export type FinanceEntry = typeof financeEntries.$inferSelect;
export type NewFinanceEntry = typeof financeEntries.$inferInsert;
export type FinanceBudget = typeof financeBudgets.$inferSelect;
export type NewFinanceBudget = typeof financeBudgets.$inferInsert;
