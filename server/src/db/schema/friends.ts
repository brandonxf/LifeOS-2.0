import { pgTable, uuid, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const friendships = pgTable(
  'friendships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['pending', 'accepted'] })
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (t) => ({
    requesterIdx: index('friendships_requester_idx').on(t.requesterId),
    addresseeIdx: index('friendships_addressee_idx').on(t.addresseeId),
    uniquePair: unique('friendships_pair_unique').on(t.requesterId, t.addresseeId),
  }),
);

export type Friendship = typeof friendships.$inferSelect;
export type NewFriendship = typeof friendships.$inferInsert;
