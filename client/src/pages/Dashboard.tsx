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

function Tile({
  title,
  icon: Icon,
  to,
  className,
  children,
}: {
  title: string;
  icon: any;
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className={cn('card-hover flex flex-col', className)}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <Icon className="h-4 w-4" />
          </div>
          <h3 className="text-sm font-semibold text-white/70">{title}</h3>
        </div>
        <Link to={to} className="text-white/30 transition hover:text-primary">
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
    <div>
      {/* Hero */}
      <div className="mb-7 pt-2">
        <p className="eyebrow capitalize">{format(new Date(), "EEEE, d 'de' MMMM")}</p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-6xl">
          {greeting()}, <span className="text-primary">{user?.name?.split(' ')[0]}</span>
        </h1>
      </div>

      {/* Barra IA en píldora de vidrio */}
      <form
        onSubmit={submitPrompt}
        className="mb-6 flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] p-2 pl-4 shadow-glass backdrop-blur-xl transition focus-within:border-primary/40"
      >
        <AiMark size={20} />
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Pregúntale lo que sea a tu asistente de IA sobre tu vida…"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
        />
        <button type="submit" className="btn-primary h-10 w-10 !px-0" aria-label="Preguntar">
          <Send className="h-4 w-4" />
        </button>
      </form>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {/* Finance */}
        <Tile title="Finanzas" icon={Wallet} to="/finance" className="lg:col-span-4">
          {finance.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="num text-4xl font-bold text-primary sm:text-5xl">{formatCurrency(finance.data?.balance ?? 0)}</p>
                <p className="mt-1 text-xs text-white/40">balance de este periodo</p>
              </div>
              <div className="w-full space-y-1.5 sm:max-w-[52%]">
                {(finance.data?.topCategories ?? []).slice(0, 3).map((c) => (
                  <div key={c.category} className="flex items-center justify-between border-b border-white/[0.06] pb-1.5 text-sm last:border-0">
                    <span className="text-white/50">{c.category}</span>
                    <span className="num font-medium">{formatCurrency(c.total)}</span>
                  </div>
                ))}
                {!finance.data?.topCategories.length && <p className="text-sm text-white/40">Aún no hay gastos</p>}
              </div>
            </div>
          )}
        </Tile>

        {/* Tasks */}
        <Tile title="Tareas" icon={CheckSquare} to="/tasks" className="lg:col-span-2">
          {tasks.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div>
              <div className="flex gap-4">
                <div>
                  <p className={cn('num text-3xl font-bold', taskStats.overdue ? 'text-danger' : 'text-white/40')}>
                    {taskStats.overdue}
                  </p>
                  <p className="text-xs text-white/40">vencidas</p>
                </div>
                <div>
                  <p className="num text-3xl font-bold text-primary">{taskStats.dueToday.length}</p>
                  <p className="text-xs text-white/40">para hoy</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {taskStats.upcoming.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span className="flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-white/40">{t.dueDate && format(parseISO(t.dueDate), 'MMM d')}</span>
                  </div>
                ))}
                {!taskStats.upcoming.length && <p className="text-sm text-white/40">Sin tareas próximas</p>}
              </div>
            </div>
          )}
        </Tile>

        {/* Habits */}
        <Tile title="Hábitos de hoy" icon={Flame} to="/habits" className="lg:col-span-2">
          {habits.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-24 w-24 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(#c4f82a ${ringDeg}deg, rgba(196,248,42,0.14) 0deg)` }}
              >
                <div className="flex h-[76px] w-[76px] flex-col items-center justify-center rounded-full bg-ink-900">
                  <span className="num text-2xl font-bold">{habitRing.pct}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm text-white/50">
                  {habitRing.done} de {habitRing.total}
                </p>
                <p className="text-xs text-white/40">hábitos completados hoy</p>
              </div>
            </div>
          )}
        </Tile>

        {/* Goals */}
        <Tile title="Metas" icon={Target} to="/habits" className="lg:col-span-2">
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
                      <span className="text-white/40">{pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/[0.08]">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
              {!goals.data?.some((g) => g.status === 'active') && <p className="text-sm text-white/40">Sin metas activas</p>}
            </div>
          )}
        </Tile>

        {/* Calendar */}
        <Tile title="Próximos eventos" icon={CalIcon} to="/calendar" className="lg:col-span-3">
          {events.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: e.color }} />
                  <span className="flex-1 truncate">{e.title}</span>
                  <span className="text-xs text-white/40">{format(parseISO(e.startTime), 'MMM d, HH:mm')}</span>
                </div>
              ))}
              {!upcomingEvents.length && <p className="text-sm text-white/40">Sin eventos próximos</p>}
            </div>
          )}
        </Tile>

        {/* Health */}
        <Tile title="Salud (7 días)" icon={HeartPulse} to="/health" className="lg:col-span-3">
          {health.isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <HealthMini summary={health.data ?? {}} />
          )}
        </Tile>
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
          <p className="num text-2xl font-bold text-primary">{water ? water.latest.toFixed(1) : '—'}</p>
          <p className="text-[10px] text-white/40">Agua {water?.unit}</p>
        </div>
        <div>
          <p className="num text-2xl font-bold text-primary">{sleep ? sleep.latest.toFixed(1) : '—'}</p>
          <p className="text-[10px] text-white/40">Sueño h</p>
        </div>
        <div>
          <p className="num text-2xl font-bold text-success">{workout ? Math.round(workout.total) : '—'}</p>
          <p className="text-[10px] text-white/40">Ejercicio min</p>
        </div>
      </div>
      {chartData.length > 0 && (
        <ResponsiveContainer width="100%" height={60}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" hide />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell key={i} fill="#c4f82a" />
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
