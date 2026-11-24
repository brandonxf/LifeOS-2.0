import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Wallet, Flame, Sparkles, Mail, Lock } from 'lucide-react';
import { LogoLockup } from '../components/Brand';
import { AuthBackdrop, AuthIconField } from '../components/AuthScene';
import { authApi } from '../lib/api';
import { useAuth, type AuthUser } from '../store/auth';
import { Field, PasswordInput, Spinner } from '../components/ui';

const BRAND_FEATURES = [
  { icon: Wallet, label: 'Finanzas, tareas y hábitos en un solo lugar' },
  { icon: Flame, label: 'Rachas y hábitos compartidos con amigos' },
  { icon: Sparkles, label: 'Un asistente de IA que conoce tus propios datos' },
];

const schema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await authApi<{ user: AuthUser; accessToken: string; refreshToken: string }>(
        '/api/auth/login',
        data,
      );
      setSession(res);
      // Marca la navegación como "recién logueado" para que el Dashboard
      // dispare su animación de aparición solo esta vez.
      navigate('/dashboard', { state: { justLoggedIn: true } });
    } catch (err: any) {
      toast.error(err.message ?? 'Error al iniciar sesión');
      setLoading(false);
    }
  }

  function fillDemo() {
    setValue('email', 'demo@lifeos.app');
    setValue('password', 'demo1234');
  }

  return (
    <AuthShell mode="login" title="Bienvenido de nuevo" subtitle="Inicia sesión en tu Life OS">
      <form onSubmit={handleSubmit(onSubmit)} className="auth-stagger space-y-5">
        <Field label="Correo" error={errors.email?.message}>
          <AuthIconField icon={Mail}>
            <input
              className="input-glass"
              type="email"
              placeholder="tu@ejemplo.com"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              {...register('email')}
            />
          </AuthIconField>
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <AuthIconField icon={Lock}>
            <PasswordInput
              className="input-glass"
              placeholder="••••••••"
              autoComplete="current-password"
              enterKeyHint="go"
              {...register('password')}
            />
          </AuthIconField>
        </Field>
        <Link
          to="/forgot-password"
          className="inline-block text-sm text-white/60 transition hover:text-primary"
        >
          ¿Olvidaste tu contraseña?
        </Link>
        <button
          type="submit"
          className="auth-btn"
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Iniciar sesión'}
        </button>
      </form>
      <button onClick={fillDemo} className="mt-5 w-full text-center text-sm text-white/60 transition hover:text-white">
        Usar cuenta demo (demo@lifeos.app / demo1234)
      </button>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  mode,
  children,
}: {
  title: string;
  subtitle: string;
  mode: 'login' | 'register' | 'none';
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[100dvh] overflow-hidden">
      <AuthBackdrop />

      {/* Panel de marca — solo desktop (lg+) */}
      <div className="relative z-10 hidden flex-1 flex-col justify-center p-14 lg:flex xl:p-20">
        <div className="auth-logo-in absolute left-14 top-8 xl:left-20">
          <LogoLockup width={260} />
        </div>
        <div className="auth-head-in max-w-xl">
          <h2 className="font-display text-4xl font-bold leading-[1.1] text-white xl:text-[3.25rem]">
            Tu vida, <span className="auth-gradient-text">ordenada</span> en un solo lugar
          </h2>
          <p className="mt-5 max-w-md text-base text-white/60 xl:text-lg">
            Hábitos, finanzas, tareas, metas y bienestar — sincronizado y siempre a mano.
          </p>
          <ul className="mt-10 space-y-3.5">
            {BRAND_FEATURES.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-[0.95rem] text-white/70">
                <Icon size={18} className="shrink-0 text-primary" />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <p className="absolute bottom-8 left-14 text-xs text-white/35 xl:left-20">© {new Date().getFullYear()} Life OS</p>
      </div>

      {/* Formulario — sin tarjeta, directo sobre el fondo */}
      <div className="relative z-10 flex w-full items-center justify-center px-6 py-10 sm:p-10 lg:w-[44%] lg:max-w-[38rem] lg:border-l lg:border-white/[0.07] lg:bg-black/20 lg:p-12 xl:p-16">
        <div className="w-full max-w-sm">
          {/* Marca (móvil/tablet) */}
          <div className="auth-logo-in mb-10 flex justify-center lg:hidden">
            <LogoLockup width={230} className="sm:w-[260px]" />
          </div>

          <div className="auth-head-in mb-8 text-center lg:text-left">
            <h1 className="font-display text-[1.75rem] font-bold leading-tight text-white sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-base text-white/60">{subtitle}</p>}
          </div>

          {children}

          {mode !== 'none' && (
            <p className="mt-8 text-center text-sm text-white/65 sm:text-base lg:text-left">
              {mode === 'login' ? (
                <>
                  ¿Nuevo por aquí?{' '}
                  <Link to="/register" className="font-semibold text-white transition hover:text-primary">
                    Regístrate
                  </Link>
                </>
              ) : (
                <>
                  ¿Ya tienes cuenta?{' '}
                  <Link to="/login" className="font-semibold text-white transition hover:text-primary">
                    Inicia sesión
                  </Link>
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
