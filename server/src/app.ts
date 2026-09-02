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
import healthRoutes from './routes/health.routes.js';
import aiRoutes from './routes/ai.routes.js';

const app = express();

// Lista blanca de orígenes (defensa en profundidad: en el despliegue unificado
// de Vercel, cliente y API viven en el mismo dominio, así que el navegador ni
// siquiera dispara CORS; esto solo importa para la app Android nativa, que no
// manda `Origin`, y para quien pegue el backend a otro frontend).
const allowedOrigins = env.CLIENT_URL.split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      // Sin origin (curl, health checks, apps móviles) o en la lista blanca.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin no permitido por CORS: ${origin}`));
      }
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

// Everything below requires a valid JWT and is rate-limited per user.
app.use('/api', authMiddleware, rateLimiter());
app.use('/api/finance', financeRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/diary', diaryRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/ai', aiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
export default app;
