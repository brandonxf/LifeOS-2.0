import { useTheme } from 'next-themes';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Moon, Sun, Monitor, LogOut, User, Crown, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { useAuth, type AuthUser } from '../store/auth';
import { SectionTitle, Card } from '../components/ui';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, clear, refreshToken, setUser } = useAuth();
  const navigate = useNavigate();

  // Refresh profile from the server.
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api<{ user: AuthUser }>('/api/auth/me');
      setUser(res.user);
      return res.user;
    },
  });

  async function logout() {
    try {
      if (refreshToken) await api('/api/auth/logout', { method: 'POST', body: { refreshToken } });
    } catch { /* ignore */ }
    clear();
    navigate('/login');
    toast.success('Sesión cerrada');
  }

  const themes = [
    { id: 'light', label: 'Claro', icon: Sun },
    { id: 'dark', label: 'Oscuro', icon: Moon },
    { id: 'system', label: 'Sistema', icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionTitle title="Ajustes" subtitle="Gestiona tu cuenta y preferencias" />

      {/* Profile */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><User className="h-4 w-4" /> Perfil</h3>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-2xl font-bold text-primary">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold">{user?.name}</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <p className="mt-1 text-xs capitalize text-slate-400">
              Miembro desde {user?.createdAt ? format(parseISO(user.createdAt), 'MMMM yyyy') : '—'}
            </p>
          </div>
        </div>
      </Card>

      {/* Plan */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><Crown className="h-4 w-4" /> Plan</h3>
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <p className="font-semibold capitalize">Plan {user?.plan}</p>
            <p className="text-sm text-slate-400">
              {user?.plan === 'pro' ? 'Tienes acceso a todas las funciones.' : 'Mejora tu plan para desbloquear chats de IA ilimitados.'}
            </p>
          </div>
          {user?.plan === 'pro' ? (
            <span className="chip bg-primary/10 text-primary"><Crown className="h-3 w-3" /> Pro</span>
          ) : (
            <button className="btn-primary" onClick={() => toast('Los pagos no están configurados en esta demo')}>Mejorar plan</button>
          )}
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <h3 className="mb-4 font-semibold">Apariencia</h3>
        <div className="grid grid-cols-3 gap-2">
          {themes.map((t) => (
            <button key={t.id} onClick={() => setTheme(t.id)}
              className={cn('flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition', theme === t.id ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-slate-50 dark:hover:bg-slate-800')}>
              <t.icon className="h-5 w-5" />
              {t.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Security / session */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" /> Seguridad</h3>
        <p className="mb-4 text-sm text-slate-400">
          Iniciaste sesión con un token de refresco rotativo. Cerrar sesión revoca la sesión de este dispositivo.
        </p>
        <button onClick={logout} className="btn-danger w-full">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </Card>
    </div>
  );
}
