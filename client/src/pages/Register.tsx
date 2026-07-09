import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '../lib/api';
import { useAuth, type AuthUser } from '../store/auth';
import { Field, Spinner } from '../components/ui';
import { AuthShell } from './Login';

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
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message ?? 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell mode="register" title="Crea tu cuenta" subtitle="Empieza a organizar tu vida">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Field label="Nombre" error={errors.name?.message}>
          <input className="input" placeholder="Juan Pérez" {...register('name')} />
        </Field>
        <Field label="Correo" error={errors.email?.message}>
          <input className="input" type="email" placeholder="tu@ejemplo.com" {...register('email')} />
        </Field>
        <Field label="Contraseña" error={errors.password?.message}>
          <input className="input" type="password" placeholder="Mínimo 8 caracteres" {...register('password')} />
        </Field>
        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? <Spinner /> : 'Crear cuenta'}
        </button>
      </form>
    </AuthShell>
  );
}
