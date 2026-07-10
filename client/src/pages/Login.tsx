import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Logo, AuthBackdrop, AppLoader } from '../components/Brand';
import { authApi } from '../lib/api';
import { useAuth, type AuthUser } from '../store/auth';
import { Field, Spinner } from '../components/ui';

const schema = z.object({
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(1, 'La contraseña es obligatoria'),
});
type FormData = z.infer<typeof schema>;

export default function Login() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const [entering, setEntering] = useState(false);
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
      // Muestra el loader ANTES de setear la sesión: si seteáramos la sesión
      // primero, el guard PublicOnly redirigiría a /dashboard y el login se
      // desmontaría sin que el loader llegue a pintarse.
      setEntering(true);
      await new Promise((r) => setTimeout(r, 3200));
      setSession(res); // ahora el usuario queda autenticado → entra a la app
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Error al iniciar sesión');
      setLoading(false);
      setEntering(false);
    }
  }

  function fillDemo() {
    setValue('email', 'demo@lifeos.app');
    setValue('password', 'demo1234');
  }

  if (entering) return <AppLoader label="Entrando a tu Life OS…" />;

  return (
    <AuthShell mode="login" title="Bienvenido de nuevo" subtitle="Inicia sesión en tu Life OS">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Correo" error={errors.email?.message}>
          <input className="input-glass" type="email" placeholder="tu@ejemplo.com" {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <input className="input-glass" type="password" placeholder="••••••••" {...register('password')} />
        </Field>
        <button
          type="button"
          onClick={() => toast('Función próximamente')}
          className="text-sm text-white/60 transition hover:text-primary"
        >
          ¿Olvidaste tu contraseña?
        </button>
        <button
          type="submit"
          className="btn-primary w-full rounded-xl py-3 text-base shadow-glow"
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Iniciar sesión'}
        </button>
      </form>
      <button onClick={fillDemo} className="mt-4 w-full text-center text-xs text-white/50 transition hover:text-white/80">
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
  mode: 'login' | 'register';
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <AuthBackdrop />
      <div className="relative z-10 w-full max-w-md rounded-[32px] border border-white/15 bg-white/[0.06] p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-10">
        {/* Marca */}
        <div className="flex flex-col items-center">
          <Logo size={52} />
          <span className="mt-3 font-display text-sm font-bold tracking-[0.35em] text-white/85">
            LIFE&nbsp;OS
          </span>
        </div>

        <div className="mb-8 mt-6 text-center">
          <h1 className="font-display text-2xl font-bold text-white sm:text-[1.7rem]">{title}</h1>
          <p className="mt-1.5 text-sm text-white/55">{subtitle}</p>
        </div>

        {children}

        <p className="mt-8 text-center text-sm text-white/60">
          {mode === 'login' ? (
            <>
              ¿Nuevo por aquí?{' '}
              <Link to="/register" className="font-bold text-white transition hover:text-primary">
                Regístrate
              </Link>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="font-bold text-white transition hover:text-primary">
                Inicia sesión
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
