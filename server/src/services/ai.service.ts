import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { and, desc, eq, gte, isNull, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tasks,
  habits,
  habitLogs,
  financeEntries,
  calendarEvents,
  goals,
  notes,
  diaryEntries,
} from '../db/schema/index.js';
import { embed } from './embedding.service.js';
import { executeAdvanced, pickOne, stripAccents, bogotaDateTime, ISO_DATE, type ActionResult } from './ai-actions.service.js';
import { env } from '../config/env.js';
import { bogotaISODate } from '../lib/date.js';

export const CLAUDE_MODEL = 'claude-sonnet-5';

// Provider selection: Groq (API compatible con OpenAI) takes priority, then Anthropic.
type Provider = 'groq' | 'anthropic' | 'none';
export const AI_PROVIDER: Provider = env.GROQ_API_KEY
  ? 'groq'
  : env.ANTHROPIC_API_KEY
    ? 'anthropic'
    : 'none';

// maxRetries: 0 — el SDK reintentaría los 429 esperando varios segundos; es
// mejor pasar enseguida al siguiente modelo (ver streamChat), que tiene su
// propio cupo de tokens por minuto.
const groq = env.GROQ_API_KEY
  ? new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: env.GROQ_BASE_URL, maxRetries: 0 })
  : null;

// Respaldos si el modelo principal (AI_MODEL) da 429 o deja de existir. En el
// plan gratis cada modelo tiene su propio cupo (8.000 tokens/min), y la clave
// es una sola para todos los usuarios de la app.
const GROQ_FALLBACK_MODELS = ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b'];

const anthropic = env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  : null;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface UserContext {
  tasks: { title: string; status: string; priority: string; dueDate: string | null }[];
  habitsToday: { name: string; done: boolean }[];
  finance: { income: number; expenses: number; balance: number; month: string };
  diary: { date: string; mood: number }[];
}

const MOOD_LABELS = ['', 'fatal', 'mal', 'regular', 'bien', 'genial'];

function todayISO(): string {
  return bogotaISODate();
}

function monthStartISO(): string {
  return `${todayISO().slice(0, 7)}-01`;
}

/** Gather a compact snapshot of the user's data to ground the assistant. */
export async function buildUserContext(userId: string): Promise<UserContext> {
  const today = todayISO();
  const monthStart = monthStartISO();

  const [taskRows, pendingRows, habitRows, todaysLogs, financeRows, diaryRows] =
    await Promise.all([
      // Last 10 tasks: overdue or due today, most urgent first
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
        .orderBy(desc(tasks.dueDate))
        .limit(10),
      // Tareas pendientes (para que el asistente pueda completarlas/editarlas
      // por nombre aunque no estén entre las 10 más recientes).
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt), ne(tasks.status, 'done')))
        .orderBy(tasks.dueDate)
        .limit(25),
      db
        .select()
        .from(habits)
        .where(and(eq(habits.userId, userId), isNull(habits.deletedAt))),
      db
        .select()
        .from(habitLogs)
        .where(and(eq(habitLogs.userId, userId), eq(habitLogs.date, today))),
      db
        .select()
        .from(financeEntries)
        .where(
          and(
            eq(financeEntries.userId, userId),
            isNull(financeEntries.deletedAt),
            gte(financeEntries.date, monthStart),
          ),
        ),
      db
        .select()
        .from(diaryEntries)
        .where(and(eq(diaryEntries.userId, userId), isNull(diaryEntries.deletedAt)))
        .orderBy(desc(diaryEntries.date))
        .limit(5),
    ]);

  const loggedHabitIds = new Set(todaysLogs.map((l) => l.habitId));

  let income = 0;
  let expenses = 0;
  for (const e of financeRows) {
    const amt = Number(e.amount);
    if (e.type === 'income') income += amt;
    else expenses += amt;
  }

  return {
    tasks: [...new Map([...pendingRows, ...taskRows].map((t) => [t.id, t])).values()].map((t) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
    })),
    habitsToday: habitRows.map((h) => ({ name: h.name, done: loggedHabitIds.has(h.id) })),
    finance: {
      income: Math.round(income * 100) / 100,
      expenses: Math.round(expenses * 100) / 100,
      balance: Math.round((income - expenses) * 100) / 100,
      month: monthStart.slice(0, 7),
    },
    diary: diaryRows.map((d) => ({ date: d.date, mood: d.mood })),
  };
}

export function buildSystemPrompt(ctx: UserContext, userName: string): string {
  const tasksTxt = ctx.tasks.length
    ? ctx.tasks
        .map(
          (t) =>
            `- [${t.status}] ${t.title} (priority: ${t.priority}${
              t.dueDate ? `, due ${t.dueDate}` : ''
            })`,
        )
        .join('\n')
    : '- (no tasks)';

  const habitsTxt = ctx.habitsToday.length
    ? ctx.habitsToday.map((h) => `- [${h.done ? 'x' : ' '}] ${h.name}`).join('\n')
    : '- (no habits tracked)';

  const diaryTxt = ctx.diary.length
    ? ctx.diary.map((d) => `- ${d.date}: mood ${d.mood}/5 (${MOOD_LABELS[d.mood] ?? '?'})`).join('\n')
    : '- (no diary entries)';

  return `Eres el asistente personal dentro de "Life OS", un panel de gestión de vida para ${userName}.
Tienes acceso en vivo a una foto de sus datos, abajo.
Responde SIEMPRE en español. Hoy es ${todayISO()}.

ESTILO (importante): responde de forma clara y organizada, como ChatGPT —
nunca en un párrafo corrido que mezcla varios datos. Da la respuesta
primero, sin introducciones ni resúmenes de lo que vas a decir, y sin
repetir la pregunta.
- Si mencionas 2 o más elementos (tareas, hábitos, gastos, eventos...),
  SIEMPRE preséntalos como lista con viñetas o numerada — nunca los
  enumeres dentro de una oración.
- Si los elementos tienen 2 o más atributos comparables (ej. tarea +
  prioridad + fecha, o gasto + categoría + monto), usa una tabla en
  markdown (con encabezados) en vez de una lista.
- Si la respuesta cubre varios temas, sepáralos con encabezados \`##\`.
- Usa **negrita** para cifras y palabras clave importantes.
- Para preguntas simples de una sola cosa, una respuesta corta y directa
  basta — no fuerces listas ni tablas donde no aportan.
- Menciona cifras concretas del contexto cuando sea relevante. Si algo no
  está en los datos, dilo con honestidad. Amplía con más detalle solo si
  el usuario lo pide.

ACCIONES: puedes hacer en la app todo lo que el usuario haría a mano — crear,
editar, completar y borrar — pero SOLO cuando lo pida explícitamente
("agrega", "crea", "registra", "completa", "marca", "cambia", "borra"...). Una
pregunta o petición de información (qué, cuáles, cuántas, resume, muéstrame...)
NUNCA genera un bloque de acción, aunque sugieras cosas en tu respuesta.
Si no está claro que quiere actuar, pregunta primero.

Para actuar, escribe UNA frase corta y AL FINAL un bloque (fenced \`\`\`action)
con un JSON por bloque (puedes poner varios bloques). El bloque no se muestra.
Campos obligatorios con *; los demás son opcionales: NUNCA los preguntes, omítelos
(se usan valores por defecto). Si falta un obligatorio, pídelo en una línea.
Usa la fecha de hoy para "mañana", "el viernes", etc. Fechas "YYYY-MM-DD", horas "HH:mm".

CREAR:
- create_task — title*; priority (low|medium|high|urgent); dueDate; description; tags[].
- create_finance_entry — entryType* (income|expense); amount*; category*; date; description.
- create_budget — category*; limit*; period (monthly|weekly|yearly).
- create_recurring — entryType*; amount*; category*; frequency* (weekly|monthly|yearly); startDate; endDate; description.
- create_event — title*; date*; startTime; endTime; allDay; location; description.
- create_habit — name*; frequency (daily|weekly); targetPerWeek (1-7); description.
- create_goal — title*; targetValue; currentValue; unit; category; deadline; description.
- add_milestone — match* (meta); title*.
- create_note — content* (o title); title; tags[]; pinned.
- create_diary_entry — content*; mood (1-5); title; tags[]; date.

EDITAR / COMPLETAR (en "match"* pon las palabras del usuario para identificar el elemento; incluye al menos un campo a cambiar):
- update_task — match*; status (todo|in_progress|done); priority; dueDate; title; description; tags[].
- update_event — match*; title; date; startTime; endTime; allDay; location; description.
- update_habit — match*; name; frequency; targetPerWeek; description.
- log_habit — match*; date; done (false para desmarcar). Para "ya hice/cumplí X hoy".
- update_goal — match*; title; targetValue; unit; deadline; status (active|completed|archived); currentValue (total nuevo) o addValue (suma).
- complete_milestone — match* (meta); milestone*; done.
- update_note — match*; title; content (reemplaza) o append (añade al final); tags[]; pinned.
- update_finance_entry — match* (texto de descripción/categoría); amount o matchDate (para elegir entre parecidos); newAmount; category; description; date; entryType.
- update_budget — match* (categoría); limit; period.
- update_recurring — match*; newAmount; category; frequency; endDate; active (false = pausar).

BORRAR (solo si el usuario dice "borra/elimina/quita..." o confirma): delete_task, delete_event,
delete_habit, delete_goal, delete_note, delete_budget, delete_recurring, delete_finance_entry
— todos con match* (delete_finance_entry admite además amount/matchDate). Borra UN elemento por
bloque. Si el pedido es ambiguo ("borra mis tareas") NO borres: pregunta cuál. Para borrados
amplios o dudosos pide confirmación antes ("¿Borro X?"); si el usuario ya fue claro, hazlo.

Ejemplos:
\`\`\`action
{"type":"create_task","title":"Comprar leche","priority":"medium","dueDate":"${todayISO()}"}
\`\`\`
\`\`\`action
{"type":"update_task","match":"comprar leche","status":"done"}
\`\`\`
\`\`\`action
{"type":"create_habit","name":"Leer 20 minutos"}
\`\`\`
Casos: "agrega una tarea: revisar el correo" ya alcanza (sin fecha ni prioridad);
"reunión con Juan el lunes a las 3pm" ya alcanza; "ingreso de 1200000 por salario" ya alcanza.
No inventes datos que el usuario no dio. NUNCA digas que ya hiciste algo (creaste,
completaste, borraste...) si no incluiste el bloque \`\`\`action en esa misma respuesta:
si no lo incluiste, no pasó. No puedes: enviar solicitudes de amistad, asignar tareas a
otros, cambiar la contraseña ni el perfil; si te lo piden, indica dónde hacerlo en la app.

## DATOS (contexto interno tuyo, NO es la respuesta)
Todo lo de abajo es solo información de referencia para que respondas con
datos reales. NUNCA la copies ni la repitas tal cual (ni completa ni por
secciones): úsala solo para extraer los datos puntuales que la pregunta
del usuario realmente necesita.

## Tareas recientes
${tasksTxt}

## Hábitos de hoy
${habitsTxt}

## Finanzas de este mes (${ctx.finance.month})
- Ingresos: $${ctx.finance.income}
- Gastos: $${ctx.finance.expenses}
- Balance: $${ctx.finance.balance}

## Ánimos recientes del diario
${diaryTxt}`;
}

/** Describe which data was injected — surfaced to the UI as a "context badge". */
export function contextBadge(ctx: UserContext): string[] {
  return [
    `${ctx.tasks.length} tasks`,
    `${ctx.habitsToday.length} habits`,
    `finances (${ctx.finance.month})`,
    `${ctx.diary.length} diary entries`,
  ];
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Stream an assistant completion. Uses Groq (OpenAI-compatible) when a key is
 * present, otherwise Anthropic Claude, otherwise a demo mock so the chat UI is
 * fully usable offline.
 */
export async function streamChat(
  systemPrompt: string,
  history: ChatMessage[],
  message: string,
  cb: StreamCallbacks,
): Promise<void> {
  const messages: ChatMessage[] = [...history, { role: 'user', content: message }];

  if (AI_PROVIDER === 'none') {
    const mock =
      "Estoy en **modo demo sin conexión** porque no hay una clave de IA configurada. " +
      "Agrega `GROQ_API_KEY` o `ANTHROPIC_API_KEY` al `.env` del servidor.\n\n" +
      "Con tus datos ya puedo ver tus tareas, hábitos, finanzas y ánimos del diario conectados — configura la clave y pídeme *\"Resume mi semana\"*.";
    for (const chunk of mock.match(/.{1,4}/g) ?? [mock]) {
      cb.onDelta(chunk);
      await new Promise((r) => setTimeout(r, 8));
    }
    cb.onDone();
    return;
  }

  try {
    if (AI_PROVIDER === 'groq' && groq) {
      const models = [env.AI_MODEL, ...GROQ_FALLBACK_MODELS.filter((m) => m !== env.AI_MODEL)];
      let lastErr: unknown;
      for (const model of models) {
        let started = false;
        try {
          const stream = await groq.chat.completions.create({
            model,
            temperature: 0.3,
            top_p: 0.9,
            // gpt-oss "razona" antes de responder y esos tokens cuentan aquí.
            max_tokens: 1200,
            stream: true,
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
            ],
            // Razonamiento corto: baja el tiempo al primer texto de ~3-5s a
            // <1s. Solo para gpt-oss: otros modelos rechazan el parámetro.
            ...(model.includes('gpt-oss') ? { reasoning_effort: 'low' as const } : {}),
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content ?? '';
            if (text) {
              started = true;
              cb.onDelta(text);
            }
          }
          cb.onDone();
          return;
        } catch (err) {
          lastErr = err;
          const status = (err as { status?: number }).status;
          // Se pasa al siguiente modelo solo si todavía no se le mandó texto
          // al usuario y el fallo es de cupo (429) o del modelo (404/410/5xx).
          const retryable = status === 429 || status === 404 || status === 410 || (status ?? 0) >= 500;
          if (started || !retryable) throw err;
          console.error(`[ai] "${model}" falló (HTTP ${status}); probando el siguiente modelo`);
        }
      }
      throw lastErr;
    }

    if (anthropic) {
      const stream = anthropic.messages.stream({
        model: CLAUDE_MODEL,
        max_tokens: 512,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      stream.on('text', (text) => cb.onDelta(text));
      await stream.finalMessage();
      cb.onDone();
      return;
    }

    cb.onError('No hay proveedor de IA disponible');
  } catch (err) {
    // Mensajes entendibles en vez de "410 status code (no body)".
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 410) {
      // El proveedor retiró o renombró el modelo (pasó con llama-3.1-8b-instruct).
      console.error(`[ai] el modelo "${env.AI_MODEL}" ya no está disponible (HTTP ${status})`);
      cb.onError('El modelo de IA ya no está disponible. Avísale al administrador para que lo actualice.');
      return;
    }
    if (status === 429) {
      // Límite de uso/tokens por minuto del plan de Groq.
      console.error(`[ai] límite de uso del proveedor alcanzado (HTTP 429) con "${env.AI_MODEL}"`);
      cb.onError('La IA está recibiendo muchas solicitudes. Espera unos segundos e inténtalo de nuevo.');
      return;
    }
    if (status === 401 || status === 403) {
      console.error(`[ai] la clave de IA fue rechazada (HTTP ${status})`);
      cb.onError('La clave de la IA no es válida. Avísale al administrador.');
      return;
    }
    cb.onError((err as Error).message ?? 'La solicitud a la IA falló');
  }
}

// ── Acciones del asistente ──────────────────────────────────────────────
// El modelo puede pedir crear elementos mediante bloques ```action {json}```.
// Aquí los parseamos y ejecutamos de forma segura (solo creación).

export type { ActionResult };

const ACTION_RE = /```action\s*([\s\S]*?)```/g;

// Salvaguarda de servidor: incluso si el modelo genera un bloque ```action
// sin que se lo hayan pedido (pasa a veces con los modelos pequeños/gratuitos),
// nunca lo ejecutamos a menos que el propio mensaje del usuario contenga
// intención explícita de crear/agregar algo.
const CREATION_INTENT_RE =
  /\b(agrega|agregar|agrégame|añad|crea|crear|créa|créame|registra|registrar|anota|anotar|apunta|apuntar|apúntame|guarda|guardar|guárdame|programa|programar|recuérdame|recordar|hazme|haz una|has una|súmame|ponme|pon una)\b/i;

// Verbos de acción sobre elementos existentes, comparados sin tildes.
const UPDATE_INTENT_RE =
  /\b(complet\w*|termin\w*|marca\w*|mueve|mover|muevela|cambia\w*|actualiza\w*|posp\w*|aplaza\w*|reprograma\w*|hice|hecho|cumpli\w*|avanza\w*|sube|suma\w*|lleva|lleg[ue]\w*|desmarca\w*|quita la marca|ya (lo )?(hice|termine|complete)|cerr\w*)\b/;

const EXTRA_CREATE_RE = /\b(nuev[oa]s?|quiero (un|una|que|empezar|comenzar)|necesito (un|una)|empez\w*|comenz\w*|inici\w*|me gustaria|ayudame a|configura\w*|pon(er)?me|establece\w*|define|fija)\b/;
const DELETE_INTENT_RE = /\b(borr\w*|elimin\w*|quita\w*|saca\w*|cancela\w*|desactiva\w*|descarta\w*|remueve|remover|deshaz\w*|suprim\w*|bota\w*)\b/;
// "sí", "dale", "ok"… como respuesta a una confirmación del asistente.
const AFFIRM_RE = /^(si|dale|ok|okay|vale|claro|confirmo|hazlo|adelante|de una|por favor|correcto|exacto)\b/;

/** true si el mensaje del usuario (no la respuesta del modelo) pide crear o
 *  modificar algo. */
export function hasCreationIntent(userMessage: string): boolean {
  const m = stripAccents(userMessage).trim();
  return CREATION_INTENT_RE.test(userMessage) || UPDATE_INTENT_RE.test(m) || EXTRA_CREATE_RE.test(m) || AFFIRM_RE.test(m);
}

/** true si el usuario pidió borrar (o confirmó con "sí") — el servidor nunca
 *  ejecuta un delete_* sin esto. */
export function hasDeleteIntent(userMessage: string): boolean {
  const m = stripAccents(userMessage).trim();
  return DELETE_INTENT_RE.test(m) || AFFIRM_RE.test(m);
}


/** Quita los bloques de acción del texto (para no mostrarlos ni guardarlos). */
export function stripActionBlocks(text: string): string {
  return text
    .replace(ACTION_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function executeOne(userId: string, p: any, canDelete: boolean): Promise<ActionResult> {
  const today = todayISO();
  const advanced = await executeAdvanced(userId, p, canDelete);
  if (advanced) return advanced;
  switch (p?.type) {
    case 'create_task': {
      if (!p.title) return { ok: false, kind: 'task', label: 'tarea', error: 'falta el título' };
      const priority = ['low', 'medium', 'high', 'urgent'].includes(p.priority) ? p.priority : 'medium';
      await db.insert(tasks).values({
        userId,
        title: String(p.title),
        description: p.description ? String(p.description) : null,
        priority,
        status: 'todo',
        tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
        dueDate: ISO_DATE.test(p.dueDate ?? '') ? new Date(p.dueDate) : null,
        completedAt: null,
      });
      return { ok: true, kind: 'task', label: `Tarea: ${p.title}` };
    }
    case 'create_finance_entry': {
      const type = p.entryType === 'income' ? 'income' : 'expense';
      const amount = Number(p.amount);
      if (!amount || amount <= 0) return { ok: false, kind: 'finance', label: 'movimiento', error: 'monto inválido' };
      if (!p.category) return { ok: false, kind: 'finance', label: 'movimiento', error: 'falta la categoría' };
      const date = ISO_DATE.test(p.date ?? '') ? p.date : today;
      await db.insert(financeEntries).values({
        userId,
        type,
        amount: amount.toFixed(2),
        category: String(p.category),
        description: p.description ? String(p.description) : null,
        date,
      });
      return { ok: true, kind: 'finance', label: `${type === 'income' ? 'Ingreso' : 'Gasto'} de $${amount} en ${p.category}` };
    }
    case 'create_event': {
      if (!p.title) return { ok: false, kind: 'event', label: 'evento', error: 'falta el título' };
      const date = ISO_DATE.test(p.date ?? '') ? p.date : today;
      const allDay = Boolean(p.allDay);
      const startHM = /^\d{2}:\d{2}$/.test(p.startTime ?? '') ? p.startTime : '09:00';
      const endHM = /^\d{2}:\d{2}$/.test(p.endTime ?? '') ? p.endTime : startHM;
      const start = bogotaDateTime(date, allDay ? '00:00' : startHM);
      const end = bogotaDateTime(date, allDay ? '23:59' : endHM);
      await db.insert(calendarEvents).values({
        userId,
        title: String(p.title),
        description: p.description ? String(p.description) : null,
        location: p.location ? String(p.location) : null,
        color: typeof p.color === 'string' ? p.color : '#7C3AED',
        startTime: start,
        endTime: end,
        allDay,
      });
      return { ok: true, kind: 'event', label: `Evento: ${p.title}` };
    }
    case 'create_habit': {
      if (!p.name) return { ok: false, kind: 'habit', label: 'hábito', error: 'falta el nombre' };
      const frequency = p.frequency === 'weekly' ? 'weekly' : 'daily';
      const target = Number(p.targetPerWeek);
      await db.insert(habits).values({
        userId,
        name: String(p.name),
        description: p.description ? String(p.description) : null,
        icon: typeof p.icon === 'string' ? p.icon : undefined,
        color: typeof p.color === 'string' ? p.color : undefined,
        frequency,
        targetPerWeek: Number.isInteger(target) && target >= 1 && target <= 7 ? target : 7,
      });
      return { ok: true, kind: 'habit', label: `Hábito: ${p.name}` };
    }
    case 'create_goal': {
      if (!p.title) return { ok: false, kind: 'goal', label: 'meta', error: 'falta el título' };
      const targetValue = Number(p.targetValue);
      const currentValue = Number(p.currentValue);
      await db.insert(goals).values({
        userId,
        title: String(p.title),
        description: p.description ? String(p.description) : null,
        category: p.category ? String(p.category) : 'personal',
        targetValue: (targetValue > 0 ? targetValue : 100).toString(),
        currentValue: (currentValue >= 0 ? currentValue : 0).toString(),
        unit: p.unit ? String(p.unit) : '%',
        status: 'active',
        deadline: ISO_DATE.test(p.deadline ?? '') ? p.deadline : null,
      });
      return { ok: true, kind: 'goal', label: `Meta: ${p.title}` };
    }
    case 'create_note': {
      const title = p.title ? String(p.title) : 'Sin título';
      const content = p.content ? String(p.content) : '';
      if (!content.trim() && !p.title) return { ok: false, kind: 'note', label: 'nota', error: 'falta el contenido' };
      await db.insert(notes).values({
        userId,
        title,
        content,
        color: typeof p.color === 'string' ? p.color : '#1f2937',
        tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
        pinned: Boolean(p.pinned),
        embedding: embed(`${title}\n${content}`),
      });
      return { ok: true, kind: 'note', label: `Nota: ${title}` };
    }
    case 'create_diary_entry': {
      const content = p.content ? String(p.content) : '';
      if (!content.trim()) return { ok: false, kind: 'diary', label: 'entrada de diario', error: 'falta el contenido' };
      const mood = Number(p.mood);
      const date = ISO_DATE.test(p.date ?? '') ? p.date : today;
      await db.insert(diaryEntries).values({
        userId,
        title: p.title ? String(p.title) : null,
        content,
        mood: Number.isInteger(mood) && mood >= 1 && mood <= 5 ? mood : 3,
        tags: Array.isArray(p.tags) ? p.tags.map(String) : [],
        date,
      });
      return { ok: true, kind: 'diary', label: 'Entrada de diario' };
    }
    case 'update_task': {
      const rows = await db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)));
      // Al completar, se prefiere buscar entre las que siguen pendientes.
      const pool = p.status === 'done' && rows.some((t) => t.status !== 'done') ? rows.filter((t) => t.status !== 'done') : rows;
      const found = pickOne(pool, (t) => t.title, p.match, 'tarea');
      if ('error' in found) return { ok: false, kind: 'task', label: 'tarea', error: found.error };
      const t = found.row;

      const patch: Partial<typeof tasks.$inferInsert> = {};
      if (['todo', 'in_progress', 'done'].includes(p.status)) {
        patch.status = p.status;
        patch.completedAt = p.status === 'done' ? new Date() : null;
      }
      if (['low', 'medium', 'high', 'urgent'].includes(p.priority)) patch.priority = p.priority;
      if (ISO_DATE.test(p.dueDate ?? '')) patch.dueDate = new Date(p.dueDate);
      if (p.title) patch.title = String(p.title);
      if (p.description !== undefined) patch.description = p.description ? String(p.description) : null;
      if (Array.isArray(p.tags)) patch.tags = p.tags.map(String);
      if (!Object.keys(patch).length) return { ok: false, kind: 'task', label: t.title, error: 'no indicaste qué cambiar' };

      await db.update(tasks).set(patch).where(and(eq(tasks.id, t.id), eq(tasks.userId, userId)));
      const what =
        patch.status === 'done' ? 'completada' : patch.status === 'in_progress' ? 'en progreso' : patch.status === 'todo' ? 'por hacer' : 'actualizada';
      return { ok: true, kind: 'task', label: `Tarea ${what}: ${t.title}` };
    }
    case 'log_habit': {
      const rows = await db
        .select()
        .from(habits)
        .where(and(eq(habits.userId, userId), isNull(habits.deletedAt)));
      const found = pickOne(rows, (h) => h.name, p.match, 'hábito');
      if ('error' in found) return { ok: false, kind: 'habit', label: 'hábito', error: found.error };
      const h = found.row;
      const day = ISO_DATE.test(p.date ?? '') ? p.date : today;
      const wantDone = p.done !== false;

      const [existing] = await db
        .select()
        .from(habitLogs)
        .where(and(eq(habitLogs.habitId, h.id), eq(habitLogs.userId, userId), eq(habitLogs.date, day)))
        .limit(1);
      // Idempotente (no alterna como el toggle de la app): pedirlo dos veces no lo desmarca.
      if (wantDone && !existing) await db.insert(habitLogs).values({ habitId: h.id, userId, date: day });
      if (!wantDone && existing) await db.delete(habitLogs).where(eq(habitLogs.id, existing.id));
      return { ok: true, kind: 'habit', label: `Hábito ${wantDone ? 'marcado' : 'desmarcado'}: ${h.name}` };
    }
    default:
      return { ok: false, kind: 'unknown', label: 'acción', error: `tipo desconocido: ${p?.type}` };
  }
}

/** Extrae objetos JSON de un bloque: tolera un objeto, un array, varios
 *  objetos seguidos, comas finales y comillas "tipográficas" (los modelos
 *  pequeños a veces se salen del formato exacto). */
export function parseActionPayloads(raw: string): any[] {
  const clean = raw
    .trim()
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,\s*([}\]])/g, '$1');
  try {
    const v = JSON.parse(clean);
    return Array.isArray(v) ? v : [v];
  } catch {
    /* sigue: probar objeto por objeto */
  }
  const out: any[] = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') {
      if (depth++ === 0) start = i;
    } else if (c === '}' && --depth === 0 && start >= 0) {
      try {
        out.push(JSON.parse(clean.slice(start, i + 1)));
      } catch {
        /* objeto roto: se ignora */
      }
    }
  }
  return out;
}

/** Parsea y ejecuta todas las acciones presentes en la respuesta del modelo.
 *  `canDelete` solo es true si el usuario pidió borrar explícitamente. */
export async function runAssistantActions(userId: string, text: string, canDelete = false): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  for (const m of text.matchAll(ACTION_RE)) {
    const payloads = parseActionPayloads(m[1]);
    if (!payloads.length) {
      results.push({ ok: false, kind: 'unknown', label: 'acción', error: 'JSON inválido' });
      continue;
    }
    for (const payload of payloads) {
      try {
        results.push(await executeOne(userId, payload, canDelete));
      } catch (e: any) {
        const t = String(payload?.type ?? '');
        const kind = t.includes('task') ? 'task' : t.includes('habit') ? 'habit' : t.includes('goal') || t.includes('milestone') ? 'goal' : t.includes('note') ? 'note' : t.includes('event') ? 'event' : t.includes('finance') || t.includes('budget') || t.includes('recurring') ? 'finance' : 'unknown';
        console.error('[ai] acción falló', t, e?.message);
        results.push({ ok: false, kind, label: 'acción', error: e?.message ?? 'error al ejecutar' });
      }
    }
  }
  return results;
}
