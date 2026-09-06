import { pgTable, uuid, text, date, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    avatar: text('avatar'),
    // Handle público único (opcional). NULL para cuentas que aún no lo fijan.
    username: text('username').unique(),
    // Código corto para agregar amigos sin exponer el email.
    friendCode: text('friend_code').unique(),
    bio: text('bio'),
    birthDate: date('birth_date'),
    location: text('location'),
    phone: text('phone'),
    pronouns: text('pronouns'),
    plan: text('plan', { enum: ['free', 'pro'] })
      .notNull()
      .default('free'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => ({
    emailIdx: index('users_email_idx').on(t.email),
    usernameIdx: index('users_username_idx').on(t.username),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
