import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tasks,
  habits,
  habitLogs,
  financeEntries,
  diaryEntries,
  healthLogs,
} from '../db/schema/index.js';
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
