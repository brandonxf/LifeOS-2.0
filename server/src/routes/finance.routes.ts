import { Router } from 'express';
import { z } from 'zod';
import { and, desc, eq, gte, isNull, lte } from 'drizzle-orm';
import { db } from '../db/index.js';
import { financeEntries, financeBudgets } from '../db/schema/index.js';
import { asyncHandler, notFound, validate } from '../lib/http.js';
import { currentUser } from '../middleware/auth.js';

const router = Router();

const entrySchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  category: z.string().min(1),
  description: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const budgetSchema = z.object({
  category: z.string().min(1),
  limit: z.number().positive(),
  period: z.enum(['monthly', 'weekly', 'yearly']).default('monthly'),
});

// ── Entries ────────────────────────────────────────────────────────────
router.get(
  '/entries',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const { type, category, start, end } = req.query as Record<string, string>;
    const conds = [eq(financeEntries.userId, user.id), isNull(financeEntries.deletedAt)];
    if (type === 'income' || type === 'expense') conds.push(eq(financeEntries.type, type));
    if (category) conds.push(eq(financeEntries.category, category));
    if (start) conds.push(gte(financeEntries.date, start));
    if (end) conds.push(lte(financeEntries.date, end));

    const rows = await db
      .select()
      .from(financeEntries)
      .where(and(...conds))
      .orderBy(desc(financeEntries.date));
    res.json(rows);
  }),
);

router.post(
  '/entries',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(entrySchema, req.body);
    const [row] = await db
      .insert(financeEntries)
      .values({
        userId: user.id,
        type: body.type,
        amount: body.amount.toFixed(2),
        category: body.category,
        description: body.description ?? null,
        date: body.date,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.put(
  '/entries/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(entrySchema.partial(), req.body);
    const [row] = await db
      .update(financeEntries)
      .set({
        ...(body.type && { type: body.type }),
        ...(body.amount !== undefined && { amount: body.amount.toFixed(2) }),
        ...(body.category && { category: body.category }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.date && { date: body.date }),
      })
      .where(and(eq(financeEntries.id, req.params.id), eq(financeEntries.userId, user.id)))
      .returning();
    if (!row) throw notFound('Entry not found');
    res.json(row);
  }),
);

router.delete(
  '/entries/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(financeEntries)
      .set({ deletedAt: new Date() })
      .where(and(eq(financeEntries.id, req.params.id), eq(financeEntries.userId, user.id)))
      .returning();
    if (!row) throw notFound('Entry not found');
    res.json({ ok: true });
  }),
);

// ── Budgets ────────────────────────────────────────────────────────────
router.get(
  '/budgets',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select()
      .from(financeBudgets)
      .where(and(eq(financeBudgets.userId, user.id), isNull(financeBudgets.deletedAt)));
    res.json(rows);
  }),
);

router.post(
  '/budgets',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const body = validate(budgetSchema, req.body);
    const [row] = await db
      .insert(financeBudgets)
      .values({
        userId: user.id,
        category: body.category,
        limit: body.limit.toFixed(2),
        period: body.period,
      })
      .returning();
    res.status(201).json(row);
  }),
);

router.delete(
  '/budgets/:id',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const [row] = await db
      .update(financeBudgets)
      .set({ deletedAt: new Date() })
      .where(and(eq(financeBudgets.id, req.params.id), eq(financeBudgets.userId, user.id)))
      .returning();
    if (!row) throw notFound('Budget not found');
    res.json({ ok: true });
  }),
);

// ── Summary ────────────────────────────────────────────────────────────
router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const user = currentUser(req);
    const rows = await db
      .select()
      .from(financeEntries)
      .where(and(eq(financeEntries.userId, user.id), isNull(financeEntries.deletedAt)));

    let income = 0;
    let expenses = 0;
    const byCategory: Record<string, number> = {};
    const byMonth: Record<string, { income: number; expenses: number }> = {};

    for (const e of rows) {
      const amt = Number(e.amount);
      const month = e.date.slice(0, 7);
      byMonth[month] ??= { income: 0, expenses: 0 };
      if (e.type === 'income') {
        income += amt;
        byMonth[month].income += amt;
      } else {
        expenses += amt;
        byMonth[month].expenses += amt;
        byCategory[e.category] = (byCategory[e.category] ?? 0) + amt;
      }
    }

    const topCategories = Object.entries(byCategory)
      .map(([category, total]) => ({ category, total: Math.round(total * 100) / 100 }))
      .sort((a, b) => b.total - a.total);

    const monthly = Object.entries(byMonth)
      .map(([month, v]) => ({
        month,
        income: Math.round(v.income * 100) / 100,
        expenses: Math.round(v.expenses * 100) / 100,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      totalIncome: Math.round(income * 100) / 100,
      totalExpenses: Math.round(expenses * 100) / 100,
      balance: Math.round((income - expenses) * 100) / 100,
      topCategories,
      monthly,
    });
  }),
);

export default router;
