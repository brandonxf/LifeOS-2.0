import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, MapPin, Cake, Trash2, Flame, ListChecks, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { api, ApiError } from '../lib/api';
import { SectionTitle, Card, Skeleton, EmptyState } from '../components/ui';
import { HabitIcon } from '../components/icons';
import { avatarSrc } from '../lib/avatar';
import { confirm } from '../store/confirm';
import { cn, PRIORITY_STYLES } from '../lib/utils';
import type { FriendProfile as FriendProfileT, Friendship } from '../lib/types';

/** Edad en años a partir de una fecha ISO YYYY-MM-DD. */
function ageFrom(iso: string): number {
  const b = parseISO(iso);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const PRIORITY_LABELS: Record<string, string> = { low: 'Baja', medium: 'Media', high: 'Alta', urgent: 'Urgente' };
const STATUS_LABELS: Record<string, string> = { todo: 'Por hacer', in_progress: 'En progreso', done: 'Hecho' };
const STATUS_DOT: Record<string, string> = { todo: 'bg-slate-400', in_progress: 'bg-primary', done: 'bg-success' };

/** Página de perfil de un amigo: se abre al tocar su fila en Amigos. Los
 *  mismos campos "de presentación" que uno ya muestra en su propio Ajustes
 *  → Perfil (nunca email/teléfono — eso es contacto, no perfil), más lo que
 *  hacen juntos: hábitos y tareas compartidas, con la racha DEL AMIGO. */
export default function FriendProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['friends', 'profile', userId],
    queryFn: () => api<FriendProfileT>(`/api/friends/profile/${userId}`),
    enabled: !!userId,
    retry: false,
  });

  // El DELETE necesita el id de la AMISTAD, no el del usuario. Mismo
  // queryKey que la lista de Friends.tsx: si ya está en caché (llegaste
  // tocando una fila) resuelve al instante sin red; si no (URL directa,
  // recarga de página) la pide una vez.
  const { data: friendsList } = useQuery({
    queryKey: ['friends'],
    queryFn: () => api<Friendship[]>('/api/friends'),
  });
  const friendshipId = friendsList?.find((f) => f.friend.id === userId)?.id;

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/friends/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Eliminado');
      qc.invalidateQueries({ queryKey: ['friends'] });
      navigate('/friends');
    },
    onError: (e: any) => toast.error(e.message),
  });

  async function onRemove() {
    if (!profile || !friendshipId) return;
    const ok = await confirm({
      title: 'Eliminar amigo',
      message: `¿Seguro que quieres eliminar a ${profile.name} de tus amigos? También se quitarán los hábitos y tareas que compartan entre ustedes.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) remove.mutate(friendshipId);
  }

  const src = avatarSrc(profile?.avatar);
  const habitsShared = profile?.shared.habits ?? [];
  const tasksShared = profile?.shared.tasks ?? [];

  return (
    // El FAB flotante de móvil vive fixed abajo-derecha: sin este margen,
    // una página corta como esta termina justo detrás y tapa "Eliminar amigo".
    <div className="mx-auto max-w-2xl space-y-6 pb-20 lg:pb-0">
      <button
        onClick={() => navigate('/friends')}
        className="-ml-1 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-slate-500 transition hover:text-primary dark:text-slate-400"
      >
        <ChevronLeft className="h-4 w-4" /> Amigos
      </button>

      {isLoading ? (
        <Card>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full">
              <Skeleton className="h-full w-full" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
        </Card>
      ) : isError ? (
        <EmptyState
          icon={ListChecks}
          title="No se pudo abrir este perfil"
          description={error instanceof ApiError ? error.message : 'Puede que ya no sean amigos.'}
        />
      ) : profile ? (
        <>
          <SectionTitle
            title={profile.name}
            subtitle={profile.username ? `@${profile.username}` : undefined}
          />

          <Card>
            <div className="flex items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-3xl font-bold text-primary ring-1 ring-primary/20">
                {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : profile.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold">
                  {profile.name}
                  {profile.pronouns && <span className="ml-2 text-sm font-normal text-slate-400">({profile.pronouns})</span>}
                </p>
                {profile.username && <p className="text-sm text-primary">@{profile.username}</p>}
                {profile.friendsSince && (
                  <p className="mt-1 text-xs text-slate-400">
                    Amigos desde {format(parseISO(profile.friendsSince), "d 'de' MMMM yyyy")}
                  </p>
                )}
              </div>
            </div>

            {profile.bio && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{profile.bio}</p>}

            {(profile.location || profile.birthDate) && (
              <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-4 text-sm dark:border-white/10 sm:grid-cols-2">
                {profile.location && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <MapPin className="h-4 w-4 shrink-0" /> {profile.location}
                  </div>
                )}
                {profile.birthDate && (
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Cake className="h-4 w-4 shrink-0" />
                    {format(parseISO(profile.birthDate), "d 'de' MMMM")}
                    <span className="text-slate-400">· {ageFrom(profile.birthDate)} años</span>
                  </div>
                )}
              </div>
            )}
          </Card>

          {habitsShared.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold"><Flame className="h-4 w-4" /> Hábitos compartidos</h3>
              <Card>
                <div className="divide-y dark:divide-white/10">
                  {habitsShared.map((h) => (
                    <div key={h.id} className="flex items-center gap-3 py-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${h.color}22`, color: h.color ?? undefined }}
                      >
                        <HabitIcon name={h.icon ?? 'flame'} className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{h.name}</p>
                        <p className="text-xs text-slate-400">{h.owner === 'me' ? 'Tú invitaste' : `${profile.name.split(' ')[0]} invitó`}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Flame className="h-4 w-4" /> {h.friendStreak}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {tasksShared.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold"><ListChecks className="h-4 w-4" /> Tareas compartidas</h3>
              <Card>
                <div className="divide-y dark:divide-white/10">
                  {tasksShared.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 py-3">
                      <span className={cn('h-2 w-2 shrink-0 rounded-full', STATUS_DOT[t.status])} />
                      <p className={cn('min-w-0 flex-1 truncate text-sm font-medium', t.status === 'done' && 'text-slate-400 line-through')}>
                        {t.title}
                      </p>
                      <span className={cn('chip shrink-0', PRIORITY_STYLES[t.priority])}>
                        <Flag className="h-3 w-3" /> {PRIORITY_LABELS[t.priority]}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{STATUS_LABELS[t.status]}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {habitsShared.length === 0 && tasksShared.length === 0 && (
            <EmptyState
              icon={Flame}
              title="Nada en común todavía"
              description={`Invita a ${profile.name.split(' ')[0]} a un hábito o tarea para verlo aquí.`}
            />
          )}

          <div className="flex justify-end">
            <button type="button" className="btn-danger" onClick={onRemove} disabled={remove.isPending || !friendshipId}>
              <Trash2 className="h-4 w-4" /> Eliminar amigo
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
