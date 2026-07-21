import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Wallet, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { Modal, Field } from './ui';
import { cn } from '../lib/utils';

const CATEGORIES = ['Salario', 'Supermercado', 'Renta', 'Transporte', 'Restaurantes', 'Entretenimiento', 'Servicios', 'Salud', 'Compras', 'Otro'];

type Sheet = null | 'expense' | 'task';

/** Agregado rápido global: permite registrar un gasto/ingreso o una tarea
 *  desde cualquier pantalla, sin navegar al módulo. */
export function QuickAdd() {
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setMenu((o) => !o)}
          aria-label="Agregar rápido"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
        >
          <Plus className="h-5 w-5" />
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
            <div className="glass-menu fixed inset-x-4 top-16 z-20 mx-auto w-auto max-w-xs animate-fade-in rounded-2xl border bg-white p-2 shadow-xl dark:bg-ink-900/85 dark:backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-52 sm:max-w-none">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Agregar</p>
              <button
                onClick={() => { setMenu(false); setSheet('expense'); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              >
                <Wallet className="h-4 w-4 opacity-70" /> Nuevo movimiento
              </button>
              <button
                onClick={() => { setMenu(false); setSheet('task'); }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
              >
                <CheckSquare className="h-4 w-4 opacity-70" /> Nueva tarea
              </button>
            </div>
          </>
        )}
      </div>

      <QuickExpense open={sheet === 'expense'} onClose={() => setSheet(null)} />
      <QuickTask open={sheet === 'task'} onClose={() => setSheet(null)} />
    </>
  );
}

function QuickExpense({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Supermercado');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  function reset() {
    setType('expense'); setAmount(''); setCategory('Supermercado'); setDescription('');
    setDate(new Date().toISOString().slice(0, 10));
  }

  const save = useMutation({
    mutationFn: () => api('/api/finance/entries', {
      method: 'POST',
      body: { type, amount: Number(amount), category, description, date },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Movimiento agregado');
      reset();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Nuevo movimiento">
      <form
        onSubmit={(e) => { e.preventDefault(); if (!amount || Number(amount) <= 0) return toast.error('Ingresa un monto válido'); save.mutate(); }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                'rounded-xl border px-3 py-2 text-sm font-medium transition',
                type === t ? 'border-primary bg-primary/10 text-primary' : 'border-white/10 text-slate-400',
              )}
            >
              {t === 'expense' ? 'Gasto' : 'Ingreso'}
            </button>
          ))}
        </div>
        <Field label="Monto">
          <input className="input" type="number" inputMode="decimal" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" autoFocus />
        </Field>
        <Field label="Categoría">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Descripción (opcional)">
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej. café con el equipo" />
        </Field>
        <Field label="Fecha">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>
          {save.isPending ? 'Guardando…' : 'Agregar'}
        </button>
      </form>
    </Modal>
  );
}

function QuickTask({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');

  function reset() { setTitle(''); setPriority('medium'); setDueDate(''); }

  const save = useMutation({
    mutationFn: () => api('/api/tasks', {
      method: 'POST',
      body: {
        title,
        description: '',
        priority,
        status: 'todo',
        tags: [],
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      },
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Tarea creada');
      reset();
      onClose();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Nueva tarea">
      <form
        onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return toast.error('El título es obligatorio'); save.mutate(); }}
        className="space-y-4"
      >
        <Field label="Título">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" autoFocus />
        </Field>
        <Field label="Prioridad">
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </Field>
        <Field label="Fecha límite (opcional)">
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>
          {save.isPending ? 'Guardando…' : 'Crear tarea'}
        </button>
      </form>
    </Modal>
  );
}
