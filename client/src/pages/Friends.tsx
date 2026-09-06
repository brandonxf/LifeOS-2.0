import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, X, Trash2, UserPlus, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Card, EmptyState, Avatar } from '../components/ui';
import { useAuth, type AuthUser } from '../store/auth';
import { confirm } from '../store/confirm';
import type { Friendship, FriendRequest } from '../lib/types';

export default function Friends() {
  const qc = useQueryClient();
  const { user, setUser } = useAuth();
  const [code, setCode] = useState('');

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

  const friends = useQuery({ queryKey: ['friends'], queryFn: () => api<Friendship[]>('/api/friends') });
  const requests = useQuery({
    queryKey: ['friends', 'requests'],
    queryFn: () => api<{ incoming: FriendRequest[]; outgoing: FriendRequest[] }>('/api/friends/requests'),
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

  async function confirmRemove(id: string, name: string) {
    const ok = await confirm({
      title: 'Eliminar amigo',
      message: `¿Seguro que quieres eliminar a ${name} de tus amigos?`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) remove.mutate(id);
  }

  async function copyCode() {
    if (!user?.friendCode) return;
    try {
      await navigator.clipboard.writeText(user.friendCode);
      toast.success('Código copiado');
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
          <button onClick={copyCode} className="btn btn-ghost border" disabled={!user?.friendCode}>
            <Copy className="h-4 w-4" /> Copiar
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
                <div key={f.id} className="flex items-center gap-3 py-3">
                  <Avatar name={f.friend.name} avatar={f.friend.avatar} />
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">{f.friend.name}</p>
                  <button onClick={() => confirmRemove(f.id, f.friend.name)} className="text-slate-400 hover:text-danger" aria-label="Eliminar amigo">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
