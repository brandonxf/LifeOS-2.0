# 🌌 Life OS

Un **sistema operativo personal** full-stack y multi-tenant — un panel privado para manejar tus finanzas, tareas, hábitos, metas, calendario, diario, notas y salud, con un **asistente de IA** que conoce tus propios datos. Agrega amigos para compartir hábitos, hacer tareas en equipo y ver el progreso de los demás en un feed de actividad.

![stack](https://img.shields.io/badge/React-18-61dafb) ![stack](https://img.shields.io/badge/Node-Express-3c873a) ![stack](https://img.shields.io/badge/Neon-Postgres-00e599) ![stack](https://img.shields.io/badge/Drizzle-ORM-c5f74f) ![stack](https://img.shields.io/badge/AI-NVIDIA%20%2F%20Claude-76b900)

---

## ✨ Funcionalidades

| Módulo | Destacados |
|--------|-----------|
| **Dashboard** | Cuadrícula de widgets: balance, tareas, anillo de hábitos, metas, próximos eventos, salud de 7 días, barra rápida de IA |
| **Finanzas** | Registro de ingresos/gastos, gráfica de pastel por categoría + barras mensuales, presupuestos con progreso |
| **Tareas** | Tablero Kanban con arrastrar y soltar, vista de lista, filtros por prioridad/etiqueta, actualizaciones optimistas |
| **Hábitos y Metas** | Heatmaps de contribución estilo GitHub, marcar con un clic, rachas, progreso de metas + cuenta regresiva |
| **Calendario** | Vistas de mes/semana personalizadas, clic para agregar, eventos con color, día actual resaltado |
| **Diario** | Editor de texto enriquecido TipTap, selector de ánimo del 1 al 5, etiquetas, gráfica mensual de ánimo |
| **Notas** | Cuadrícula tipo mampostería, fijado, markdown, búsqueda por texto **y** semántica (pgvector) |
| **Salud** | Registra ejercicio / agua / sueño / peso, tarjetas resumen de 7 días + gráficas de línea por métrica |
| **Amigos y Social** | Agrega amigos con un código corto de invitación (sin directorio/búsqueda pública); invita amigos a un hábito o tarea — cada quien acepta antes de que le aparezca |
| **Hábitos compartidos** | El heatmap del hábito se rellena cada día según *qué fracción del equipo* lo completó, no todo-o-nada; se ve la racha actual de cada miembro junto a su avatar |
| **Tareas en equipo** | Asigna una tarea a uno o varios amigos; cualquier asignado activo la puede mover en el tablero, solo el dueño la edita/borra |
| **Feed de actividad** | Ve cuando tus amigos completan un hábito/tarea compartida, o un hábito privado que decidieron transmitir con "Compartir mi progreso con mis amigos" — reacciona con un 👏 |
| **Asistente de IA** | Chat en streaming (SSE), insignia de contexto que muestra exactamente qué datos se enviaron — corre en NVIDIA NIM (gratis) por defecto, con respaldo en Anthropic Claude, y modo demo sin conexión si no hay ninguna clave configurada |

Además: autenticación JWT con **rotación de refresh tokens**, borrado suave, límite de peticiones, modo oscuro, PWA, esqueletos de carga, notificaciones toast, refresco casi en tiempo real (por polling) en todas las pantallas de amigos/hábitos/tareas/feed, y tipado completo en TypeScript.

---

## 🧱 Stack tecnológico

- **Frontend:** React 18, Vite, TailwindCSS, React Router v6, TanStack Query, Zustand, Recharts, TipTap, @hello-pangea/dnd, React Hook Form + Zod (listo para PWA)
- **Backend:** Node.js + Express (API REST, streaming SSE)
- **Base de datos:** [Neon](https://neon.tech) Postgres serverless + Drizzle ORM + Drizzle Kit, con **pgvector** para búsqueda semántica de notas
- **Caché/Sesiones:** Redis ([Upstash](https://upstash.com) recomendado) — con respaldo automático en memoria para desarrollo local
- **IA:** [NVIDIA NIM](https://build.nvidia.com) (gratis, compatible con OpenAI) por defecto, con respaldo en Anthropic Claude si solo esa clave está configurada
- **Auth:** Tokens de acceso JWT + bcrypt + refresh tokens rotativos

---

## 📁 Estructura

```
life-os/
├─ api/
│  └─ index.ts             # Entrada de la Serverless Function de Vercel — importa server/src/app.ts
├─ client/                 # Frontend React + Vite
│  └─ src/
│     ├─ components/        # Layout, componentes de UI, cambio de tema
│     ├─ pages/            # Un archivo por módulo + auth + ajustes
│     ├─ lib/              # cliente de api, tipos, utilidades, query client
│     └─ store/            # Zustand (auth, ui)
├─ server/                 # Backend Express
│  ├─ src/
│  │  ├─ db/
│  │  │  ├─ schema/        # Tablas de Drizzle — un archivo por módulo
│  │  │  ├─ index.ts       # Cliente de Neon + Drizzle
│  │  │  ├─ migrate.ts     # Habilita pgvector
│  │  │  └─ seed.ts        # Usuario demo + datos realistas
│  │  ├─ routes/           # Manejadores de rutas de Express
│  │  ├─ middleware/       # auth, rateLimit, errorHandler
│  │  ├─ services/         # ai, notification, embedding
│  │  ├─ app.ts            # Arma la app de Express (sin .listen) — usado por api/index.ts
│  │  └─ index.ts          # Punto de entrada para desarrollo local (llama a app.listen)
│  ├─ drizzle.config.ts
│  └─ Dockerfile           # Opcional: alojar la API fuera de Vercel
├─ vercel.json              # Un solo despliegue: cliente estático + función serverless /api/*
├─ .env.example
└─ README.md
```

---

## 🚀 Puesta en marcha

### 1. Requisitos previos
- Node.js 20+
- Un proyecto de **Neon** (el plan gratis alcanza) → copia el connection string agrupado (pooled)
- *(Opcional)* Una base de datos de **Upstash Redis** → URL `rediss://…`
- *(Opcional)* Una clave de **NVIDIA** (gratis, [build.nvidia.com](https://build.nvidia.com)) o una clave de **Anthropic** → el chat de IA corre en modo demo sin conexión si no configuras ninguna

### 2. Clonar e instalar
```bash
git clone <your-repo-url> life-os
cd life-os
npm install          # instala ambos workspaces (client + server)
```

### 3. Configurar el entorno
```bash
cp .env.example server/.env
cp .env.example client/.env     # el cliente solo necesita VITE_API_URL
```
Edita `server/.env` y define al menos `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`
(y `NVIDIA_API_KEY` o `ANTHROPIC_API_KEY` para respuestas de IA reales en vez del mock de demo).

Genera secretos fuertes:
```bash
openssl rand -base64 48
```

### 4. Inicializar la base de datos
```bash
cd server
npx tsx src/db/migrate.ts     # habilita la extensión pgvector en Neon
npm run db:push               # sube el esquema de Drizzle (drizzle-kit push)
npm run db:seed               # siembra el usuario demo + datos realistas
```
> `db:push` pide confirmación (s/n) cada vez que una sentencia podría ser destructiva,
> lo cual falla directamente en una shell/CI no interactiva ("Interactive prompts
> require a TTY"). Córrelo desde una terminal de verdad la primera vez, o aplica el
> cambio de esquema como SQL plano tú mismo si te topas con eso — revisa los commits
> del trabajo de amigos/social para ejemplos de esto último.

### 5. Correr en desarrollo
Desde la raíz del repo:
```bash
npm run dev                   # levanta server (:4000) y client (:5173) juntos
```
Abre **http://localhost:5173** e inicia sesión con la cuenta demo:

> **demo@lifeos.app** / **demo1234**

---

## 🔑 Variables de entorno

| Variable | Dónde | Descripción |
|-----|-------|-------------|
| `DATABASE_URL` | server | Connection string agrupado de Postgres en Neon |
| `REDIS_URL` | server | URL de Upstash Redis (opcional — cae a memoria) |
| `JWT_SECRET` | server | Secreto para firmar los tokens de acceso |
| `JWT_REFRESH_SECRET` | server | Secreto reservado para el flujo de refresh |
| `NVIDIA_API_KEY` | server | Clave de NVIDIA NIM — proveedor de IA principal (modelos gratis) |
| `NVIDIA_BASE_URL` | server | Por defecto `https://integrate.api.nvidia.com/v1` |
| `AI_MODEL` | server | Id del modelo de NVIDIA (ver `.env.example`) |
| `ANTHROPIC_API_KEY` | server | Clave de la API de Claude — se usa solo si `NVIDIA_API_KEY` está vacía |
| `CLIENT_URL` | server | Lista blanca de CORS, separada por comas (defensa en profundidad — ver abajo) |
| `PORT` | server | Puerto de la API solo para desarrollo local (por defecto `4000`) |
| `VITE_API_URL` | client | Solo hace falta para el build de Android (`.env.android`) — el build web usa `/api` relativo |

---

## ▲ Despliegue (Vercel — un solo proyecto, cliente + API)

Toda la app se despliega como un **único proyecto de Vercel**: el cliente se compila a
archivos estáticos y `/api/*` lo sirve una sola Serverless Function (`api/index.ts`, que
envuelve la app de Express en `server/src/app.ts`). Mismo dominio para ambos, así que
el navegador nunca hace una petición cross-origin — sin CORS, sin arrancar en frío un
servidor aparte que esté siempre encendido como Render.

1. En el panel de Vercel, **New Project** → importa este repo → pon el **Root
   Directory en la raíz del repo** (no en `client/`). `vercel.json` en la raíz ya
   define los comandos de instalación/build, el directorio de salida, la
   reescritura de `/api/*` y el `maxDuration` de la función.
2. Agrega las variables de entorno del servidor de arriba como **Environment
   Variables** del proyecto (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `NVIDIA_API_KEY` como mínimo). **No** definas `VITE_API_URL` en este proyecto —
   dejarla sin definir es justo lo que hace que el cliente llame a `/api` en el
   mismo origen.
3. Despliega. `/health` y `/api/*` los maneja la función; cualquier otra ruta cae
   a `index.html` (ruteo del lado del cliente).
4. `CLIENT_URL` ahora es sobre todo defensa en profundidad (las peticiones del
   mismo origen se saltan CORS por completo), pero de todas formas ponle el
   dominio `https://*.vercel.app` del proyecto por si algo llama a la API desde
   otro origen más adelante.
5. Ya en producción, actualiza `VITE_API_URL` en `client/.env.android` a ese mismo
   dominio y corre `npm run build:android` antes de regenerar el APK — la app
   nativa no se sirve desde ningún origen, así que sigue necesitando una URL
   absoluta.

**Alternativa: alojar la API tú mismo (Docker)** — solo si despliegas el backend
en algún lugar que no sea Vercel:
```bash
cd server
docker build -t life-os-server .
docker run -p 4000:4000 --env-file .env life-os-server
```

---

## 🧠 Cómo funciona el contexto de la IA

En cada `POST /api/ai/chat`, el servidor corre consultas con Drizzle para armar una
foto en vivo — últimas 10 tareas, hábitos completados hoy, resumen financiero del mes,
últimos 5 ánimos del diario, y registros de salud recientes — arma un system prompt
fundamentado en esos datos, y transmite la respuesta de vuelta por **Server-Sent
Events**. La interfaz muestra una **insignia de contexto** con exactamente qué se envió.
El proveedor se elige en el momento de la petición (`server/src/services/ai.service.ts`):
NVIDIA NIM si `NVIDIA_API_KEY` está configurada, si no Anthropic Claude si
`ANTHROPIC_API_KEY` está configurada, y si no una respuesta de demo enlatada para que
la función siga sirviendo aunque no haya ninguna clave.

> La búsqueda semántica de notas usa un embedding local de 1536 dimensiones (sin
> dependencias externas) guardado en una columna pgvector (HNSW / coseno). Cambia
> `server/src/services/embedding.service.ts` por una API de embeddings alojada para
> mejores resultados — el esquema no cambia.

---

## 🧑‍🤝‍🧑 Amigos y Social

Los amigos se agregan con un código corto de invitación (`friend_code` en `users`), no
con un directorio/búsqueda pública — evita exponer correos o una lista navegable de
cuentas. Agregar un amigo, unirse a un hábito compartido, y que te asignen una tarea
son siempre **solicitud → aceptar/rechazar**, nunca automático, para que a nadie le
aparezca algo en su pantalla sin avisarle. Esquema: `friendships`, `habit_members`,
`task_assignees`, `activity_events` + `activity_reactions` (ver
`server/src/db/schema/`).

La API se despliega como una sola Serverless Function de Vercel, que no sostiene
conexiones persistentes — así que en vez de WebSockets, las pantallas de
Amigos/Hábitos/Tareas/Actividad hacen **polling**: las listas principales se
refrescan cada 5s y las secundarias (solicitudes/invitaciones) cada 10s mientras la
pantalla está abierta y con foco, más un refresco inmediato al volver a enfocar la
ventana (`client/src/lib/live.ts`). El límite de peticiones compartido se subió
en consecuencia (`server/src/middleware/rateLimit.ts`, 300 peticiones / 5 min por
usuario).

---

## 📜 Scripts

| Comando | Ubicación | Qué hace |
|---------|----------|------|
| `npm run dev` | raíz | Corre cliente + servidor juntos |
| `npm run db:push` | raíz/server | Sube el esquema a Neon |
| `npm run db:seed` | raíz/server | Siembra datos de demo |
| `npm run build` | raíz | Compila ambas apps |

---

Hecho con 💜 — tu vida, organizada.
