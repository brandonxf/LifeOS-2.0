import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Logo, Ambient, AppLoader } from '../components/Brand';
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
      setSession(res);
      // Quita el login y muestra la animación de carga antes de entrar.
      setEntering(true);
      await new Promise((r) => setTimeout(r, 1300));
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Error al iniciar sesión');
      setLoading(false);
    }
  }

  function fillDemo() {
    setValue('email', 'demo@lifeos.app');
    setValue('password', 'demo1234');
  }

  if (entering) return <AppLoader label="Entrando a tu Life OS…" />;

  return (
    <AuthShell title="Bienvenido de nuevo" subtitle="Inicia sesión en tu Life OS">
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
      <p className="mt-6 text-center text-sm text-slate-400">
        ¿No tienes cuenta?{' '}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Regístrate
        </Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-950 p-4">
      <Ambient />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 rounded-[20px] shadow-glow">
            <Logo size={60} />
          </div>
          <h1 className="font-display text-[1.7rem] font-extrabold leading-tight tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-2xl backdrop-blur-xl">
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-slate-600">
          Tu vida, organizada · <span className="font-display font-semibold text-slate-500">Life&nbsp;OS</span>
        </p>
      </div>
    </div>
  );
}
