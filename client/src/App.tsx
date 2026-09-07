import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { AppLayout } from './components/AppLayout';
import { Spinner } from './components/ui';

// Cada página en su propio chunk: antes todas (+ recharts, tiptap, dnd)
// vivían en un solo bundle de 1.5MB que se descargaba/ejecutaba entero
// antes de poder ver el login — carísimo en gama baja. Con lazy(), cada
// una se descarga la primera vez que se visita esa ruta.
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Finance = lazy(() => import('./pages/Finance'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Habits = lazy(() => import('./pages/Habits'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Diary = lazy(() => import('./pages/Diary'));
const Notes = lazy(() => import('./pages/Notes'));
const Friends = lazy(() => import('./pages/Friends'));
const FriendProfile = lazy(() => import('./pages/FriendProfile'));
const Feed = lazy(() => import('./pages/Feed'));
const AIChat = lazy(() => import('./pages/AIChat'));
const Settings = lazy(() => import('./pages/Settings'));

function PageFallback() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const token = useAuth((s) => s.accessToken);
  if (!user || !token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/diary" element={<Diary />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/friends/:userId" element={<FriendProfile />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/ai" element={<AIChat />} />
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
