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
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { Card, SectionTitle, Skeleton, Modal, Field, EmptyState, StatTile } from '../components/ui';
import { cn, formatCurrency, formatCurrencyPrecise } from '../lib/utils';
import type { FinanceEntry, FinanceBudget, FinanceSummary } from '../lib/types';

const PIE_COLORS = ['#37e779', '#0d9488', '#f59e0b', '#f43f5e', '#22c55e', '#e879f9', '#a3e635', '#14b8a6'];
const CATEGORIES = ['Salario', 'Supermercado', 'Renta', 'Transporte', 'Restaurantes', 'Entretenimiento', 'Servicios', 'Salud', 'Compras', 'Otro'];

export default function Finance() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [budgetOpen, setBudgetOpen] = useState(false);
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
                <Bar dataKey="income" fill="#0D9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#DC2626" radius={[4, 4, 0, 0]} />
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
                  <p className="truncate text-sm font-medium">{e.description || e.category}</p>
                  <p className="truncate text-xs text-slate-400">{e.category} · {format(parseISO(e.date), 'MMM d, yyyy')}</p>
                </div>
                <span className={cn('shrink-0 whitespace-nowrap text-sm font-semibold', e.type === 'income' ? 'text-success' : 'text-slate-700 dark:text-slate-200')}>
                  {e.type === 'income' ? '+' : '−'}{formatCurrencyPrecise(Number(e.amount))}
                </span>
                <button onClick={() => { setEditing(e); setModalOpen(true); }} className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-primary">Editar</button>
                <button onClick={() => del.mutate(e.id)} className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:text-danger">
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
    </div>
  );
}

function EntryModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: FinanceEntry | null }) {
  const qc = useQueryClient();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Supermercado');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (open) {
      setType(editing?.type ?? 'expense');
      setAmount(editing ? String(editing.amount) : '');
      setCategory(editing?.category ?? 'Supermercado');
      setDescription(editing?.description ?? '');
      setDate(editing?.date ?? new Date().toISOString().slice(0, 10));
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

  return (
    <Modal open={open} onClose={onClose} title="Presupuestos mensuales">
      <div className="mb-4 space-y-2">
        {budgets.data?.map((b) => (
          <div key={b.id} className="flex items-center justify-between rounded-xl border px-3 py-2 text-sm">
            <span>{b.category}</span>
            <div className="flex items-center gap-3">
              <span className="font-medium">{formatCurrency(Number(b.limit))}</span>
              <button onClick={() => del.mutate(b.id)} className="text-slate-400 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
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
