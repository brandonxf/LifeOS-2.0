import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { authApi } from '../lib/api';
import { Field, PasswordInput, Spinner } from '../components/ui';
import { AuthShell } from './Login';

const schema = z
  .object({
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.password === d.confirm, { message: 'No coinciden', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      await authApi('/api/auth/reset-password', { token, newPassword: data.password });
      toast.success('Contraseña actualizada — ya puedes iniciar sesión');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message ?? 'Ese link ya no es válido. Pide uno nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell mode="none" title="Link no válido" subtitle="">
        <div className="text-center">
          <p className="text-white/70">Este link está incompleto o ya venció.</p>
          <Link to="/forgot-password" className="mt-4 inline-block font-bold text-white transition hover:text-primary">
            Pedir un link nuevo
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="none" title="Elige tu nueva contraseña" subtitle="">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 lg:space-y-6">
        <Field label="Nueva contraseña" error={errors.password?.message}>
          <PasswordInput className="input-glass" placeholder="••••••••" {...register('password')} />
        </Field>
        <Field label="Confirma la contraseña" error={errors.confirm?.message}>
          <PasswordInput className="input-glass" placeholder="••••••••" {...register('confirm')} />
        </Field>
        <button
          type="submit"
          className="btn-primary w-full rounded-xl py-3.5 text-base shadow-glow sm:py-4 lg:text-lg"
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Guardar contraseña'}
        </button>
      </form>
    </AuthShell>
  );
}
