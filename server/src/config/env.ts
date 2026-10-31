import 'dotenv/config';

function required(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

export const env = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  PORT: parseInt(process.env.PORT ?? '4000', 10),
  DATABASE_URL: required('DATABASE_URL'),
  REDIS_URL: process.env.REDIS_URL ?? '',
  JWT_SECRET: required('JWT_SECRET', 'dev-access-secret-change-me'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  // Groq (API compatible con OpenAI). https://console.groq.com
  GROQ_API_KEY: process.env.GROQ_API_KEY ?? '',
  GROQ_BASE_URL: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
  AI_MODEL: process.env.AI_MODEL ?? 'openai/gpt-oss-20b',
  // Uno o varios orígenes permitidos por CORS, separados por comas.
  // Ej: "https://lifeos.vercel.app,https://lifeos-git-main-tu.vercel.app"
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  // Dominio del cliente web donde vive /reset-password — se usa para armar el
  // link del correo de recuperación. Un solo origen (no lista), a diferencia
  // de CLIENT_URL. En prod, ponlo al dominio real del cliente desplegado.
  APP_URL: (process.env.APP_URL ?? process.env.CLIENT_URL ?? 'http://localhost:5173').split(',')[0].trim(),
  // Gmail con "contraseña de aplicación" (myaccount.google.com/apppasswords)
  // para mandar el correo de recuperación de contraseña. Si cualquiera de
  // las dos falta, ese correo simplemente no se manda (se loguea el error),
  // el resto de la app sigue funcionando igual.
  GMAIL_USER: process.env.GMAIL_USER ?? '',
  GMAIL_APP_PASSWORD: process.env.GMAIL_APP_PASSWORD ?? '',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
} as const;

export const isProd = env.NODE_ENV === 'production';
