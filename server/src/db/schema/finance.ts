import {
  pgTable,
  uuid,
  text,
  timestamp,
  numeric,
  date,
  boolean,
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
    // Si viene de una transacción recurrente, apunta a su plantilla.
    recurringId: uuid('recurring_id').references(() => financeRecurring.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('finance_entries_user_idx').on(t.userId),
    dateIdx: index('finance_entries_date_idx').on(t.date),
    userDateIdx: index('finance_entries_user_date_idx').on(t.userId, t.date),
  }),
);

// Plantillas de transacciones recurrentes (suscripciones, sueldo, renta…).
// Las transacciones reales se generan de forma perezosa (al consultar
// /entries o /summary) hacia financeEntries, enlazadas por recurringId.
export const financeRecurring = pgTable(
  'finance_recurring',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['income', 'expense'] }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    category: text('category').notNull(),
    description: text('description'),
    frequency: text('frequency', { enum: ['weekly', 'monthly', 'yearly'] }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date'),
    // Última fecha para la que ya se generó una transacción real.
    lastGeneratedDate: date('last_generated_date'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('finance_recurring_user_idx').on(t.userId),
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
export type FinanceRecurring = typeof financeRecurring.$inferSelect;
export type NewFinanceRecurring = typeof financeRecurring.$inferInsert;
