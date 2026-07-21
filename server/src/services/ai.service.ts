import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
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
  healthLogs,
} from '../db/schema/index.js';
import { embed } from './embedding.service.js';
import { env } from '../config/env.js';

export const CLAUDE_MODEL = 'claude-sonnet-4-6';

// Provider selection: NVIDIA (free, OpenAI-compatible) takes priority, then Anthropic.
type Provider = 'nvidia' | 'anthropic' | 'none';
export const AI_PROVIDER: Provider = env.NVIDIA_API_KEY
  ? 'nvidia'
  : env.ANTHROPIC_API_KEY
    ? 'anthropic'
    : 'none';

const nvidia = env.NVIDIA_API_KEY
  ? new OpenAI({ apiKey: env.NVIDIA_API_KEY, baseURL: env.NVIDIA_BASE_URL })
  : null;

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
  health: { type: string; value: string; unit: string; date: string }[];
}

const MOOD_LABELS = ['', 'fatal', 'mal', 'regular', 'bien', 'genial'];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function monthStartISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** Gather a compact snapshot of the user's data to ground the assistant. */
export async function buildUserContext(userId: string): Promise<UserContext> {
  const today = todayISO();
  const monthStart = monthStartISO();

  const [taskRows, habitRows, todaysLogs, financeRows, diaryRows, healthRows] =
    await Promise.all([
      // Last 10 tasks: overdue or due today, most urgent first
      db
        .select()
        .from(tasks)
        .where(and(eq(tasks.userId, userId), isNull(tasks.deletedAt)))
        .orderBy(desc(tasks.dueDate))
        .limit(10),
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
      db
        .select()
        .from(healthLogs)
        .where(and(eq(healthLogs.userId, userId), isNull(healthLogs.deletedAt)))
        .orderBy(desc(healthLogs.date))
        .limit(3),
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
    tasks: taskRows.map((t) => ({
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
    health: healthRows.map((h) => ({
      type: h.type,
      value: h.value,
      unit: h.unit,
      date: h.date,
    })),
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

  const healthTxt = ctx.health.length
    ? ctx.health.map((h) => `- ${h.date}: ${h.type} ${h.value}${h.unit}`).join('\n')
    : '- (no health logs)';

  return `Eres el asistente personal dentro de "Life OS", un panel de gestión de vida para ${userName}.
Tienes acceso en vivo a una foto de sus datos, abajo.
Responde SIEMPRE en español. Hoy es ${todayISO()}.

ESTILO (importante): sé breve y directo. Da la respuesta primero, en 1-3
frases. Para preguntas simples, una sola frase. Nada de introducciones,
relleno ni resúmenes de lo que vas a decir. No repitas la pregunta. Usa
viñetas solo si piden varios elementos, y como máximo 3-5. Amplía con más
detalle únicamente si el usuario lo pide. Menciona cifras concretas del
contexto cuando sea relevante. Si algo no está en los datos, dilo con
honestidad.

ACCIONES: puedes CREAR elementos en cualquier módulo de la app. Cuando el
usuario pida crear algo y tengas los datos obligatorios, incluye AL FINAL de
tu respuesta un bloque con el formato exacto (fenced \`\`\`action) y antes una
sola frase de confirmación. Tipos y campos (obligatorios marcados *):
- create_task — title*; priority ("low"|"medium"|"high"|"urgent"); dueDate ("YYYY-MM-DD"); description.
- create_finance_entry — entryType* ("income"|"expense"); amount* (número); category*; date ("YYYY-MM-DD", hoy por defecto); description.
- create_event — title*; date* ("YYYY-MM-DD"); startTime ("HH:mm"); endTime ("HH:mm"); allDay (bool); location.
- create_habit — name*; frequency ("daily"|"weekly"); targetPerWeek (1-7); description.
- create_goal — title*; targetValue (número); currentValue (número); unit; category; deadline ("YYYY-MM-DD"); description.
- create_note — content* (o title); title; tags (array); pinned (bool).
- create_diary_entry — content*; mood (1-5); title; tags (array); date ("YYYY-MM-DD", hoy por defecto).
- create_health_log — type* ("workout"|"water"|"sleep"|"weight"); value* (número); unit* (ej. "min","L","h","kg"); date ("YYYY-MM-DD"); notes.
Ejemplo:
\`\`\`action
{"type":"create_task","title":"Comprar leche","priority":"medium","dueDate":"${todayISO()}"}
\`\`\`
Puedes incluir varios bloques \`\`\`action si el usuario pide crear varias cosas.
Reglas: si faltan datos OBLIGATORIOS (*), NO generes el bloque; pide brevemente
lo que necesitas indicando el formato (ej.: si solo dicen "añade una tarea",
pide el título y, opcional, prioridad y fecha). Nunca inventes datos que el
usuario no dio. Solo puedes crear (no editar ni borrar). El bloque \`\`\`action
no se muestra al usuario. Usa la fecha de hoy para interpretar "mañana", "el viernes", etc.

## Tareas recientes
${tasksTxt}

## Hábitos de hoy
${habitsTxt}

## Finanzas de este mes (${ctx.finance.month})
- Ingresos: $${ctx.finance.income}
- Gastos: $${ctx.finance.expenses}
- Balance: $${ctx.finance.balance}

## Ánimos recientes del diario
${diaryTxt}

## Registros de salud recientes
${healthTxt}`;
}

/** Describe which data was injected — surfaced to the UI as a "context badge". */
export function contextBadge(ctx: UserContext): string[] {
  return [
    `${ctx.tasks.length} tasks`,
    `${ctx.habitsToday.length} habits`,
    `finances (${ctx.finance.month})`,
    `${ctx.diary.length} diary entries`,
    `${ctx.health.length} health logs`,
  ];
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Stream an assistant completion. Uses NVIDIA NIM (free, OpenAI-compatible) when
 * a key is present, otherwise Anthropic Claude, otherwise a demo mock so the
 * chat UI is fully usable offline.
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
      "Agrega `NVIDIA_API_KEY` (modelos gratuitos) o `ANTHROPIC_API_KEY` al `.env` del servidor.\n\n" +
      "Con tus datos ya puedo ver tus tareas, hábitos, finanzas, ánimos del diario y registros de salud conectados — configura la clave y pídeme *\"Resume mi semana\"*.";
    for (const chunk of mock.match(/.{1,4}/g) ?? [mock]) {
      cb.onDelta(chunk);
      await new Promise((r) => setTimeout(r, 8));
    }
    cb.onDone();
    return;
  }

  try {
    if (AI_PROVIDER === 'nvidia' && nvidia) {
      const stream = await nvidia.chat.completions.create({
        model: env.AI_MODEL,
        temperature: 0.6,
        top_p: 0.95,
        max_tokens: 512,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content ?? '';
        if (text) cb.onDelta(text);
      }
      cb.onDone();
      return;
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
    cb.onError((err as Error).message ?? 'La solicitud a la IA falló');
  }
}

// ── Acciones del asistente ──────────────────────────────────────────────
// El modelo puede pedir crear elementos mediante bloques ```action {json}```.
// Aquí los parseamos y ejecutamos de forma segura (solo creación).

export interface ActionResult {
  ok: boolean;
  kind: 'task' | 'finance' | 'event' | 'habit' | 'goal' | 'note' | 'diary' | 'health' | 'unknown';
  label: string;
  error?: string;
}

const ACTION_RE = /```action\s*([\s\S]*?)```/g;

/** Quita los bloques de acción del texto (para no mostrarlos ni guardarlos). */
export function stripActionBlocks(text: string): string {
  return text
    .replace(ACTION_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

async function executeOne(userId: string, p: any): Promise<ActionResult> {
  const today = todayISO();
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
      const start = allDay ? `${date}T00:00:00` : `${date}T${startHM}:00`;
      const end = allDay ? `${date}T23:59:00` : `${date}T${endHM}:00`;
      await db.insert(calendarEvents).values({
        userId,
        title: String(p.title),
        description: p.description ? String(p.description) : null,
        location: p.location ? String(p.location) : null,
        color: typeof p.color === 'string' ? p.color : '#7C3AED',
        startTime: new Date(start),
        endTime: new Date(end),
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
    case 'create_health_log': {
      const type = ['workout', 'water', 'sleep', 'weight'].includes(p.type) ? p.type : null;
      if (!type) return { ok: false, kind: 'health', label: 'registro de salud', error: 'tipo inválido (workout|water|sleep|weight)' };
      const value = Number(p.value);
      if (!value || value <= 0) return { ok: false, kind: 'health', label: 'registro de salud', error: 'valor inválido' };
      if (!p.unit) return { ok: false, kind: 'health', label: 'registro de salud', error: 'falta la unidad' };
      const date = ISO_DATE.test(p.date ?? '') ? p.date : today;
      await db.insert(healthLogs).values({
        userId,
        type,
        value: value.toString(),
        unit: String(p.unit),
        notes: p.notes ? String(p.notes) : null,
        date,
      });
      return { ok: true, kind: 'health', label: `Salud: ${type} ${value}${p.unit}` };
    }
    default:
      return { ok: false, kind: 'unknown', label: 'acción', error: `tipo desconocido: ${p?.type}` };
  }
}

/** Parsea y ejecuta todas las acciones presentes en la respuesta del modelo. */
export async function runAssistantActions(userId: string, text: string): Promise<ActionResult[]> {
  const results: ActionResult[] = [];
  for (const m of text.matchAll(ACTION_RE)) {
    let payload: any;
    try {
      payload = JSON.parse(m[1].trim());
    } catch {
      results.push({ ok: false, kind: 'unknown', label: 'acción', error: 'JSON inválido' });
      continue;
    }
    try {
      results.push(await executeOne(userId, payload));
    } catch (e: any) {
      results.push({ ok: false, kind: payload?.type?.includes('task') ? 'task' : 'unknown', label: 'acción', error: e?.message ?? 'error al ejecutar' });
    }
  }
  return results;
}
