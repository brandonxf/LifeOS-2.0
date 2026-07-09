import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  Flame,
  Calendar as CalendarIcon,
  BookOpen,
  StickyNote,
  HeartPulse,
  Sparkles,
  Settings,
  Menu,
  Bell,
  LogOut,
  ChevronLeft,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { ThemeToggle } from './ThemeToggle';

const NAV = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/finance', label: 'Finanzas', icon: Wallet },
  { to: '/tasks', label: 'Tareas', icon: CheckSquare },
  { to: '/habits', label: 'Hábitos y Metas', icon: Flame },
  { to: '/calendar', label: 'Calendario', icon: CalendarIcon },
  { to: '/diary', label: 'Diario', icon: BookOpen },
  { to: '/notes', label: 'Notas', icon: StickyNote },
  { to: '/health', label: 'Salud', icon: HeartPulse },
  { to: '/ai', label: 'Asistente IA', icon: Sparkles },
];

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  at: string;
}

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Notif[]>('/api/ai/notifications'),
    refetchInterval: 60_000,
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        <Bell className="h-5 w-5" />
        {data.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-80 animate-fade-in rounded-2xl border bg-white p-2 shadow-xl dark:bg-slate-900">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Notificaciones
            </p>
            {data.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-3 py-6 text-center text-sm text-slate-400">
                <CheckCircle2 className="h-6 w-6 text-success" />
                <span>¡Estás al día!</span>
              </div>
            ) : (
              <div className="max-h-80 space-y-1 overflow-auto">
                {data.map((n) => (
                  <div key={n.id} className="rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="truncate text-xs text-slate-500">{n.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, clear, refreshToken } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      if (refreshToken) await api('/api/auth/logout', { method: 'POST', body: { refreshToken } });
    } catch {
      /* ignore */
    }
    clear();
    navigate('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-white transition-all duration-200 dark:bg-slate-900 lg:static',
          sidebarCollapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center gap-2 px-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          {!sidebarCollapsed && <span className="text-lg font-extrabold tracking-tight">Life OS</span>}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )
              }
              title={sidebarCollapsed ? label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <NavLink
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                isActive ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              )
            }
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Ajustes</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b bg-white/80 px-4 backdrop-blur dark:bg-slate-950/80">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={toggleSidebar}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:flex"
            >
              <ChevronLeft className={cn('h-5 w-5 transition-transform', sidebarCollapsed && 'rotate-180')} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <NotificationsBell />
            <ThemeToggle />
            <div className="ml-1 flex items-center gap-2 rounded-xl px-2 py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold leading-tight">{user?.name}</p>
                <p className="text-xs capitalize text-slate-400">Plan {user?.plan}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
