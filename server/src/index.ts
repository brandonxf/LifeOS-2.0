import { app } from './app.js';
import { env } from './config/env.js';
import { AI_PROVIDER, CLAUDE_MODEL } from './services/ai.service.js';

// Solo se usa para desarrollo local (`npm run dev` / `npm start`). En Vercel
// el handler serverless (`/api/index.ts` en la raíz del repo) importa `app`
// directamente y nunca llama a `.listen()`.
app.listen(env.PORT, () => {
  console.log(`\n🚀 Life OS API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);
  console.log(
    `   AI: ${
      AI_PROVIDER === 'nvidia'
        ? `NVIDIA (${env.AI_MODEL})`
        : AI_PROVIDER === 'anthropic'
          ? `Claude (${CLAUDE_MODEL})`
          : 'offline demo mode'
    }`,
  );
  console.log(`   Redis: ${env.REDIS_URL ? 'connected' : 'in-memory fallback'}\n`);
});
