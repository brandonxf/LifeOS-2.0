import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { LogoLockup, AuthBackdrop, AuthArt } from '../components/Brand';
import { authApi } from '../lib/api';
import { useAuth, type AuthUser } from '../store/auth';
import { Field, PasswordInput, Spinner } from '../components/ui';

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Field label="Correo" error={errors.email?.message}>
          <input className="input-glass" type="email" placeholder="tu@ejemplo.com" {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <PasswordInput className="input-glass" placeholder="••••••••" {...register('password')} />
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
    <div className="relative flex min-h-screen overflow-hidden">
      <AuthBackdrop />

      {/* Panel de marca — solo en desktop (lg+), así el móvil/app nunca lo ve
          y conserva la tarjeta centrada de siempre. */}
      <div className="relative z-10 hidden flex-1 flex-col justify-center gap-10 p-16 lg:flex xl:p-20">
        <LogoLockup width={200} />
        <div className="max-w-md">
          <AuthArt className="mb-10 h-52 w-52 text-primary drop-shadow-[0_0_60px_rgb(var(--primary)/0.35)]" />
          <h2 className="font-display text-4xl font-bold leading-tight text-white xl:text-[2.75rem]">
            Tu vida, ordenada en un solo lugar
          </h2>
          <p className="mt-4 text-base text-white/55">
            Hábitos, finanzas, tareas y bienestar — todo sincronizado y siempre a mano.
          </p>
        </div>
        <p className="text-xs text-white/35">© {new Date().getFullYear()} Life OS</p>
      </div>

      {/* Panel del formulario */}
      <div className="relative z-10 flex w-full items-center justify-center p-4 lg:w-[46%] lg:border-l lg:border-white/10 lg:bg-black/10 lg:p-16">
        <div className="w-full max-w-md rounded-[32px] border border-white/15 bg-white/[0.06] p-8 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-10 lg:max-w-sm lg:p-0 lg:rounded-none lg:border-none lg:bg-transparent lg:shadow-none lg:backdrop-blur-none">
          {/* Marca (móvil/tablet) */}
          <div className="flex flex-col items-center lg:hidden">
            <LogoLockup width={200} />
          </div>

          <div className="mb-8 mt-6 text-center lg:mt-0 lg:text-left">
            <h1 className="font-display text-2xl font-bold text-white sm:text-[1.7rem]">{title}</h1>
            <p className="mt-1.5 text-sm text-white/55">{subtitle}</p>
          </div>

          {children}

          <p className="mt-8 text-center text-sm text-white/60 lg:text-left">
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
    </div>
  );
}
