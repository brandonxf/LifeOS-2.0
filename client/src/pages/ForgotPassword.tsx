import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail } from 'lucide-react';
import { authApi } from '../lib/api';
import { Field, Spinner } from '../components/ui';
import { AuthShell } from './Login';
import { AuthIconField } from '../components/AuthScene';

const schema = z.object({
  email: z.string().email('Ingresa un correo válido'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPassword() {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      // Siempre responde ok (exista o no la cuenta) — no es un error nuestro que mostrar.
      await authApi('/api/auth/forgot-password', data);
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  if (sent) {
    return (
      <AuthShell mode="none" title="Revisa tu correo" subtitle="">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Mail className="h-6 w-6" />
          </span>
          <p className="text-white/70">
            Si hay una cuenta con ese correo, te mandamos un link para elegir una nueva
            contraseña. Revisa también la carpeta de spam — vence en 30 minutos.
          </p>
          <Link to="/login" className="font-bold text-white transition hover:text-primary">
            Volver a iniciar sesión
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell mode="none" title="¿Olvidaste tu contraseña?" subtitle="Te mandamos un link para elegir una nueva">
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
              enterKeyHint="send"
              {...register('email')}
            />
          </AuthIconField>
        </Field>
        <button
          type="submit"
          className="auth-btn"
          disabled={loading}
        >
          {loading ? <Spinner /> : 'Mandar link'}
        </button>
      </form>
      <p className="mt-8 text-center text-sm text-white/60 sm:text-base lg:text-left">
        <Link to="/login" className="font-bold text-white transition hover:text-primary">
          ← Volver a iniciar sesión
        </Link>
      </p>
    </AuthShell>
  );
}
