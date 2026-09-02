// Entrypoint de Vercel: una sola Serverless Function que sirve toda la API
// Express bajo /api/*. vercel.json reescribe /api/(.*) -> /api conservando
// el path original, así que Express enruta internamente igual que en local
// (app.use('/api/auth', ...), etc.) — ver server/src/app.ts.
import app from '../server/src/app.js';

export default app;
