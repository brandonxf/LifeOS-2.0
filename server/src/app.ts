import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env, isProd } from './config/env.js';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import financeRoutes from './routes/finance.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import habitsRoutes from './routes/habits.routes.js';
import goalsRoutes from './routes/goals.routes.js';
import calendarRoutes from './routes/calendar.routes.js';
import diaryRoutes from './routes/diary.routes.js';
import notesRoutes from './routes/notes.routes.js';
import aiRoutes from './routes/ai.routes.js';
import friendsRoutes from './routes/friends.routes.js';
import feedRoutes from './routes/feed.routes.js';
import usersRoutes from './routes/users.routes.js';

const app = express();

// Lista blanca de orígenes. OJO: aunque cliente y API vivan en el mismo
// dominio en el despliegue unificado de Vercel, el navegador SÍ manda el
// header `Origin` en peticiones same-origin (POST/fetch no-GET), así que
// esto se evalúa siempre — no es solo para casos cross-origin.
// Se agrega automáticamente el dominio de Vercel vía las env vars que la
// plataforma ya inyecta, para no depender de mantener `CLIENT_URL` al día a
// mano en cada deploy/preview (eso fue justo lo que rompió el login: la
// variable no incluía el dominio nuevo tras migrar de Render).
const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_PROJECT_PRODUCTION_URL]
  .filter(Boolean)
  .map((host) => `https://${host}`);

const allowedOrigins = [
  ...env.CLIENT_URL.split(',').map((o) => o.trim()).filter(Boolean),
  ...vercelOrigins,
  // El WebView de Capacitor en la app Android sirve el bundle desde este
  // origen fijo (androidScheme por defecto "https", host "localhost") y sí
  // manda `Origin` en el preflight de fetch — hay que permitirlo siempre,
  // sin importar el dominio del deploy.
  'https://localhost',
];

app.use(
  cors({
    origin(origin, callback) {
      // Sin origin (curl, health checks, apps móviles) o en la lista blanca.
      // Si no está permitido, se deniega el CORS sin lanzar excepción: que
      // el navegador lo bloquee como error de CORS normal, no un 500 nuestro.
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true,
  }),
);
// 10mb: las entradas de diario pueden traer fotos como data URIs base64.
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(morgan(isProd ? 'combined' : 'dev'));

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Public auth routes (rate-limited by IP).
app.use('/api/auth', rateLimiter(), authRoutes);

// Fotos de perfil: públicas a propósito (un <img> no manda Authorization) y
// montadas antes del authMiddleware global. Se sirven con caché inmutable, así
// que en la práctica son un puñado de peticiones por dispositivo.
app.use('/api/users', rateLimiter(), usersRoutes);

// Everything below requires a valid JWT and is rate-limited per user.
app.use('/api', authMiddleware, rateLimiter());
app.use('/api/finance', financeRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/feed', feedRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;
