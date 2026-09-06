import { pgTable, uuid, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const activityEvents = pgTable(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['habit_completed', 'task_completed'] }).notNull(),
    // habitId o taskId según `kind`. Sin FK a propósito: el evento debe
    // sobrevivir aunque el hábito/tarea se borre después.
    entityId: uuid('entity_id').notNull(),
    // Nombre del hábito o título de la tarea, copiado al momento del evento.
    label: text('label').notNull(),
    // Solo para 'habit_completed': la fecha (YYYY-MM-DD) marcada, para poder
    // borrar el evento exacto si luego se destilda ese día.
    date: text('date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('activity_events_user_idx').on(t.userId),
    entityIdx: index('activity_events_entity_idx').on(t.entityId),
    createdIdx: index('activity_events_created_idx').on(t.createdAt),
  }),
);

export const activityReactions = pgTable(
  'activity_reactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => activityEvents.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqueReaction: unique('activity_reactions_unique').on(t.eventId, t.userId),
  }),
);

export type ActivityEvent = typeof activityEvents.$inferSelect;
export type NewActivityEvent = typeof activityEvents.$inferInsert;
export type ActivityReaction = typeof activityReactions.$inferSelect;
export type NewActivityReaction = typeof activityReactions.$inferInsert;
