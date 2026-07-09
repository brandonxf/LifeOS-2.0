import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Logo, Ambient, AppLoader, AuthArt } from '../components/Brand';
import { authApi } from '../lib/api';
import { useAuth, type AuthUser } from '../store/auth';
import { Field, Spinner } from '../components/ui';
import { cn } from '../lib/utils';

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Correo" error={errors.email?.message}>
          <input className="input" type="email" placeholder="tu@ejemplo.com" {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <input className="input" type="password" placeholder="••••••••" {...register('password')} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Iniciar sesión'}
        </button>
      </form>
      <button onClick={fillDemo} className="btn-ghost mt-3 w-full text-xs">
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
  const tab = (to: string, label: string, active: boolean) => (
    <Link
      to={to}
      className={cn(
        'rounded-full px-4 py-1.5 transition-colors',
        active ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-slate-400 hover:text-white',
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 p-4">
      <Ambient />
      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 shadow-2xl md:grid-cols-2">
        {/* Panel de marca */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 p-10 text-white md:flex">
          <div className="flex justify-center">
            <Logo size={40} />
          </div>
          <div className="max-w-[16rem]">
            <h2 className="font-display text-[1.7rem] font-bold leading-snug">Toma el mando de tu vida.</h2>
            <p className="mt-2 text-sm text-white/80">
              Finanzas, tareas, hábitos, metas y más — todo en un solo lugar.
            </p>
          </div>
          <AuthArt className="mx-auto w-56 text-white/90" />
        </div>

        {/* Panel de formulario */}
        <div className="relative bg-ink-900 p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-3">
            <div className="md:hidden">
              <Logo size={32} />
            </div>
            <div className="ml-auto inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-sm font-semibold">
              {tab('/login', 'Iniciar sesión', mode === 'login')}
              {tab('/register', 'Registrarse', mode === 'register')}
            </div>
          </div>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-extrabold text-white">{title}</h1>
            <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
