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

export const healthLogs = pgTable(
  'health_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', {
      enum: ['workout', 'water', 'sleep', 'weight'],
    }).notNull(),
    value: numeric('value', { precision: 10, scale: 2 }).notNull(),
    unit: text('unit').notNull(), // e.g. 'min', 'ml', 'hours', 'kg'
    notes: text('notes'),
    date: date('date').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    userIdx: index('health_logs_user_idx').on(t.userId),
    typeIdx: index('health_logs_type_idx').on(t.type),
    userDateIdx: index('health_logs_user_date_idx').on(t.userId, t.date),
  }),
);

export type HealthLog = typeof healthLogs.$inferSelect;
export type NewHealthLog = typeof healthLogs.$inferInsert;
