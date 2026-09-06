import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Activity, CheckSquare, Flame } from 'lucide-react';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Card, EmptyState, Avatar } from '../components/ui';
import { cn } from '../lib/utils';
import type { ActivityEvent } from '../lib/types';
import { LIVE_FAST } from '../lib/live';

export default function Feed() {
  const qc = useQueryClient();
  const feed = useQuery({ queryKey: ['feed'], queryFn: () => api<ActivityEvent[]>('/api/feed'), ...LIVE_FAST });

  const react = useMutation({
    mutationFn: (id: string) => api<{ reactionCount: number; reactedByMe: boolean }>(`/api/feed/${id}/react`, { method: 'POST' }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['feed'] });
      const prev = qc.getQueryData<ActivityEvent[]>(['feed']);
      qc.setQueryData<ActivityEvent[]>(['feed'], (old) =>
        old?.map((e) => (e.id === id
          ? { ...e, reactedByMe: !e.reactedByMe, reactionCount: e.reactionCount + (e.reactedByMe ? -1 : 1) }
          : e)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['feed'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['feed'] }),
  });

  return (
    <div className="space-y-6">
      <SectionTitle title="Actividad" subtitle="Lo que tus amigos han estado logrando" />

      {feed.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !feed.data?.length ? (
        <EmptyState icon={Activity} title="Aún no hay actividad" description="Cuando tus amigos completen un hábito compartido o contigo activado, o marquen una tarea en equipo como hecha, aparecerá aquí." />
      ) : (
        <div className="space-y-3">
          {feed.data.map((e) => (
            <Card key={e.id} className="flex items-center gap-3">
              <Avatar name={e.actor.name} avatar={e.actor.avatar} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{e.actor.name}</span>{' '}
                  {e.kind === 'habit_completed' ? 'completó su hábito' : 'completó la tarea'}{' '}
                  <span className="font-medium">{e.label}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                  {e.kind === 'habit_completed' ? <Flame className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
                  {formatDistanceToNow(parseISO(e.createdAt), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={() => react.mutate(e.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition',
                  e.reactedByMe ? 'border-primary bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]',
                )}
              >
                👏 {e.reactionCount > 0 && e.reactionCount}
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
