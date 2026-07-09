import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  Cell,
  XAxis,
  Tooltip,
} from 'recharts';
import { format, isToday, isPast, parseISO } from 'date-fns';
import { Wallet, CheckSquare, Flame, Target, Calendar as CalIcon, HeartPulse, ArrowRight, Send } from 'lucide-react';
import { AiMark } from '../components/Brand';
import { api } from '../lib/api';
import { useAuth } from '../store/auth';
import { Card, Skeleton } from '../components/ui';
import { cn, formatCurrency } from '../lib/utils';
import type { FinanceSummary, Task, Habit, Goal, CalendarEvent, HealthSummary } from '../lib/types';

function WidgetShell({ title, icon: Icon, to, children }: { title: string; icon: any; to: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="font-semibold">{title}</h3>
        </div>
        <Link to={to} className="text-slate-400 hover:text-primary">
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

export default function Dashboard() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');

  const finance = useQuery({ queryKey: ['finance', 'summary'], queryFn: () => api<FinanceSummary>('/api/finance/summary') });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => api<Task[]>('/api/tasks') });
  const habits = useQuery({ queryKey: ['habits'], queryFn: () => api<Habit[]>('/api/habits') });
  const goals = useQuery({ queryKey: ['goals'], queryFn: () => api<Goal[]>('/api/goals') });
  const events = useQuery({ queryKey: ['events'], queryFn: () => api<CalendarEvent[]>('/api/calendar/events') });
  const health = useQuery({ queryKey: ['health', 'summary'], queryFn: () => api<HealthSummary>('/api/health/summary') });

  const today = new Date().toISOString().slice(0, 10);

  const taskStats = useMemo(() => {
    const list = tasks.data ?? [];
    const active = list.filter((t) => t.status !== 'done');
    const overdue = active.filter((t) => t.dueDate && isPast(parseISO(t.dueDate)) && !isToday(parseISO(t.dueDate)));
    const dueToday = active.filter((t) => t.dueDate && isToday(parseISO(t.dueDate)));
    const upcoming = active
      .filter((t) => t.dueDate && !isPast(parseISO(t.dueDate)))
      .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
      .slice(0, 3);
    return { overdue: overdue.length, dueToday, upcoming };
  }, [tasks.data]);

  const habitRing = useMemo(() => {
    const list = habits.data ?? [];
    if (!list.length) return { pct: 0, done: 0, total: 0 };
    const done = list.filter((h) => h.logs.includes(today)).length;
    return { pct: Math.round((done / list.length) * 100), done, total: list.length };
  }, [habits.data, today]);

  const upcomingEvents = useMemo(
    () =>
      (events.data ?? [])
        .filter((e) => new Date(e.startTime) >= new Date(Date.now() - 3600_000))
        .sort((a, b) => (a.startTime < b.startTime ? -1 : 1))
        .slice(0, 3),
    [events.data],
  );

  function submitPrompt(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    navigate('/ai', { state: { prompt } });
  }

  const ringDeg = habitRing.pct * 3.6;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-0.5 text-sm capitalize text-slate-500 dark:text-slate-400">{format(new Date(), "EEEE, d 'de' MMMM")}</p>
      </div>

      {/* Quick AI bar */}
      <form onSubmit={submitPrompt} className="flex items-center gap-2 rounded-2xl border bg-white p-2 shadow-sm dark:bg-slate-900">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <AiMark size={20} />
        </div>
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Pregúntale lo que sea a tu asistente de IA sobre tu vida…"
          className="flex-1 bg-transparent text-sm outline-none"
        />
        <button type="submit" className="btn-primary px-3 py-2">
          <Send className="h-4 w-4" />
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Finance */}
        <WidgetShell title="Finanzas" icon={Wallet} to="/finance">
          {finance.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div>
              <p className="text-3xl font-bold text-success">{formatCurrency(finance.data?.balance ?? 0)}</p>
              <p className="text-xs text-slate-400">balance de este periodo</p>
              <div className="mt-3 space-y-1.5">
                {(finance.data?.topCategories ?? []).slice(0, 3).map((c) => (
                  <div key={c.category} className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">{c.category}</span>
                    <span className="font-medium">{formatCurrency(c.total)}</span>
                  </div>
                ))}
                {!finance.data?.topCategories.length && <p className="text-sm text-slate-400">Aún no hay gastos</p>}
              </div>
            </div>
          )}
        </WidgetShell>

        {/* Tasks */}
        <WidgetShell title="Tareas" icon={CheckSquare} to="/tasks">
          {tasks.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div>
              <div className="flex gap-4">
                <div>
                  <p className={cn('text-3xl font-bold', taskStats.overdue ? 'text-danger' : 'text-slate-400')}>
                    {taskStats.overdue}
                  </p>
                  <p className="text-xs text-slate-400">vencidas</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">{taskStats.dueToday.length}</p>
                  <p className="text-xs text-slate-400">para hoy</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {taskStats.upcoming.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-slate-400">{t.dueDate && format(parseISO(t.dueDate), 'MMM d')}</span>
                  </div>
                ))}
                {!taskStats.upcoming.length && <p className="text-sm text-slate-400">Sin tareas próximas</p>}
              </div>
            </div>
          )}
        </WidgetShell>

        {/* Habits */}
        <WidgetShell title="Hábitos de hoy" icon={Flame} to="/habits">
          {habits.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(#7C3AED ${ringDeg}deg, rgba(124,58,237,0.12) 0deg)` }}
              >
                <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-white dark:bg-slate-900">
                  <span className="text-xl font-bold">{habitRing.pct}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-slate-500">
                  {habitRing.done} de {habitRing.total}
                </p>
                <p className="text-xs text-slate-400">hábitos completados hoy</p>
              </div>
            </div>
          )}
        </WidgetShell>

        {/* Goals */}
        <WidgetShell title="Metas" icon={Target} to="/habits">
          {goals.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="space-y-3">
              {(goals.data ?? []).filter((g) => g.status === 'active').slice(0, 3).map((g) => {
                const pct = Math.min(100, Math.round((Number(g.currentValue) / Number(g.targetValue)) * 100));
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="truncate">{g.title}</span>
                      <span className="text-slate-400">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!goals.data?.some((g) => g.status === 'active') && <p className="text-sm text-slate-400">Sin metas activas</p>}
            </div>
          )}
        </WidgetShell>

        {/* Calendar */}
        <WidgetShell title="Próximos eventos" icon={CalIcon} to="/calendar">
          {events.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                  <span className="flex-1 truncate">{e.title}</span>
                  <span className="text-xs text-slate-400">{format(parseISO(e.startTime), 'MMM d, HH:mm')}</span>
                </div>
              ))}
              {!upcomingEvents.length && <p className="text-sm text-slate-400">Sin eventos próximos</p>}
            </div>
          )}
        </WidgetShell>

        {/* Health */}
        <WidgetShell title="Salud (7 días)" icon={HeartPulse} to="/health">
          {health.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <HealthMini summary={health.data ?? {}} />
          )}
        </WidgetShell>
      </div>
    </div>
  );
}

function HealthMini({ summary }: { summary: HealthSummary }) {
  const water = summary.water;
  const sleep = summary.sleep;
  const workout = summary.workout;
  const chartData = (water?.series ?? sleep?.series ?? []).map((s) => ({ date: s.date.slice(5), value: s.value }));
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-lg font-bold text-sky-500">{water ? water.latest.toFixed(1) : '—'}</p>
          <p className="text-[10px] text-slate-400">Agua {water?.unit}</p>
        </div>
        <div>
          <p className="text-lg font-bold text-primary">{sleep ? sleep.latest.toFixed(1) : '—'}</p>
          <p className="text-[10px] text-slate-400">Sueño h</p>
        </div>
        <div>
          <p className="text-lg font-bold text-success">{workout ? Math.round(workout.total) : '—'}</p>
          <p className="text-[10px] text-slate-400">Ejercicio min</p>
        </div>
      </div>
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" hide />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#0EA5E9" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 18) return 'Buenas tardes';
  return 'Buenas noches';
}
