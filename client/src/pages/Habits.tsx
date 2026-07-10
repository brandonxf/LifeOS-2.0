import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import { Plus, Trash2, Flame, Target, Check, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Modal, Field, EmptyState, Card } from '../components/ui';
import { HabitIcon, HABIT_ICON_KEYS } from '../components/icons';
import { cn } from '../lib/utils';
import type { Habit, Goal } from '../lib/types';

const HEATMAP_DAYS = 119; // 17 weeks × 7

const GOAL_CATEGORY_LABELS: Record<string, string> = {
  personal: 'Personal', finance: 'Finanzas', health: 'Salud', work: 'Trabajo',
};

function Heatmap({ logs, color }: { logs: string[]; color: string }) {
  const set = new Set(logs);
  const today = new Date();
  const cells: { date: string; done: boolean }[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const d = subDays(today, i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ date: iso, done: set.has(iso) });
  }
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: 'minmax(0, 1fr)' }}>
      {cells.map((c) => (
        <div
          key={c.date}
          title={`${c.date}${c.done ? ' — hecho' : ''}`}
          className="aspect-square rounded-[3px]"
          style={{ backgroundColor: c.done ? color : 'rgba(148,163,184,0.15)' }}
        />
      ))}
    </div>
  );
}

function streak(logs: string[]): number {
  const set = new Set(logs);
  let count = 0;
  let cursor = new Date();
  if (!set.has(cursor.toISOString().slice(0, 10))) cursor = subDays(cursor, 1);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor = subDays(cursor, 1);
  }
  return count;
}

export default function Habits() {
  const qc = useQueryClient();
  const [habitModal, setHabitModal] = useState(false);
  const [goalModal, setGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const habits = useQuery({ queryKey: ['habits'], queryFn: () => api<Habit[]>('/api/habits') });
  const goals = useQuery({ queryKey: ['goals'], queryFn: () => api<Goal[]>('/api/goals') });

  const toggle = useMutation({
    mutationFn: (id: string) => api<{ done: boolean }>(`/api/habits/${id}/log`, { method: 'POST', body: { date: today } }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['habits'] });
      const prev = qc.getQueryData<Habit[]>(['habits']);
      qc.setQueryData<Habit[]>(['habits'], (old) =>
        old?.map((h) => h.id === id
          ? { ...h, logs: h.logs.includes(today) ? h.logs.filter((d) => d !== today) : [...h.logs, today] }
          : h),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['habits'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });

  const delHabit = useMutation({
    mutationFn: (id: string) => api(`/api/habits/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Hábito eliminado'); },
  });
  const delGoal = useMutation({
    mutationFn: (id: string) => api(`/api/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success('Meta eliminada'); },
  });

  return (
    <div className="space-y-8">
      {/* Today's checklist */}
      <div>
        <SectionTitle title="Hábitos" subtitle="Construye rachas, un día a la vez"
          action={<button onClick={() => setHabitModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nuevo hábito</button>} />

        {habits.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : !habits.data?.length ? (
          <EmptyState icon={Flame} title="Aún no hay hábitos" description="Agrega un hábito para empezar a registrar tus rachas."
            action={<button onClick={() => setHabitModal(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nuevo hábito</button>} />
        ) : (
          <>
            <Card className="mb-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-500">Checklist de hoy</h3>
              <div className="flex flex-wrap gap-2">
                {habits.data.map((h) => {
                  const done = h.logs.includes(today);
                  return (
                    <button key={h.id} onClick={() => toggle.mutate(h.id)}
                      className={cn('flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition', done ? 'border-transparent text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800')}
                      style={done ? { backgroundColor: h.color } : {}}>
                      <HabitIcon name={h.icon} className="h-4 w-4" style={done ? undefined : { color: h.color }} />
                      <span>{h.name}</span>
                      {done && <Check className="h-4 w-4" />}
                    </button>
                  );
                })}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {habits.data.map((h) => (
                <Card key={h.id}>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${h.color}22`, color: h.color }}>
                        <HabitIcon name={h.icon} className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{h.name}</h3>
                        {h.description && <p className="text-xs text-slate-400">{h.description}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Flame className="h-4 w-4" /> {streak(h.logs)}
                      </div>
                      <button onClick={() => delHabit.mutate(h.id)} className="text-slate-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <Heatmap logs={h.logs} color={h.color} />
                  <p className="mt-2 text-xs text-slate-400">{h.logs.length} veces completado · últimas 17 semanas</p>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Goals */}
      <div>
        <SectionTitle title="Metas" subtitle="Avanza hacia lo que te importa"
          action={<button onClick={() => { setEditingGoal(null); setGoalModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Nueva meta</button>} />

        {goals.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : !goals.data?.length ? (
          <EmptyState icon={Target} title="Aún no hay metas" description="Define una meta y sigue tu progreso." />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {goals.data.map((g) => {
              const pct = Math.min(100, Math.round((Number(g.currentValue) / Number(g.targetValue)) * 100));
              const daysLeft = g.deadline ? differenceInCalendarDays(parseISO(g.deadline), new Date()) : null;
              const completed = g.status === 'completed' || pct >= 100;
              return (
                <Card key={g.id} className="flex flex-col">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {completed ? <Trophy className="h-5 w-5 text-amber-500" /> : <Target className="h-5 w-5 text-primary" />}
                      <h3 className="font-semibold leading-tight">{g.title}</h3>
                    </div>
                    <button onClick={() => delGoal.mutate(g.id)} className="text-slate-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <span className="mb-3 inline-block w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{GOAL_CATEGORY_LABELS[g.category] ?? g.category}</span>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium">{Number(g.currentValue)} / {Number(g.targetValue)} {g.unit}</span>
                    <span className="text-slate-400">{pct}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={cn('h-2.5 rounded-full', completed ? 'bg-success' : 'bg-primary')} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    {daysLeft !== null ? (
                      <span className={cn('text-xs', daysLeft < 0 ? 'text-danger' : 'text-slate-400')}>
                        {daysLeft < 0 ? `${Math.abs(daysLeft)}d de retraso` : `faltan ${daysLeft}d`}
                      </span>
                    ) : <span />}
                    <button onClick={() => { setEditingGoal(g); setGoalModal(true); }} className="text-xs font-semibold text-primary hover:underline">Actualizar progreso</button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <HabitModal open={habitModal} onClose={() => setHabitModal(false)} />
      <GoalModal open={goalModal} onClose={() => setGoalModal(false)} editing={editingGoal} />
    </div>
  );
}

const HABIT_COLORS = ['#c4f82a', '#0d9488', '#f59e0b', '#22c55e', '#f43f5e', '#e879f9', '#a3e635'];

function HabitModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('flame');
  const [color, setColor] = useState('#c4f82a');

  useEffect(() => { if (open) { setName(''); setDescription(''); setIcon('flame'); setColor('#c4f82a'); } }, [open]);

  const save = useMutation({
    mutationFn: () => api('/api/habits', { method: 'POST', body: { name, description, icon, color } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success('Hábito creado'); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Nuevo hábito">
      <form onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return toast.error('El nombre es obligatorio'); save.mutate(); }} className="space-y-4">
        <Field label="Nombre"><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Ejercicio matutino" /></Field>
        <Field label="Descripción"><input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" /></Field>
        <Field label="Icono">
          <div className="flex flex-wrap gap-2">
            {HABIT_ICON_KEYS.map((i) => (
              <button key={i} type="button" onClick={() => setIcon(i)} className={cn('flex h-10 w-10 items-center justify-center rounded-xl border', icon === i ? 'border-primary bg-primary/10 text-primary' : 'text-slate-500')}>
                <HabitIcon name={i} className="h-5 w-5" />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Color">
          <div className="flex gap-2">
            {HABIT_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn('h-8 w-8 rounded-full ring-offset-2 dark:ring-offset-slate-900', color === c && 'ring-2 ring-primary')} style={{ backgroundColor: c }} />
            ))}
          </div>
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>Crear hábito</button>
      </form>
    </Modal>
  );
}

function GoalModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Goal | null }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('personal');
  const [targetValue, setTargetValue] = useState('100');
  const [currentValue, setCurrentValue] = useState('0');
  const [unit, setUnit] = useState('%');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? '');
      setCategory(editing?.category ?? 'personal');
      setTargetValue(editing ? String(editing.targetValue) : '100');
      setCurrentValue(editing ? String(editing.currentValue) : '0');
      setUnit(editing?.unit ?? '%');
      setDeadline(editing?.deadline ?? '');
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: () => {
      if (editing) {
        return api(`/api/goals/${editing.id}/progress`, { method: 'PATCH', body: { currentValue: Number(currentValue) } });
      }
      return api('/api/goals', {
        method: 'POST',
        body: { title, category, targetValue: Number(targetValue), currentValue: Number(currentValue), unit, deadline: deadline || null },
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); toast.success(editing ? 'Progreso actualizado' : 'Meta creada'); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Actualizar progreso' : 'Nueva meta'}>
      <form onSubmit={(e) => { e.preventDefault(); if (!editing && !title.trim()) return toast.error('El título es obligatorio'); save.mutate(); }} className="space-y-4">
        {!editing && (
          <>
            <Field label="Título"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ej. Ahorrar $10,000" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoría">
                <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="personal">Personal</option><option value="finance">Finanzas</option><option value="health">Salud</option><option value="work">Trabajo</option>
                </select>
              </Field>
              <Field label="Unidad"><input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} /></Field>
            </div>
            <Field label="Valor objetivo"><input className="input" type="number" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} /></Field>
            <Field label="Fecha límite"><input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
          </>
        )}
        <Field label={editing ? `Progreso actual (objetivo: ${Number(editing.targetValue)} ${editing.unit})` : 'Valor actual'}>
          <input className="input" type="number" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>{editing ? 'Guardar progreso' : 'Crear meta'}</button>
      </form>
    </Modal>
  );
}
