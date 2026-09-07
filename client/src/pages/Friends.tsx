import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, X, Trash2, UserPlus, Users, MapPin, Cake, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Card, EmptyState, Avatar, Modal } from '../components/ui';
import { avatarSrc } from '../lib/avatar';
import { useAuth, type AuthUser } from '../store/auth';
import { confirm } from '../store/confirm';
import type { Friendship, FriendRequest, FriendProfile } from '../lib/types';
import { LIVE_FAST, LIVE_SLOW } from '../lib/live';
import { DrawnCheck, useCompletionPulse, CompletionBurst } from '../components/AnimatedCheck';
import { cn } from '../lib/utils';

/** Edad en años a partir de una fecha ISO YYYY-MM-DD. */
function ageFrom(iso: string): number {
  const b = parseISO(iso);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export default function Friends() {
  const qc = useQueryClient();
  const { user, setUser } = useAuth();
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);
  const copyPulse = useCompletionPulse(copied);
  const [viewing, setViewing] = useState<Friendship | null>(null);

  // Refresca el perfil por si el código de amigo aún no se había generado
  // (cuentas creadas antes de que existiera este sistema).
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api<{ user: AuthUser }>('/api/auth/me');
      setUser(res.user);
      return res.user;
    },
  });

  const friends = useQuery({ queryKey: ['friends'], queryFn: () => api<Friendship[]>('/api/friends'), ...LIVE_FAST });
  const requests = useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: () => api<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/api/friends/requests'),
    ...LIVE_SLOW,
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['friends'] });
  }

  const add = useMutation({
    mutationFn: (c: string) => api('/api/friends/add', { method: 'POST', body: { code: c } }),
    onSuccess: () => { toast.success('Solicitud enviada'); setCode(''); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });

  const accept = useMutation({
    mutationFn: (id: string) => api(`/api/friends/requests/${id}/accept`, { method: 'POST' }),
    onSuccess: () => { toast.success('¡Ahora son amigos!'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api(`/api/friends/requests/${id}/reject`, { method: 'POST' }),
    onSuccess: () => invalidateAll(),
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/friends/${id}`, { method: 'DELETE' }),
    onSuccess: () => { toast.success('Eliminado'); invalidateAll(); },
    onError: (e: any) => toast.error(e.message),
  });

  async function confirmRemove(id: string, name: string, onConfirmed?: () => void) {
    const ok = await confirm({
      title: 'Eliminar amigo',
      message: `¿Seguro que quieres eliminar a ${name} de tus amigos? También se quitarán los hábitos y tareas que compartan entre ustedes.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    onConfirmed?.();
    remove.mutate(id);
  }

  async function copyCode() {
    if (!user?.friendCode) return;
    try {
      await navigator.clipboard.writeText(user.friendCode);
      toast.success('Código copiado');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('No se pudo copiar el código');
    }
  }

  const incoming = requests.data?.incoming ?? [];
  const outgoing = requests.data?.outgoing ?? [];

  return (
    <div className="space-y-6">
      <SectionTitle title="Amigos" subtitle="Agrega amigos para compartir hábitos y ver su progreso" />

      <Card>
        <h3 className="mb-1 font-semibold">Tu código</h3>
        <p className="mb-3 text-sm text-slate-400">Compártelo con quien quieras agregar como amigo.</p>
        <div className="flex items-center gap-2">
          <span className="rounded-xl border bg-slate-100 px-4 py-2 font-mono text-lg tracking-widest dark:bg-slate-900">
            {user?.friendCode ?? '·······'}
          </span>
          <button
            onClick={copyCode}
            className={cn('btn btn-ghost border', copied && 'border-primary/50 text-primary')}
            disabled={!user?.friendCode}
          >
            <span className="relative flex h-4 w-4 items-center justify-center">
              <CompletionBurst show={copyPulse} />
              {copied ? <DrawnCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </span>
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-semibold">Agregar amigo</h3>
        <form
          onSubmit={(e) => { e.preventDefault(); if (code.trim()) add.mutate(code.trim()); }}
          className="flex gap-2"
        >
          <input
            className="input flex-1 uppercase tracking-widest"
            placeholder="Código de invitación"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={20}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={add.isPending || !code.trim()}>
            <UserPlus className="h-4 w-4" /> Agregar
          </button>
        </form>
      </Card>

      {(incoming.length > 0 || outgoing.length > 0) && (
        <Card>
          <h3 className="mb-3 font-semibold">Solicitudes</h3>
          <div className="divide-y">
            {incoming.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={r.user.name} avatar={r.user.avatar} />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{r.user.name}</p>
                <button onClick={() => accept.mutate(r.id)} className="rounded-lg p-1.5 text-success hover:bg-success/10" aria-label="Aceptar">
                  <Check className="h-4 w-4" />
                </button>
                <button onClick={() => reject.mutate(r.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-danger" aria-label="Rechazar">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {outgoing.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2.5">
                <Avatar name={r.user.name} avatar={r.user.avatar} />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{r.user.name}</p>
                <span className="shrink-0 text-xs text-slate-400">Esperando respuesta</span>
                <button onClick={() => remove.mutate(r.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-danger" aria-label="Cancelar">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div>
        <h3 className="mb-3 font-semibold">Tus amigos</h3>
        {friends.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : !friends.data?.length ? (
          <EmptyState icon={Users} title="Aún no tienes amigos" description="Comparte tu código o pide el de alguien más para empezar." />
        ) : (
          <Card>
            <div className="divide-y">
              {friends.data.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setViewing(f)}
                  aria-label={`Ver perfil de ${f.friend.name}`}
                  className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
                >
                  <Avatar name={f.friend.name} avatar={f.friend.avatar} />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{f.friend.name}</p>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); confirmRemove(f.id, f.friend.name); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); confirmRemove(f.id, f.friend.name); } }}
                    className="shrink-0 rounded-lg p-1 text-slate-400 hover:text-danger"
                    aria-label="Eliminar amigo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      {viewing && (
        <FriendProfileModal
          friendship={viewing}
          onClose={() => setViewing(null)}
          onRemove={() => confirmRemove(viewing.id, viewing.friend.name, () => setViewing(null))}
        />
      )}
    </div>
  );
}

/** Perfil de un amigo: se abre al tocar su fila en "Tus amigos". Trae los
 *  mismos campos "de presentación" que el dueño ya muestra en su propio
 *  Ajustes → Perfil (bio, ubicación, cumpleaños…) — nunca email/teléfono. */
function FriendProfileModal({
  friendship,
  onClose,
  onRemove,
}: {
  friendship: Friendship;
  onClose: () => void;
  onRemove: () => void;
}) {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['friends', 'profile', friendship.friend.id],
    queryFn: () => api<FriendProfile>(`/api/friends/profile/${friendship.friend.id}`),
  });

  const src = avatarSrc(profile?.avatar ?? friendship.friend.avatar);

  return (
    <Modal open onClose={onClose} title="Perfil">
      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            {/* `.skeleton` fija su propio radio (rounded-lg) con más prioridad
                que una clase rounded-full pasada por fuera — se envuelve en un
                contenedor circular con overflow-hidden en vez de pelear con
                la cascada. */}
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full">
              <Skeleton className="h-full w-full" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-16" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-2xl font-bold text-primary ring-1 ring-primary/20">
              {src ? (
                <img src={src} alt="" className="h-full w-full object-cover" />
              ) : (
                friendship.friend.name[0]?.toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">
                {profile?.name ?? friendship.friend.name}
                {profile?.pronouns && <span className="ml-2 text-sm font-normal text-slate-400">({profile.pronouns})</span>}
              </p>
              {profile?.username && <p className="truncate text-sm text-primary">@{profile.username}</p>}
              {friendship.since && (
                <p className="mt-1 text-xs text-slate-400">
                  Amigos desde {format(parseISO(friendship.since), "d 'de' MMMM yyyy")}
                </p>
              )}
            </div>
          </div>

          {profile?.bio && <p className="text-sm text-slate-600 dark:text-slate-300">{profile.bio}</p>}

          {(profile?.location || profile?.birthDate) && (
            <div className="grid grid-cols-1 gap-2 border-t pt-4 text-sm dark:border-white/10 sm:grid-cols-2">
              {profile?.location && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4 shrink-0" /> {profile.location}
                </div>
              )}
              {profile?.birthDate && (
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Cake className="h-4 w-4 shrink-0" />
                  {format(parseISO(profile.birthDate), "d 'de' MMMM")}
                  <span className="text-slate-400">· {ageFrom(profile.birthDate)} años</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4 dark:border-white/10">
            <button type="button" className="btn-ghost" onClick={onClose}>Cerrar</button>
            <button type="button" className="btn-danger" onClick={onRemove}>
              <Trash2 className="h-4 w-4" /> Eliminar amigo
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
