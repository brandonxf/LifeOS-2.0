import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { db } from './index.js';
import {
  users,
  financeEntries,
  financeBudgets,
  tasks,
  habits,
  habitLogs,
  goals,
  calendarEvents,
  diaryEntries,
  notes,
  healthLogs,
} from './schema/index.js';
import { hashPassword } from '../lib/auth.js';
import { embed } from '../services/embedding.service.js';

const DEMO_EMAIL = 'demo@lifeos.app';
const DEMO_PASSWORD = 'demo1234';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('🌱 Seeding demo data...');

  // Fresh start: remove existing demo user (cascade wipes their data).
  await db.delete(users).where(eq(users.email, DEMO_EMAIL));

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      passwordHash,
      name: 'Demo User',
      plan: 'pro',
      avatar: null,
    })
    .returning();
  const userId = user.id;
  console.log(`  ✓ user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  // ── Finance ──────────────────────────────────────────────────────────
  const expenseCats = ['Supermercado', 'Renta', 'Transporte', 'Restaurantes', 'Entretenimiento', 'Servicios', 'Salud', 'Compras'];
  const financeRows = [];
  for (let m = 0; m < 4; m++) {
    const base = new Date();
    base.setMonth(base.getMonth() - m);
    // salario
    financeRows.push({
      userId,
      type: 'income' as const,
      amount: '3200.00',
      category: 'Salario',
      description: 'Salario mensual',
      date: iso(new Date(base.getFullYear(), base.getMonth(), 1)),
    });
    // gastos aleatorios
    for (let i = 0; i < 18; i++) {
      const cat = rand(expenseCats);
      financeRows.push({
        userId,
        type: 'expense' as const,
        amount: (Math.random() * 120 + 10).toFixed(2),
        category: cat,
        description: `Gasto en ${cat}`,
        date: iso(new Date(base.getFullYear(), base.getMonth(), 1 + Math.floor(Math.random() * 27))),
      });
    }
  }
  await db.insert(financeEntries).values(financeRows);
  await db.insert(financeBudgets).values([
    { userId, category: 'Supermercado', limit: '450.00', period: 'monthly' },
    { userId, category: 'Restaurantes', limit: '250.00', period: 'monthly' },
    { userId, category: 'Entretenimiento', limit: '150.00', period: 'monthly' },
    { userId, category: 'Transporte', limit: '120.00', period: 'monthly' },
  ]);
  console.log(`  ✓ ${financeRows.length} finance entries + 4 budgets`);

  // ── Tasks ────────────────────────────────────────────────────────────
  const taskData = [
    { title: 'Terminar informe trimestral', priority: 'high', status: 'in_progress', tags: ['trabajo'], due: -1 },
    { title: 'Agendar cita con el dentista', priority: 'medium', status: 'todo', tags: ['salud'], due: 2 },
    { title: 'Responder correo del inversionista', priority: 'urgent', status: 'todo', tags: ['trabajo'], due: 0 },
    { title: 'Hacer el súper', priority: 'low', status: 'todo', tags: ['casa'], due: 1 },
    { title: 'Revisar pull requests', priority: 'high', status: 'in_progress', tags: ['trabajo', 'código'], due: 0 },
    { title: 'Planear viaje de fin de semana', priority: 'low', status: 'todo', tags: ['personal'], due: 5 },
    { title: 'Pagar recibo de luz', priority: 'medium', status: 'done', tags: ['casa'], due: -3 },
    { title: 'Leer 30 páginas', priority: 'low', status: 'done', tags: ['personal'], due: -1 },
    { title: 'Actualizar sitio de portafolio', priority: 'medium', status: 'todo', tags: ['personal', 'código'], due: 7 },
    { title: 'Llamar a mamá', priority: 'medium', status: 'done', tags: ['personal'], due: -2 },
  ];
  await db.insert(tasks).values(
    taskData.map((t) => ({
      userId,
      title: t.title,
      description: null,
      priority: t.priority as any,
      status: t.status as any,
      tags: t.tags,
      dueDate: daysAgo(-t.due),
      completedAt: t.status === 'done' ? daysAgo(1) : null,
    })),
  );
  console.log(`  ✓ ${taskData.length} tasks`);

  // ── Habits + logs ────────────────────────────────────────────────────
  const habitDefs = [
    { name: 'Ejercicio matutino', icon: 'dumbbell', color: '#0D9488' },
    { name: 'Leer', icon: 'book', color: '#7C3AED' },
    { name: 'Meditar', icon: 'meditation', color: '#D97706' },
    { name: 'Tomar agua', icon: 'water', color: '#0EA5E9' },
    { name: 'Sin azúcar', icon: 'apple', color: '#DC2626' },
  ];
  const insertedHabits = await db
    .insert(habits)
    .values(habitDefs.map((h) => ({ userId, name: h.name, icon: h.icon, color: h.color, description: null })))
    .returning();

  const logRows: { habitId: string; userId: string; date: string }[] = [];
  for (const h of insertedHabits) {
    for (let d = 0; d < 90; d++) {
      // ~70% completion, with a strong recent streak
      if (d < 5 || Math.random() < 0.7) {
        logRows.push({ habitId: h.id, userId, date: iso(daysAgo(d)) });
      }
    }
  }
  await db.insert(habitLogs).values(logRows);
  console.log(`  ✓ ${insertedHabits.length} habits + ${logRows.length} logs`);

  // ── Goals ────────────────────────────────────────────────────────────
  await db.insert(goals).values([
    { userId, title: 'Ahorrar $10,000', category: 'finance', targetValue: '10000', currentValue: '6400', unit: '$', deadline: iso(daysAgo(-120)) },
    { userId, title: 'Correr un medio maratón', category: 'health', targetValue: '21', currentValue: '14', unit: 'km', deadline: iso(daysAgo(-60)) },
    { userId, title: 'Leer 24 libros', category: 'personal', targetValue: '24', currentValue: '15', unit: 'libros', deadline: iso(daysAgo(-180)) },
    { userId, title: 'Lanzar proyecto personal', category: 'work', targetValue: '100', currentValue: '45', unit: '%', deadline: iso(daysAgo(-90)) },
  ]);
  console.log('  ✓ 4 goals');

  // ── Calendar ─────────────────────────────────────────────────────────
  const eventColors = ['#7C3AED', '#0D9488', '#D97706', '#DC2626', '#2563EB'];
  const eventRows = [];
  for (let i = -5; i < 20; i++) {
    if (Math.random() < 0.5) continue;
    const start = daysAgo(-i);
    start.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    eventRows.push({
      userId,
      title: rand(['Junta diaria', 'Sesión de gym', 'Comida con Alex', 'Cita médica', 'Revisión del proyecto', 'Clase de yoga', 'Llamada con cliente']),
      description: null,
      location: rand(['Oficina', 'Zoom', 'Casa', 'Centro']),
      color: rand(eventColors),
      startTime: start,
      endTime: end,
      allDay: false,
    });
  }
  await db.insert(calendarEvents).values(eventRows);
  console.log(`  ✓ ${eventRows.length} calendar events`);

  // ── Diary ────────────────────────────────────────────────────────────
  const diaryRows = [];
  for (let d = 0; d < 20; d++) {
    diaryRows.push({
      userId,
      title: rand(['Un buen día', 'Ocupado pero productivo', 'Me siento agradecido', 'Mañana difícil', 'Tarde tranquila']),
      content: 'Reflexionando sobre el día. Avancé en mis metas y pasé tiempo con las personas que quiero.',
      mood: 1 + Math.floor(Math.random() * 5),
      tags: [rand(['agradecido', 'cansado', 'motivado', 'tranquilo', 'estresado'])],
      date: iso(daysAgo(d * 2)),
    });
  }
  await db.insert(diaryEntries).values(diaryRows);
  console.log(`  ✓ ${diaryRows.length} diary entries`);

  // ── Notes ────────────────────────────────────────────────────────────
  const noteDefs = [
    { title: 'Ideas de proyectos', content: 'Crear un rastreador de hábitos, una app de presupuestos y una base de conocimiento personal con búsqueda semántica.', tags: ['ideas'], pinned: true },
    { title: 'Libros por leer', content: 'Hábitos Atómicos, Deep Work, El Almanaque de Naval Ravikant, Pensar rápido y despacio.', tags: ['lectura'], pinned: true },
    { title: 'Receta: pasta', content: 'Ajo, aceite de oliva, tomates cherry, albahaca, parmesano. Cocinar 8 minutos.', tags: ['cocina'], pinned: false },
    { title: 'Plan de entrenamiento', content: 'Rutina empuje/tirón/pierna. Enfócate en ejercicios compuestos: sentadilla, peso muerto, press de banca.', tags: ['fitness'], pinned: false },
    { title: 'Lista para viajar', content: 'Pasaporte, cargadores, adaptadores, medicamentos, itinerario, mapas sin conexión.', tags: ['viajes'], pinned: false },
    { title: 'Notas de reunión', content: 'Hablamos del plan del Q3, el plan de contratación y el nuevo modelo de precios del plan pro.', tags: ['trabajo'], pinned: false },
  ];
  await db.insert(notes).values(
    noteDefs.map((n) => ({
      userId,
      title: n.title,
      content: n.content,
      tags: n.tags,
      pinned: n.pinned,
      color: rand(['#1f2937', '#312e81', '#134e4a', '#713f12', '#7f1d1d']),
      embedding: embed(`${n.title}\n${n.content}`),
    })),
  );
  console.log(`  ✓ ${noteDefs.length} notes (with embeddings)`);

  // ── Health ───────────────────────────────────────────────────────────
  const healthRows = [];
  for (let d = 0; d < 14; d++) {
    const date = iso(daysAgo(d));
    healthRows.push(
      { userId, type: 'water' as const, value: (1.5 + Math.random() * 1.5).toFixed(2), unit: 'L', notes: null, date },
      { userId, type: 'sleep' as const, value: (6 + Math.random() * 2.5).toFixed(2), unit: 'hours', notes: null, date },
      { userId, type: 'weight' as const, value: (74 + Math.random() * 1.5).toFixed(2), unit: 'kg', notes: null, date },
    );
    if (Math.random() < 0.6) {
      healthRows.push({ userId, type: 'workout' as const, value: (20 + Math.random() * 45).toFixed(2), unit: 'min', notes: null, date });
    }
  }
  await db.insert(healthLogs).values(healthRows);
  console.log(`  ✓ ${healthRows.length} health logs`);

  console.log('\n✅ Seed complete!');
  console.log(`   Login with: ${DEMO_EMAIL} / ${DEMO_PASSWORD}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
