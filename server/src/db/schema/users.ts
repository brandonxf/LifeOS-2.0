import { pgTable, uuid, text, date, timestamp, index } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    // URL pública de la foto de perfil. Para las fotos subidas desde la
    // galería apunta a nuestro propio endpoint (`/api/users/:id/avatar?v=…`)
    // en vez de guardar el base64 aquí: así las listas de amigos/feed/hábitos
    // siguen devolviendo una cadena corta y el navegador cachea la imagen.
    avatar: text('avatar'),
    // Bytes de la foto subida, en base64 (sin el prefijo `data:`). Nunca sale
    // en las respuestas JSON — solo lo lee el endpoint que sirve la imagen.
    avatarData: text('avatar_data'),
    avatarMime: text('avatar_mime'),
    // Sella la versión de la foto: alimenta el `?v=` de la URL para que al
    // cambiarla se rompa el caché inmutable del navegador.
    avatarUpdatedAt: timestamp('avatar_updated_at', { withTimezone: true }),
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
