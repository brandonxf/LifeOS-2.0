/**
 * Presets de react-query para pantallas "sociales" (Amigos, Hábitos, Tareas):
 * sin WebSockets no hay push real desde el servidor (la API es una función
 * serverless en Vercel, no sostiene conexiones persistentes), así que se
 * simula con polling mientras la pantalla está abierta/enfocada.
 * `refetchIntervalInBackground` no se toca (default false): no sondea si la
 * pestaña/app está en segundo plano.
 */
export const LIVE_FAST = { refetchInterval: 5000, refetchOnWindowFocus: true } as const;
export const LIVE_SLOW = { refetchInterval: 10_000, refetchOnWindowFocus: true } as const;
