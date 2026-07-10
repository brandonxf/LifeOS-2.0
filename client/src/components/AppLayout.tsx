import { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
import { Logo, AiMark, AuroraField } from './Brand';

const NAV = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/finance', label: 'Finanzas', icon: Wallet },
  { to: '/tasks', label: 'Tareas', icon: CheckSquare },
  { to: '/habits', label: 'Hábitos y Metas', icon: Flame },
  { to: '/calendar', label: 'Calendario', icon: CalendarIcon },
  { to: '/diary', label: 'Diario', icon: BookOpen },
  { to: '/notes', label: 'Notas', icon: StickyNote },
  { to: '/health', label: 'Salud', icon: HeartPulse },
  { to: '/ai', label: 'Asistente IA', icon: AiMark },
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
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
      >
        <Bell className="h-5 w-5" />
        {data.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-danger" />
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-4 top-16 z-20 mx-auto w-auto max-w-sm animate-fade-in rounded-2xl border bg-white p-2 shadow-xl dark:bg-ink-900/85 dark:backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 sm:max-w-none">
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
                  <div key={n.id} className="rounded-xl px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/[0.06]">
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
  const { pathname } = useLocation();
  // El chat ocupa toda la ventana (sin el contenedor centrado/con padding).
  const fullBleed = pathname === '/ai';

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
    <div className="relative flex h-screen overflow-hidden text-slate-100">
      <AuroraField />
      {/* Rail flotante de navegación */}
      <aside
        className={cn(
          'app-rail fixed inset-y-0 left-0 z-40 flex flex-col border-r border-white/[0.07] bg-white/[0.045] backdrop-blur-2xl transition-all duration-200 lg:static lg:inset-auto lg:m-3 lg:h-[calc(100vh-1.5rem)] lg:rounded-[26px] lg:border lg:shadow-glass',
          sidebarCollapsed ? 'w-[68px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-16 items-center gap-2.5 px-4">
          <Logo size={36} />
          {!sidebarCollapsed && (
            <span className="font-display text-lg font-extrabold tracking-tight">Life&nbsp;OS</span>
          )}
        </div>

        {!sidebarCollapsed && (
          <p className="px-5 pb-1 pt-3 text-[0.65rem] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Menú
          </p>
        )}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => cn('nav-item', isActive ? 'nav-item-active' : 'nav-item-idle')}
              title={sidebarCollapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-gradient-to-b from-primary-400 to-primary-600" />
                  )}
                  <Icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-white/[0.07] p-3">
          <NavLink
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) => cn('nav-item', isActive ? 'nav-item-active' : 'nav-item-idle')}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Ajustes</span>}
          </NavLink>
          <button onClick={handleLogout} className="nav-item nav-item-idle w-full">
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
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={toggleSidebar}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] lg:flex"
            >
              <ChevronLeft className={cn('h-5 w-5 transition-transform', sidebarCollapsed && 'rotate-180')} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <NotificationsBell />
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

        <main className={cn('min-h-0 flex-1', fullBleed ? 'overflow-hidden' : 'overflow-y-auto')}>
          {fullBleed ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-2 sm:px-6 lg:px-8">
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
