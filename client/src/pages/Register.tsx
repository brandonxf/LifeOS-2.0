import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '../lib/api';
import { useAuth, type AuthUser } from '../store/auth';
import { Field, PasswordInput, Spinner } from '../components/ui';
import { AuthShell } from './Login';
import { AuthIconField } from '../components/AuthScene';
import { User, Mail, Lock } from 'lucide-react';

const schema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Ingresa un correo válido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});
type FormData = z.infer<typeof schema>;

export default function Register() {
  const navigate = useNavigate();
  const setSession = useAuth((s) => s.setSession);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await authApi<{ user: AuthUser; accessToken: string; refreshToken: string }>(
        '/api/auth/register',
        data,
      );
      setSession(res);
      toast.success('¡Cuenta creada! Bienvenido a Life OS.');
      navigate('/dashboard', { state: { justLoggedIn: true } });
    } catch (err: any) {
      toast.error(err.message ?? 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="register" title="Crea tu cuenta" subtitle="Empieza a organizar tu vida">
      <form onSubmit={handleSubmit(onSubmit)} className="auth-stagger space-y-5">
        <Field label="Nombre" error={errors.name?.message}>
          <AuthIconField icon={User}>
            <input className="input-glass" placeholder="Juan Pérez" autoComplete="name" enterKeyHint="next" {...register('name')} />
          </AuthIconField>
        </Field>
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
            <PasswordInput className="input-glass" placeholder="Mínimo 8 caracteres" autoComplete="new-password" enterKeyHint="go" {...register('password')} />
          </AuthIconField>
        </Field>
        <button
          type="submit"
          className="auth-btn"
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  );
}
