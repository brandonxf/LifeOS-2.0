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
  // NVIDIA NIM (OpenAI-compatible, free models). https://build.nvidia.com
  NVIDIA_API_KEY: process.env.NVIDIA_API_KEY ?? '',
  NVIDIA_BASE_URL: process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1',
  AI_MODEL: process.env.AI_MODEL ?? 'meta/llama-3.1-8b-instruct',
  CLIENT_URL: process.env.CLIENT_URL ?? 'http://localhost:5173',
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL_DAYS: 30,
} as const;

export const isProd = env.NODE_ENV === 'production';
