import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Logo } from '../components/Brand';
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
      toast.success(`¡Bienvenido de nuevo, ${res.user.name}!`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function fillDemo() {
    setValue('email', 'demo@lifeos.app');
    setValue('password', 'demo1234');
  }

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
      <p className="mt-6 text-center text-sm text-slate-500">
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-950 via-ink-900 to-primary-900/50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-fit rounded-2xl shadow-glow">
            <Logo size={56} />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-white">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-6 shadow-2xl backdrop-blur">
          {children}
        </div>
      </div>
    </div>
  );
}
