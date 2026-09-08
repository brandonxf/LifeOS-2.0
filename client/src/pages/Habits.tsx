import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Plus, Trash2, Flame, Target, Trophy, ChevronDown, ChevronUp, X, Check, UserPlus, Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Modal, Field, EmptyState, Card, Avatar, FriendPickerModal } from '../components/ui';
import { ColorWheel } from '../components/ColorWheel';
import { HabitIcon, HABIT_ICON_KEYS } from '../components/icons';
import { useCompletionPulse, CompletionBurst, DrawnCheck } from '../components/AnimatedCheck';
import { cn } from '../lib/utils';
import type { Habit, Goal, GoalMilestone, HabitInvite, Friendship } from '../lib/types';
import { LIVE_FAST, LIVE_SLOW } from '../lib/live';
import { hapticSuccess, hapticTap } from '../lib/haptics';
import { confirm } from '../store/confirm';
import { bogotaISODate, shiftIsoDate } from '../lib/date';
import { currentStreak as streak } from '../lib/streak';

// Hitos de racha: al cruzarlos se celebra con un toast + haptic extra.
const STREAK_MILESTONES = [7, 14, 30, 60, 100, 365];

/** Insignia visual de logro según la racha actual y el total acumulado. */
function achievementBadge(streakCount: number, totalLogs: number): { label: string; emoji: string } | null {
  if (streakCount >= 100) return { label: '100 días seguidos', emoji: '👑' };
  if (streakCount >= 30) return { label: '30 días seguidos', emoji: '🏆' };
  if (streakCount >= 7) return { label: '7 días seguidos', emoji: '🔥' };
  if (totalLogs >= 100) return { label: '100 registros', emoji: '💯' };
  if (totalLogs >= 50) return { label: '50 registros', emoji: '⭐' };
  return null;
}

const HEATMAP_DAYS = 119; // 17 weeks × 7

const GOAL_CATEGORY_LABELS: Record<string, string> = {
  personal: 'Personal', finance: 'Finanzas', health: 'Salud', work: 'Trabajo',
};

/** `participantDates`: un arreglo de fechas por participante (dueño +
 *  miembros activos). Para un hábito solo trae un elemento (mis logs). Cada
 *  celda del día se rellena de abajo hacia arriba según qué fracción de
 *  los participantes lo completó ese día — así un hábito compartido no se
 *  ve "todo o nada" cuando solo una parte del equipo ya lo hizo hoy. */
function Heatmap({ participantDates, color }: { participantDates: string[][]; color: string }) {
  const sets = participantDates.map((d) => new Set(d));
  const total = sets.length || 1;
  const todayIso = bogotaISODate();
  const cells: { date: string; fraction: number }[] = [];
  for (let i = HEATMAP_DAYS - 1; i >= 0; i--) {
    const iso = shiftIsoDate(todayIso, -i);
    const count = sets.reduce((n, s) => n + (s.has(iso) ? 1 : 0), 0);
    cells.push({ date: iso, fraction: count / total });
  }
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ gridAutoColumns: 'minmax(0, 1fr)' }}>
      {cells.map((c) => (
        <div
          key={c.date}
          title={`${c.date}${c.fraction > 0 ? ` — ${Math.round(c.fraction * 100)}% del equipo` : ''}`}
          className="relative aspect-square overflow-hidden rounded-[3px] bg-[rgba(148,163,184,0.15)]"
        >
          {c.fraction > 0 && (
            <div className="absolute inset-x-0 bottom-0" style={{ height: `${c.fraction * 100}%`, backgroundColor: color }} />
          )}
        </div>
      ))}
    </div>
  );
}

function MilestoneRow({
  milestone,
  onToggle,
  onDelete,
}: {
  milestone: GoalMilestone;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const pulse = useCompletionPulse(milestone.done);
  return (
    <div className="group flex items-center gap-2 text-sm">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'relative flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
          milestone.done ? 'border-primary bg-primary text-ink-950' : 'border-slate-300 dark:border-slate-600',
        )}
      >
        <CompletionBurst show={pulse} />
        {milestone.done && <DrawnCheck className="h-3 w-3" />}
      </button>
      <span className={cn('min-w-0 flex-1 truncate', milestone.done && 'text-slate-400 line-through')}>{milestone.title}</span>
      <button onClick={onDelete} className="shrink-0 text-slate-300 opacity-0 hover:text-danger group-hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Checklist de hitos dentro de una tarjeta de meta: se puede expandir para
 *  ver/editar; colapsada solo muestra "2/5 hitos" para no saturar la vista. */
function GoalMilestones({ goalId }: { goalId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const milestones = useQuery({
    queryKey: ['goal-milestones', goalId],
    queryFn: () => api<GoalMilestone[]>(`/api/goals/${goalId}/milestones`),
  });

  const add = useMutation({
    mutationFn: (title: string) => api(`/api/goals/${goalId}/milestones`, { method: 'POST', body: { title } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goal-milestones', goalId] }); setTitle(''); },
  });
  const toggle = useMutation({
    mutationFn: (id: string) => api(`/api/goals/milestones/${id}/toggle`, { method: 'PATCH' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goal-milestones', goalId] }),
  });
  const del = useMutation({
    mutationFn: (id: string) => api(`/api/goals/milestones/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goal-milestones', goalId] }),
  });

  const done = milestones.data?.filter((m) => m.done).length ?? 0;
  const total = milestones.data?.length ?? 0;

  return (
    <div className="mt-3 border-t pt-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-xs font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
      >
        <span>Hitos {total > 0 && `· ${done}/${total}`}</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5">
          {milestones.data?.map((m) => (
            <MilestoneRow key={m.id} milestone={m} onToggle={() => toggle.mutate(m.id)} onDelete={() => del.mutate(m.id)} />
          ))}
          <form
            onSubmit={(e) => { e.preventDefault(); if (title.trim()) add.mutate(title.trim()); }}
            className="flex items-center gap-2 pt-1"
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nuevo hito…"
              className="input h-8 flex-1 py-1 text-xs"
            />
            <button type="submit" className="shrink-0 text-slate-400 hover:text-primary"><Plus className="h-4 w-4" /></button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Insignia de racha con fueguito: fondo dorado como antes; el contorno
 *  del fueguito ya se ve ámbar en reposo y, al completar el hábito de hoy,
 *  se rellena de amarillo pleno de abajo hacia arriba (solo el ícono, el
 *  número se mantiene igual) — nunca anima si ya cargó completo. */
function StreakFlameBadge({ streakCount, done }: { streakCount: number; done: boolean }) {
  const pulse = useCompletionPulse(done);
  return (
    <div className="relative flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
      <CompletionBurst show={pulse} color="#f59e0b" />
      <span className="relative inline-flex h-4 w-4 shrink-0">
        <Flame className="absolute inset-0 h-4 w-4" />
        <Flame className={cn('flame-fill absolute inset-0 h-4 w-4 fill-amber-400 text-amber-400', done && 'flame-fill-done')} />
      </span>
      <span>{streakCount}</span>
    </div>
  );
}

function HabitChecklistButton({ habit, done, onToggle }: { habit: Habit; done: boolean; onToggle: () => void }) {
  const pulse = useCompletionPulse(done);
  return (
    <button
      onClick={onToggle}
      className={cn(
        'relative flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
        done ? 'border-transparent text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
      )}
      style={done ? { backgroundColor: habit.color } : {}}
    >
      <CompletionBurst show={pulse} color={habit.color} />
      <HabitIcon name={habit.icon} className="h-4 w-4" style={done ? undefined : { color: habit.color }} />
      <span>{habit.name}</span>
      {done && <DrawnCheck className="h-4 w-4" />}
    </button>
  );
}

export default function Habits() {
  const qc = useQueryClient();
  const [habitModal, setHabitModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [goalModal, setGoalModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [inviteHabit, setInviteHabit] = useState<Habit | null>(null);
  const today = bogotaISODate();

  const habits = useQuery({ queryKey: ['habits'], queryFn: () => api<Habit[]>('/api/habits'), ...LIVE_FAST });
  const goals = useQuery({ queryKey: ['goals'], queryFn: () => api<Goal[]>('/api/goals') });
  const friends = useQuery({ queryKey: ['friends'], queryFn: () => api<Friendship[]>('/api/friends'), ...LIVE_SLOW });
  const invites = useQuery({ queryKey: ['habits', 'invites'], queryFn: () => api<HabitInvite[]>('/api/habits/invites'), ...LIVE_SLOW });

  const acceptInvite = useMutation({
    mutationFn: (id: string) => api(`/api/habits/invites/${id}/accept`, { method: 'POST' }),
    onSuccess: () => {
      toast.success('¡Te uniste al hábito!');
      qc.invalidateQueries({ queryKey: ['habits'] });
      qc.invalidateQueries({ queryKey: ['habits', 'invites'] });
    },
    onError: (e: any) => toast.error(e.message),
  });
  const declineInvite = useMutation({
    mutationFn: (id: string) => api(`/api/habits/invites/${id}/decline`, { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits', 'invites'] }),
    onError: (e: any) => toast.error(e.message),
  });
  const invite = useMutation({
    mutationFn: ({ habitId, friendId }: { habitId: string; friendId: string }) =>
      api(`/api/habits/${habitId}/invite`, { method: 'POST', body: { friendId } }),
    onSuccess: () => {
      toast.success('Invitación enviada');
      setInviteHabit(null);
      qc.invalidateQueries({ queryKey: ['habits'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

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

  async function confirmDeleteHabit(h: Habit) {
    const ok = await confirm({
      title: 'Eliminar hábito',
      message: `¿Seguro que quieres eliminar "${h.name}"? Perderás su historial de rachas.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) delHabit.mutate(h.id);
  }

  async function confirmDeleteGoal(g: Goal) {
    const ok = await confirm({
      title: 'Eliminar meta',
      message: `¿Seguro que quieres eliminar "${g.title}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) delGoal.mutate(g.id);
  }

  return (
    <div className="space-y-8">
      {/* Today's checklist */}
      <div>
        <SectionTitle title="Hábitos" subtitle="Construye rachas, un día a la vez"
          action={<button onClick={() => { setEditingHabit(null); setHabitModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Nuevo hábito</button>} />

        {(invites.data?.length ?? 0) > 0 && (
          <Card className="mb-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-500">Invitaciones a hábitos</h3>
            <div className="divide-y">
              {invites.data!.map((inv) => (
                <div key={inv.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${inv.habit.color}22`, color: inv.habit.color }}>
                    <HabitIcon name={inv.habit.icon} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{inv.habit.name}</p>
                    <p className="text-xs text-slate-400">Invitación de {inv.invitedBy.name}</p>
                  </div>
                  <button onClick={() => acceptInvite.mutate(inv.id)} className="rounded-lg p-1.5 text-success hover:bg-success/10" aria-label="Aceptar">
                    <Check className="h-4 w-4" />
                  </button>
                  <button onClick={() => declineInvite.mutate(inv.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-danger" aria-label="Rechazar">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {habits.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}</div>
        ) : !habits.data?.length ? (
          <EmptyState icon={Flame} title="Aún no hay hábitos" description="Agrega un hábito para empezar a registrar tus rachas."
            action={<button onClick={() => { setEditingHabit(null); setHabitModal(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Nuevo hábito</button>} />
        ) : (
          <>
            <Card className="mb-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-500">Checklist de hoy</h3>
              <div className="flex flex-wrap gap-2">
                {habits.data.map((h) => {
                  const done = h.logs.includes(today);
                  function onToggle() {
                    if (!done) {
                      hapticSuccess();
                      const before = streak(h.logs);
                      const after = streak([...h.logs, today]);
                      const hit = STREAK_MILESTONES.find((m) => after === m && before < m);
                      if (hit) toast.success(`🔥 ¡${hit} días de racha en ${h.name}!`, { duration: 4000 });
                    } else {
                      hapticTap();
                    }
                    toggle.mutate(h.id);
                  }
                  return <HabitChecklistButton key={h.id} habit={h} done={done} onToggle={onToggle} />;
                })}
              </div>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {habits.data.map((h) => {
                const badge = achievementBadge(streak(h.logs), h.logs.length);
                return (
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
                        {h.isOwner && (
                          <button onClick={() => { setEditingHabit(h); setHabitModal(true); }} className="text-slate-300 hover:text-primary" aria-label="Editar hábito">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        {h.isOwner && (
                          <button onClick={() => setInviteHabit(h)} className="text-slate-300 hover:text-primary" aria-label="Invitar amigo">
                            <UserPlus className="h-4 w-4" />
                          </button>
                        )}
                        {h.isOwner && (
                          <button onClick={() => confirmDeleteHabit(h)} className="text-slate-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </div>
                    {badge && (
                      <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        <span>{badge.emoji}</span> {badge.label}
                      </span>
                    )}
                    <Heatmap
                      color={h.color}
                      participantDates={h.members?.length ? h.members.map((m) => m.dates) : [h.logs]}
                    />
                    <p className="mt-2 text-xs text-slate-400">{h.logs.length} veces completado · últimas 17 semanas</p>
                    {(h.members?.length ?? 0) > 0 ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                        <div className="flex flex-wrap items-center gap-3">
                          {h.members!.map((m) => (
                            <div key={m.id} className="flex items-center gap-1.5" title={`${m.name} · racha de ${m.streak}`}>
                              <div className={cn('rounded-full', m.doneToday && 'ring-2 ring-success ring-offset-2 dark:ring-offset-slate-900')}>
                                <Avatar name={m.name} avatar={m.avatar} size={28} />
                              </div>
                              <span className="flex items-center gap-0.5 text-xs font-medium text-slate-500">
                                <Flame className="h-3 w-3 text-amber-500" /> {m.streak}
                              </span>
                            </div>
                          ))}
                        </div>
                        <StreakFlameBadge streakCount={streak(h.logs)} done={h.logs.includes(today)} />
                      </div>
                    ) : (
                      <div className="mt-3 flex justify-end">
                        <StreakFlameBadge streakCount={streak(h.logs)} done={h.logs.includes(today)} />
                      </div>
                    )}
                  </Card>
                );
              })}
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
                    <button onClick={() => confirmDeleteGoal(g)} className="text-slate-300 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
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
                  <GoalMilestones goalId={g.id} />
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <HabitModal open={habitModal} onClose={() => setHabitModal(false)} editing={editingHabit} />
      <GoalModal open={goalModal} onClose={() => setGoalModal(false)} editing={editingGoal} />
      <InviteModal
        habit={inviteHabit}
        friends={friends.data ?? []}
        onClose={() => setInviteHabit(null)}
        onInvite={(friendId) => invite.mutate({ habitId: inviteHabit!.id, friendId })}
        pending={invite.isPending}
      />
    </div>
  );
}

function InviteModal({
  habit, friends, onClose, onInvite, pending,
}: {
  habit: Habit | null;
  friends: Friendship[];
  onClose: () => void;
  onInvite: (friendId: string) => void;
  pending: boolean;
}) {
  const memberIds = new Set((habit?.members ?? []).map((m) => m.id));
  const candidates = friends.filter((f) => !memberIds.has(f.friend.id)).map((f) => f.friend);

  return (
    <FriendPickerModal
      open={!!habit}
      title={habit ? `Invitar a "${habit.name}"` : ''}
      candidates={candidates}
      onClose={onClose}
      onPick={onInvite}
      pending={pending}
      emptyMessage={friends.length ? 'Ya invitaste a todos tus amigos a este hábito.' : 'Agrega amigos primero desde la sección Amigos.'}
    />
  );
}

const HABIT_COLORS = ['#37e779', '#0d9488', '#f59e0b', '#22c55e', '#f43f5e', '#e879f9', '#a3e635'];

function HabitModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Habit | null }) {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('flame');
  const [color, setColor] = useState('#37e779');
  const [shareProgress, setShareProgress] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setDescription(editing?.description ?? '');
      setIcon(editing?.icon ?? 'flame');
      setColor(editing?.color ?? '#37e779');
      setShareProgress(editing?.shareProgress ?? false);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: () => {
      const body = { name, description, icon, color, shareProgress };
      return editing
        ? api(`/api/habits/${editing.id}`, { method: 'PUT', body })
        : api('/api/habits', { method: 'POST', body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['habits'] }); toast.success(editing ? 'Hábito actualizado' : 'Hábito creado'); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar hábito' : 'Nuevo hábito'}>
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
          <div className="flex flex-wrap gap-2">
            {HABIT_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn('h-8 w-8 rounded-full ring-offset-2 dark:ring-offset-slate-900', color === c && 'ring-2 ring-primary')} style={{ backgroundColor: c }} />
            ))}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              aria-label="Color personalizado"
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full ring-offset-2 dark:ring-offset-slate-900',
                !HABIT_COLORS.includes(color) ? 'ring-2 ring-primary' : 'border-2 border-dashed border-slate-300 dark:border-white/20',
              )}
              style={
                !HABIT_COLORS.includes(color)
                  ? { backgroundColor: color }
                  : { background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }
              }
            >
              {HABIT_COLORS.includes(color) && <Plus className="h-3.5 w-3.5 text-white drop-shadow" />}
            </button>
          </div>
        </Field>
        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-sm">
          <input type="checkbox" checked={shareProgress} onChange={(e) => setShareProgress(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary" />
          <span>
            <span className="font-medium">Compartir mi progreso con mis amigos</span>
            <span className="mt-0.5 block text-xs text-slate-400">Tus check-ins aparecen en el feed de tus amigos, aunque no los invites a este hábito.</span>
          </span>
        </label>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>{editing ? 'Guardar cambios' : 'Crear hábito'}</button>
      </form>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Color personalizado">
        <ColorWheel initialValue={color} onChange={setColor} />
      </Modal>
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
