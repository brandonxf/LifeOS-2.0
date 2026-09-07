import { Suspense, useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import {
  LayoutDashboard,
  Wallet,
  CheckSquare,
  Flame,
  Calendar as CalendarIcon,
  BookOpen,
  StickyNote,
  Users,
  Activity,
  Settings,
  Bell,
  LogOut,
  ChevronLeft,
  CheckCircle2,
  Plus,
  X,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useUI } from '../store/ui';
import { api } from '../lib/api';
import { avatarSrc } from '../lib/avatar';
import { cn } from '../lib/utils';
import { Logo, AiMark, AuroraField } from './Brand';
import { Spinner } from './ui';
import { confirm } from '../store/confirm';

/** Fallback de Suspense para el contenido de cada ruta: un spinner simple,
 *  no el AppLoader de marca (ese anima un fondo aurora + texto letra por
 *  letra, pensado para el arranque, no para un cambio de pestaña). */
function RouteFallback() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
}

const NAV = [
  { to: '/dashboard', label: 'Inicio', icon: LayoutDashboard },
  { to: '/finance', label: 'Finanzas', icon: Wallet },
  { to: '/tasks', label: 'Tareas', icon: CheckSquare },
  { to: '/habits', label: 'Hábitos y Metas', icon: Flame },
  { to: '/calendar', label: 'Calendario', icon: CalendarIcon },
  { to: '/diary', label: 'Diario', icon: BookOpen },
  { to: '/notes', label: 'Notas', icon: StickyNote },
  { to: '/friends', label: 'Amigos', icon: Users },
  { to: '/feed', label: 'Actividad', icon: Activity },
  { to: '/ai', label: 'Asistente IA', icon: AiMark },
];

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  at: string;
}

/** Interruptor de tema claro/oscuro (funciona igual en web y en el APK
 *  nativo: ambos corren el mismo webview). Se espera a montar para leer el
 *  tema real de localStorage y evitar un parpadeo de ícono equivocado. */
function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = !mounted || resolvedTheme !== 'light';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/[0.06]"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
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
          <div className="glass-menu fixed inset-x-4 top-[calc(4rem+env(safe-area-inset-top))] z-20 mx-auto w-auto max-w-sm animate-fade-in rounded-2xl border bg-white p-2 shadow-xl dark:bg-ink-900/85 dark:backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80 sm:max-w-none">
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

/** Menú desplegable del avatar: datos del usuario + acceso a Ajustes y
 *  cerrar sesión. */
function UserMenu({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const initial = user?.name?.[0]?.toUpperCase() ?? '?';
  const avatar = avatarSrc(user?.avatar);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menú de usuario"
        className="ml-1 flex items-center gap-2 rounded-xl px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
      >
        <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-bold text-primary">
          {avatar ? (
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            initial
          )}
        </div>
        <div className="hidden text-left sm:block">
          <p className="text-sm font-semibold leading-tight">{user?.name}</p>
          <p className="text-xs capitalize text-slate-400">Plan {user?.plan}</p>
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="glass-menu fixed inset-x-4 top-[calc(4rem+env(safe-area-inset-top))] z-20 mx-auto w-auto max-w-xs animate-fade-in rounded-2xl border bg-white p-2 shadow-xl dark:bg-ink-900/85 dark:backdrop-blur-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-64 sm:max-w-none">
            <div className="flex items-center gap-3 px-3 py-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-base font-bold text-primary">
                {avatar ? (
                  <img src={avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  initial
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight">{user?.name}</p>
                {user?.email && <p className="truncate text-xs text-slate-400">{user.email}</p>}
                <p className="text-xs capitalize text-slate-400">Plan {user?.plan}</p>
              </div>
            </div>
            <div className="my-1 h-px bg-slate-200/70 dark:bg-white/10" />
            <button
              onClick={() => { setOpen(false); navigate('/settings'); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              <Settings className="h-4 w-4 opacity-70" /> Ajustes
            </button>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-danger transition hover:bg-danger/10"
            >
              <LogOut className="h-4 w-4" /> Cerrar sesión
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Menú de móvil: reemplaza el sidebar en pantallas pequeñas. Un botón
 *  circular abajo-derecha abre una hoja inferior con TODAS las secciones en
 *  una grilla — con 10+ secciones, una lista vertical (el speed-dial de
 *  antes) se apilaba hasta salirse de la pantalla; en grilla de 4 columnas
 *  entran en 3 filas cortas sin importar cuántas secciones haya. */
function MobileFab({ onLogout }: { onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const items = [...NAV, { to: '/settings', label: 'Ajustes', icon: Settings }];

  // En el chat de IA el composer (con su botón de enviar) va abajo a la
  // derecha; subimos el FAB para no taparlo.
  const onAi = pathname === '/ai';

  function go(to: string) {
    setOpen(false);
    navigate(to);
  }

  return (
    <div className="lg:hidden">
      {/* Scrim con desenfoque de fondo */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/45 animate-scrim-in"
          style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Hoja inferior: grilla de secciones, no una lista que crece hacia arriba. */}
      {open && (
        <div
          className="animate-sheet-in fixed inset-x-0 bottom-0 z-50 rounded-t-[28px] border-t border-slate-200 bg-white shadow-glass-lg dark:border-white/10 dark:bg-ink-900/95 dark:backdrop-blur-2xl"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-white/15" />
          <div className="flex items-center justify-between px-5 pb-1 pt-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Menú</p>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar menú"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid max-h-[60vh] grid-cols-4 gap-x-1 gap-y-4 overflow-y-auto px-5 pb-6 pt-2">
            {items.map(({ to, label, icon: Icon }, i) => {
              const active = pathname === to;
              return (
                <button
                  key={to}
                  onClick={() => go(to)}
                  className="fab-item flex flex-col items-center gap-1.5"
                  style={{ animationDelay: `${i * 18}ms` }}
                >
                  <span
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl',
                      active
                        ? 'bg-primary text-ink-950 shadow-glow'
                        : 'bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span
                    className={cn(
                      'text-center text-[11px] font-medium leading-tight',
                      active ? 'text-primary' : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
                    {label}
                  </span>
                </button>
              );
            })}

            {/* Cerrar sesión */}
            <button
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="fab-item flex flex-col items-center gap-1.5"
              style={{ animationDelay: `${items.length * 18}ms` }}
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger">
                <LogOut className="h-5 w-5" />
              </span>
              <span className="text-center text-[11px] font-medium leading-tight text-danger">Salir</span>
            </button>
          </div>
        </div>
      )}

      {/* Botón principal: se oculta con la hoja abierta (que ya trae su
          propia X) para que no quede flotando encima de la grilla. */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-ink-950 shadow-glow transition-transform active:scale-95"
          style={{ bottom: onAi ? 'calc(7rem + env(safe-area-inset-bottom))' : 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}

export function AppLayout() {
  const { user, clear, refreshToken } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUI();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // El chat ocupa toda la ventana (sin el contenedor centrado/con padding).
  const fullBleed = pathname === '/ai';

  async function handleLogout() {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres cerrar tu sesión?',
      confirmLabel: 'Cerrar sesión',
      danger: true,
    });
    if (!ok) return;
    try {
      if (refreshToken) await api('/api/auth/logout', { method: 'POST', body: { refreshToken } });
    } catch {
      /* ignore */
    }
    clear();
    navigate('/login');
  }

  return (
    <div className="relative flex h-screen overflow-hidden text-slate-900 dark:text-slate-100">
      <AuroraField />
      {/* Rail flotante de navegación */}
      <aside
        className={cn(
          'app-rail hidden flex-col border-r border-slate-200 bg-white/80 backdrop-blur-2xl transition-all duration-200 dark:border-white/[0.07] dark:bg-white/[0.045] lg:static lg:m-3 lg:flex lg:h-[calc(100vh-1.5rem)] lg:rounded-[26px] lg:border lg:shadow-glass',
          sidebarCollapsed ? 'w-[68px]' : 'w-64',
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
              className={({ isActive }) =>
                cn(
                  'nav-item',
                  sidebarCollapsed ? 'w-full justify-center px-0' : 'justify-start',
                  isActive ? 'nav-item-active' : 'nav-item-idle',
                )
              }
              title={sidebarCollapsed ? label : undefined}
            >
              {({ isActive }) => (
                <>
                  {isActive && !sidebarCollapsed && (
                    <span className="absolute inset-y-1.5 left-0 w-1 rounded-full bg-gradient-to-b from-primary-400 to-primary-600" />
                  )}
                  <Icon className="h-5 w-5 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-slate-200 p-3 dark:border-white/[0.07]">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                'nav-item',
                sidebarCollapsed ? 'mx-auto w-11 justify-center px-0' : 'justify-start',
                isActive ? 'nav-item-active' : 'nav-item-idle',
              )
            }
            title={sidebarCollapsed ? 'Ajustes' : undefined}
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Ajustes</span>}
          </NavLink>
          <button
            onClick={handleLogout}
            className={cn('nav-item nav-item-idle w-full', sidebarCollapsed ? 'justify-center px-0' : 'justify-start')}
            title={sidebarCollapsed ? 'Cerrar sesión' : undefined}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span>Cerrar sesión</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="flex min-h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-6"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="flex items-center gap-2">
            {/* Marca en móvil (el sidebar está oculto). */}
            <div className="flex items-center gap-2 lg:hidden">
              <Logo size={32} />
              <span className="font-display text-base font-extrabold tracking-tight">Life&nbsp;OS</span>
            </div>
            {/* Colapsar sidebar en desktop. */}
            <button
              onClick={toggleSidebar}
              className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-white/[0.06] lg:flex"
            >
              <ChevronLeft className={cn('h-5 w-5 transition-transform', sidebarCollapsed && 'rotate-180')} />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationsBell />
            <UserMenu onLogout={handleLogout} />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden">
          {fullBleed ? (
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          ) : (
            <div className="h-full overflow-y-auto">
              <div className="mx-auto w-full max-w-7xl px-4 pb-10 pt-2 sm:px-6 lg:px-8">
                <Suspense fallback={<RouteFallback />}>
                  <Outlet />
                </Suspense>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Menú flotante para móvil */}
      <MobileFab onLogout={handleLogout} />
    </div>
  );
}
