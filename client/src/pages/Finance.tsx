import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown, Repeat, Pause, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useSettings } from '../store/settings';
import { Card, SectionTitle, Skeleton, Modal, Field, EmptyState, StatTile } from '../components/ui';
import { cn, formatCurrency, formatCurrencyPrecise } from '../lib/utils';
import { confirm } from '../store/confirm';
import { bogotaISODate } from '../lib/date';
import type { FinanceEntry, FinanceBudget, FinanceSummary, FinanceRecurring } from '../lib/types';

const PIE_COLORS = ['#37e779', '#0d9488', '#f59e0b', '#f43f5e', '#22c55e', '#e879f9', '#a3e635', '#14b8a6'];
const CATEGORIES = ['Salario', 'Supermercado', 'Renta', 'Transporte', 'Restaurantes', 'Entretenimiento', 'Servicios', 'Salud', 'Compras', 'Otro'];
const FREQUENCY_LABELS: Record<string, string> = { weekly: 'Semanal', monthly: 'Mensual', yearly: 'Anual' };

export default function Finance() {
  const qc = useQueryClient();
  const performanceModeEnabled = useSettings((s) => s.performanceModeEnabled);
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceEntry | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const entries = useQuery({
    queryKey: ['finance', 'entries', filterType, filterCat],
    queryFn: () => api<FinanceEntry[]>('/api/finance/entries', { query: { type: filterType, category: filterCat } }),
  });
  const summary = useQuery({ queryKey: ['finance', 'summary'], queryFn: () => api<FinanceSummary>('/api/finance/summary') });
  const budgets = useQuery({ queryKey: ['finance', 'budgets'], queryFn: () => api<FinanceBudget[]>('/api/finance/budgets') });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/finance/entries/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Movimiento eliminado');
    },
  });

  async function confirmDeleteEntry(e: FinanceEntry) {
    const ok = await confirm({
      title: 'Eliminar movimiento',
      message: `¿Seguro que quieres eliminar "${e.description || e.category}"?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) del.mutate(e.id);
  }

  const spentByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries.data ?? []) {
      if (e.type === 'expense') map[e.category] = (map[e.category] ?? 0) + Number(e.amount);
    }
    return map;
  }, [entries.data]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Finanzas"
        subtitle="Controla ingresos, gastos y presupuestos"
        action={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRecurringOpen(true)} className="btn-ghost border"><Repeat className="h-4 w-4" /> Recurrentes</button>
            <button onClick={() => setBudgetOpen(true)} className="btn-ghost border">Presupuestos</button>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary">
              <Plus className="h-4 w-4" /> Movimiento
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {summary.isLoading ? (
          <>
            <Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" />
          </>
        ) : (
          <>
            <StatTile label="Ingresos" value={formatCurrency(summary.data?.totalIncome ?? 0)} accent="text-success" />
            <StatTile label="Gastos" value={formatCurrency(summary.data?.totalExpenses ?? 0)} accent="text-danger" />
            <StatTile label="Balance" value={formatCurrency(summary.data?.balance ?? 0)} accent="text-primary" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-4 font-semibold">Ingresos vs Gastos</h3>
          {summary.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : summary.data?.monthly.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={summary.data.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Bar dataKey="income" fill="#0D9488" radius={[4, 4, 0, 0]} isAnimationActive={!performanceModeEnabled} />
                <Bar dataKey="expenses" fill="#DC2626" radius={[4, 4, 0, 0]} isAnimationActive={!performanceModeEnabled} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">Aún no hay datos</p>
          )}
        </Card>

        <Card>
          <h3 className="mb-4 font-semibold">Gastos por categoría</h3>
          {summary.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : summary.data?.topCategories.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={summary.data.topCategories}
                  dataKey="total"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  isAnimationActive={!performanceModeEnabled}
                >
                  {summary.data.topCategories.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-16 text-center text-sm text-slate-400">Aún no hay gastos</p>
          )}
        </Card>
      </div>

      {/* Budgets */}
      {(budgets.data?.length ?? 0) > 0 && (
        <Card>
          <h3 className="mb-4 font-semibold">Seguimiento de presupuestos</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {budgets.data!.map((b) => {
              const spent = spentByCategory[b.category] ?? 0;
              const limit = Number(b.limit);
              const pct = Math.min(100, Math.round((spent / limit) * 100));
              const over = spent > limit;
              return (
                <div key={b.id} className="rounded-xl border p-3">
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{b.category}</span>
                    <span className={cn(over && 'text-danger')}>{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={cn('h-2 rounded-full', over ? 'bg-danger' : 'bg-success')} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatCurrency(spent)} / {formatCurrency(limit)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Movimientos</h3>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <select className="input w-full sm:w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="income">Ingreso</option>
              <option value="expense">Gasto</option>
            </select>
            <select className="input w-full sm:w-auto" value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
              <option value="">Todas las categorías</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {entries.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : entries.data?.length ? (
          <div className="divide-y">
            {entries.data.map((e) => (
              <div key={e.id} className="flex items-center gap-3 py-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', e.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                  {e.type === 'income' ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {e.description || e.category}
                    {e.recurringId && <Repeat className="h-3 w-3 shrink-0 text-slate-400" />}
                  </p>
                  <p className="truncate text-xs text-slate-400">{e.category} · {format(parseISO(e.date), 'MMM d, yyyy')}</p>
                </div>
                <span className={cn('shrink-0 whitespace-nowrap text-sm font-semibold', e.type === 'income' ? 'text-success' : 'text-slate-700 dark:text-slate-200')}>
                  {e.type === 'income' ? '+' : '−'}{formatCurrencyPrecise(Number(e.amount))}
                </span>
                <button onClick={() => { setEditing(e); setModalOpen(true); }} className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-primary">Editar</button>
                <button onClick={() => confirmDeleteEntry(e)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-danger">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Wallet} title="Sin movimientos" description="Agrega tu primer ingreso o gasto para empezar." />
        )}
      </Card>

      <EntryModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
      <BudgetModal open={budgetOpen} onClose={() => setBudgetOpen(false)} />
      <RecurringModal open={recurringOpen} onClose={() => setRecurringOpen(false)} />
    </div>
  );
}

function EntryModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: FinanceEntry | null }) {
  const qc = useQueryClient();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Supermercado');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(bogotaISODate());

  useEffect(() => {
    if (open) {
      setType(editing?.type ?? 'expense');
      setAmount(editing ? String(editing.amount) : '');
      setCategory(editing?.category ?? 'Supermercado');
      setDescription(editing?.description ?? '');
      setDate(editing?.date ?? bogotaISODate());
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: () => {
      const body = { type, amount: Number(amount), category, description, date };
      return editing
        ? api(`/api/finance/entries/${editing.id}`, { method: 'PUT', body })
        : api('/api/finance/entries', { method: 'POST', body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance'] });
      toast.success(editing ? 'Movimiento actualizado' : 'Movimiento agregado');
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar movimiento' : 'Nuevo movimiento'}>
      <form onSubmit={(e) => { e.preventDefault(); if (!amount) return toast.error('Ingresa un monto'); save.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn('rounded-xl border py-2 text-sm font-semibold', type === t ? 'border-primary bg-primary/10 text-primary' : 'text-slate-500')}>
              {t === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
        <Field label="Monto"><input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></Field>
        <Field label="Categoría">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Descripción"><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" /></Field>
        <Field label="Fecha"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>{editing ? 'Guardar cambios' : 'Agregar movimiento'}</button>
      </form>
    </Modal>
  );
}

function BudgetModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const budgets = useQuery({ queryKey: ['finance', 'budgets'], queryFn: () => api<FinanceBudget[]>('/api/finance/budgets'), enabled: open });
  const [category, setCategory] = useState('Supermercado');
  const [limit, setLimit] = useState('');

  const add = useMutation({
    mutationFn: () => api('/api/finance/budgets', { method: 'POST', body: { category, limit: Number(limit), period: 'monthly' } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance', 'budgets'] }); setLimit(''); toast.success('Presupuesto agregado'); },
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/api/finance/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'budgets'] }),
  });

  async function confirmDeleteBudget(b: FinanceBudget) {
    const ok = await confirm({
      title: 'Eliminar presupuesto',
      message: `¿Seguro que quieres eliminar el presupuesto de "${b.category}"?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) del.mutate(b.id);
  }

  return (
    <Modal open={open} onClose={onClose} title="Presupuestos mensuales">
      <div className="mb-4 space-y-2">
        {budgets.data?.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
            <span>{b.category}</span>
            <div className="flex items-center gap-3">
              <span className="font-medium">{formatCurrency(Number(b.limit))}</span>
              <button onClick={() => confirmDeleteBudget(b)} className="text-slate-400 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
        {!budgets.data?.length && <p className="text-sm text-slate-400">Sin presupuestos definidos.</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); if (!limit) return; add.mutate(); }} className="flex gap-2">
        <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <input className="input" type="number" placeholder="Límite" value={limit} onChange={(e) => setLimit(e.target.value)} />
        <button className="btn-primary shrink-0"><Plus className="h-4 w-4" /></button>
      </form>
    </Modal>
  );
}

function RecurringModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const recurring = useQuery({
    queryKey: ['finance', 'recurring'],
    queryFn: () => api<FinanceRecurring[]>('/api/finance/recurring'),
    enabled: open,
  });

  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Servicios');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(bogotaISODate());

  const add = useMutation({
    mutationFn: () =>
      api('/api/finance/recurring', {
        method: 'POST',
        body: { type, amount: Number(amount), category, description, frequency, startDate },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance'] });
      setAmount('');
      setDescription('');
      toast.success('Transacción recurrente creada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      api(`/api/finance/recurring/${id}/active`, { method: 'PATCH', body: { active } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance'] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/finance/recurring/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['finance'] }); toast.success('Recurrente eliminada'); },
  });

  async function confirmDeleteRecurring(r: FinanceRecurring) {
    const ok = await confirm({
      title: 'Eliminar recurrente',
      message: `¿Seguro que quieres eliminar "${r.description || r.category}"? Dejará de generar movimientos.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) del.mutate(r.id);
  }

  return (
    <Modal open={open} onClose={onClose} title="Transacciones recurrentes" wide>
      <p className="mb-4 text-sm text-slate-400">
        Suscripciones, sueldo, renta… se generan solas como movimientos cada vez que abras la app.
      </p>
      <div className="mb-5 space-y-2">
        {recurring.data?.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-sm font-medium', !r.active && 'text-slate-400 line-through')}>
                {r.description || r.category}
              </p>
              <p className="text-xs text-slate-400">
                {r.category} · {FREQUENCY_LABELS[r.frequency]} · {r.type === 'income' ? '+' : '−'}{formatCurrency(Number(r.amount))}
              </p>
            </div>
            <button
              onClick={() => toggleActive.mutate({ id: r.id, active: !r.active })}
              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-primary"
              title={r.active ? 'Pausar' : 'Reanudar'}
            >
              {r.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button onClick={() => confirmDeleteRecurring(r)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-danger">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {!recurring.isLoading && !recurring.data?.length && (
          <p className="text-sm text-slate-400">Sin transacciones recurrentes definidas.</p>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (!amount) return toast.error('Ingresa un monto'); add.mutate(); }} className="space-y-4 border-t pt-4">
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setType(t)}
              className={cn('rounded-xl border py-2 text-sm font-semibold', type === t ? 'border-primary bg-primary/10 text-primary' : 'text-slate-500')}>
              {t === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Monto"><input className="input" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></Field>
          <Field label="Frecuencia">
            <select className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as any)}>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </Field>
        </div>
        <Field label="Categoría">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Descripción"><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ej. Netflix" /></Field>
        <Field label="Empieza el"><input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
        <button type="submit" className="btn-primary w-full" disabled={add.isPending}>Crear recurrente</button>
      </form>
    </Modal>
  );
}
