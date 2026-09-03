import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LogOut, User, Crown, Shield, Pencil, KeyRound, MapPin, Phone, Cake, Bell, Fingerprint, Palette, Plus, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { api, ApiError } from '../lib/api';
import { useAuth, type AuthUser } from '../store/auth';
import { SectionTitle, Card, Modal, Field } from '../components/ui';
import { ColorWheel } from '../components/ColorWheel';
import { cn } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import { Capacitor } from '@capacitor/core';
import { useSettings } from '../store/settings';
import { ACCENTS } from '../lib/accents';
import {
  cancelDailyHabitReminder,
  ensureNotificationPermission,
  scheduleDailyHabitReminder,
} from '../lib/notifications';
import { isBiometricAvailable, verifyBiometric } from '../lib/biometric';
import { confirm } from '../store/confirm';

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(120),
  email: z.string().email('Email no válido'),
  username: z
    .string()
    .regex(/^[a-zA-Z0-9_]{3,30}$/, '3-30 caracteres: letras, números o _')
    .or(z.literal('')),
  avatar: z.string().url('Debe ser una URL válida').max(2048).or(z.literal('')),
  bio: z.string().max(500, 'Máximo 500 caracteres').or(z.literal('')),
  birthDate: z.string().or(z.literal('')),
  location: z.string().max(120).or(z.literal('')),
  phone: z.string().max(40).or(z.literal('')),
  pronouns: z.string().max(40).or(z.literal('')),
});
type ProfileForm = z.infer<typeof profileSchema>;

/** Edad en años a partir de una fecha ISO YYYY-MM-DD. */
function ageFrom(iso: string): number {
  const b = parseISO(iso);
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Ingresa tu contraseña actual'),
    newPassword: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });
type PasswordForm = z.infer<typeof passwordSchema>;

/** Interruptor simple estilo iOS (usa los colores del theme). */
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full p-0 transition-colors',
        checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[20px]' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function AppearanceCard() {
  const {
    accent, customAccentHex, setAccent, setCustomAccent,
    performanceModeEnabled, setPerformanceModeEnabled,
  } = useSettings();
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 font-semibold"><Palette className="h-4 w-4" /> Apariencia</h3>
      <p className="mb-4 text-sm text-slate-400">Elige el color de acento de la app, o crea el tuyo con la rueda de color.</p>
      <div className="flex flex-wrap gap-3">
        {ACCENTS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => setAccent(a.key)}
            aria-label={a.label}
            aria-pressed={!customAccentHex && accent === a.key}
            title={a.label}
            className={cn(
              'h-10 w-10 rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-ink-900',
              !customAccentHex && accent === a.key && 'ring-2 ring-slate-900 dark:ring-white',
            )}
            style={{ backgroundColor: a.swatch }}
          />
        ))}
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          aria-label="Color personalizado"
          aria-pressed={!!customAccentHex}
          title="Color personalizado"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 ring-offset-white transition dark:ring-offset-ink-900',
            customAccentHex ? 'ring-2 ring-slate-900 dark:ring-white' : 'border-2 border-dashed border-slate-300 dark:border-white/20',
          )}
          style={
            customAccentHex
              ? { backgroundColor: customAccentHex }
              : { background: 'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }
          }
        >
          {!customAccentHex && <Plus className="h-4 w-4 text-white drop-shadow" />}
        </button>
      </div>

      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title="Color personalizado">
        <ColorWheel
          initialValue={customAccentHex ?? '#37e779'}
          onChangeEnd={setCustomAccent}
        />
      </Modal>

      <div className="mt-4 flex items-center justify-between gap-4 border-t pt-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-slate-400" />
          <div>
            <p className="text-sm font-medium">Modo rendimiento</p>
            <p className="text-xs text-slate-400">Desactiva desenfoques y fondos animados para que la app vaya más fluida en celulares de gama media o baja.</p>
          </div>
        </div>
        <Toggle
          checked={performanceModeEnabled}
          onChange={(v) => {
            setPerformanceModeEnabled(v);
            toast.success(v ? 'Modo rendimiento activado' : 'Modo rendimiento desactivado');
          }}
        />
      </div>
    </Card>
  );
}

function PreferencesCard() {
  const native = Capacitor.isNativePlatform();
  const {
    taskRemindersEnabled, setTaskRemindersEnabled,
    habitReminderEnabled, setHabitReminderEnabled,
    habitReminderTime, setHabitReminderTime,
    biometricLockEnabled, setBiometricLockEnabled,
  } = useSettings();

  async function onToggleTaskReminders(v: boolean) {
    if (v) {
      const granted = await ensureNotificationPermission();
      if (!granted) return toast.error('Necesitas dar permiso de notificaciones');
    }
    setTaskRemindersEnabled(v);
  }

  async function onToggleHabitReminder(v: boolean) {
    if (v) {
      const granted = await ensureNotificationPermission();
      if (!granted) return toast.error('Necesitas dar permiso de notificaciones');
      await scheduleDailyHabitReminder(habitReminderTime);
    } else {
      await cancelDailyHabitReminder();
    }
    setHabitReminderEnabled(v);
  }

  async function onChangeHabitTime(time: string) {
    setHabitReminderTime(time);
    if (habitReminderEnabled) await scheduleDailyHabitReminder(time);
  }

  async function onToggleBiometric(v: boolean) {
    if (v) {
      const available = await isBiometricAvailable();
      if (!available) return toast.error('Este dispositivo no tiene huella/rostro configurado');
      const ok = await verifyBiometric();
      if (!ok) return toast.error('No se pudo verificar tu identidad');
    }
    setBiometricLockEnabled(v);
    toast.success(v ? 'Bloqueo biométrico activado' : 'Bloqueo biométrico desactivado');
  }

  if (!native) {
    return (
      <Card>
        <h3 className="mb-1 flex items-center gap-2 font-semibold"><Bell className="h-4 w-4" /> Notificaciones y seguridad</h3>
        <p className="text-sm text-slate-400">Estas opciones solo están disponibles en la app de Android.</p>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 flex items-center gap-2 font-semibold"><Bell className="h-4 w-4" /> Notificaciones y seguridad</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Recordatorios de tareas</p>
            <p className="text-xs text-slate-400">Aviso a las 9am el día que vence una tarea</p>
          </div>
          <Toggle checked={taskRemindersEnabled} onChange={onToggleTaskReminders} />
        </div>

        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <div>
            <p className="text-sm font-medium">Recordatorio diario de hábitos</p>
            <p className="text-xs text-slate-400">Un aviso para revisar tu checklist de hábitos</p>
          </div>
          <Toggle checked={habitReminderEnabled} onChange={onToggleHabitReminder} />
        </div>
        {habitReminderEnabled && (
          <div className="flex items-center justify-between gap-4 pl-1">
            <p className="text-xs text-slate-400">Hora del recordatorio</p>
            <input
              type="time"
              className="input w-auto py-1.5"
              value={habitReminderTime}
              onChange={(e) => onChangeHabitTime(e.target.value)}
            />
          </div>
        )}

        <div className="flex items-center justify-between gap-4 border-t pt-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium">Bloqueo biométrico</p>
              <p className="text-xs text-slate-400">Pide huella/rostro al abrir la app</p>
            </div>
          </div>
          <Toggle checked={biometricLockEnabled} onChange={onToggleBiometric} />
        </div>
      </div>
    </Card>
  );
}

export default function Settings() {
  const { user, clear, refreshToken, setUser } = useAuth();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);

  // Refresh profile from the server.
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await api<{ user: AuthUser }>('/api/auth/me');
      setUser(res.user);
      return res.user;
    },
  });

  async function logout() {
    const ok = await confirm({
      title: 'Cerrar sesión',
      message: '¿Seguro que quieres cerrar tu sesión?',
      confirmLabel: 'Cerrar sesión',
      danger: true,
    });
    if (!ok) return;
    try {
      if (refreshToken) await api('/api/auth/logout', { method: 'POST', body: { refreshToken } });
    } catch { /* ignore */ }
    clear();
    navigate('/login');
    toast.success('Sesión cerrada');
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionTitle title="Ajustes" subtitle="Gestiona tu cuenta y preferencias" />

      {/* Profile */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold"><User className="h-4 w-4" /> Perfil</h3>
          <button className="btn-ghost" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-primary/15 text-2xl font-bold text-primary">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              user?.name?.[0]?.toUpperCase()
            )}
          </div>
          <div>
            <p className="text-lg font-semibold">
              {user?.name}
              {user?.pronouns && <span className="ml-2 text-sm font-normal text-slate-400">({user.pronouns})</span>}
            </p>
            {user?.username && <p className="text-sm text-primary">@{user.username}</p>}
            <p className="text-sm text-slate-400">{user?.email}</p>
            <p className="mt-1 text-xs capitalize text-slate-400">
              Miembro desde {user?.createdAt ? format(parseISO(user.createdAt), 'MMMM yyyy') : '—'}
            </p>
          </div>
        </div>

        {user?.bio && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{user.bio}</p>}

        {(user?.location || user?.phone || user?.birthDate) && (
          <div className="mt-4 grid grid-cols-1 gap-2 border-t pt-4 text-sm sm:grid-cols-2">
            {user?.location && (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <MapPin className="h-4 w-4 shrink-0" /> {user.location}
              </div>
            )}
            {user?.phone && (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Phone className="h-4 w-4 shrink-0" /> {user.phone}
              </div>
            )}
            {user?.birthDate && (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Cake className="h-4 w-4 shrink-0" />
                {format(parseISO(user.birthDate), "d 'de' MMMM yyyy")}
                <span className="text-slate-400">· {ageFrom(user.birthDate)} años</span>
              </div>
            )}
          </div>
        )}
      </Card>

      <AppearanceCard />

      {/* Plan */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><Crown className="h-4 w-4" /> Plan</h3>
        <div className="flex items-center justify-between rounded-xl border p-4">
          <div>
            <p className="font-semibold capitalize">Plan {user?.plan}</p>
            <p className="text-sm text-slate-400">
              {user?.plan === 'pro' ? 'Tienes acceso a todas las funciones.' : 'Mejora tu plan para desbloquear chats de IA ilimitados.'}
            </p>
          </div>
          {user?.plan === 'pro' ? (
            <span className="chip bg-primary/10 text-primary"><Crown className="h-3 w-3" /> Pro</span>
          ) : (
            <button className="btn-primary" onClick={() => toast('Los pagos no están configurados en esta demo')}>Mejorar plan</button>
          )}
        </div>
      </Card>

      <PreferencesCard />

      {/* Security / session */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 font-semibold"><Shield className="h-4 w-4" /> Seguridad</h3>
        <p className="mb-4 text-sm text-slate-400">
          Iniciaste sesión con un token de refresco rotativo. Cambiar la contraseña cierra la sesión en todos los dispositivos.
        </p>
        <div className="space-y-2">
          <button onClick={() => setPwdOpen(true)} className="btn-ghost w-full border">
            <KeyRound className="h-4 w-4" /> Cambiar contraseña
          </button>
          <button onClick={logout} className="btn-danger w-full">
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </button>
        </div>
      </Card>

      {editOpen && (
        <EditProfileModal
          user={user}
          onClose={() => setEditOpen(false)}
          onSaved={(u) => {
            setUser(u);
            setEditOpen(false);
          }}
        />
      )}

      {pwdOpen && (
        <ChangePasswordModal
          onClose={() => setPwdOpen(false)}
          onDone={async () => {
            setPwdOpen(false);
            toast.success('Contraseña actualizada. Inicia sesión de nuevo.');
            clear();
            navigate('/login');
          }}
        />
      )}
    </div>
  );
}

function EditProfileModal({
  user,
  onClose,
  onSaved,
}: {
  user: AuthUser | null;
  onClose: () => void;
  onSaved: (u: AuthUser) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      username: user?.username ?? '',
      avatar: user?.avatar ?? '',
      bio: user?.bio ?? '',
      birthDate: user?.birthDate ?? '',
      location: user?.location ?? '',
      phone: user?.phone ?? '',
      pronouns: user?.pronouns ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      api<{ user: AuthUser }>('/api/auth/me', { method: 'PATCH', body: data }),
    onSuccess: (res) => {
      toast.success('Perfil actualizado');
      onSaved(res.user);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo actualizar el perfil');
    },
  });

  return (
    <Modal open onClose={onClose} title="Editar perfil" wide>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" error={errors.name?.message}>
            <input className="input" {...register('name')} />
          </Field>
          <Field label="Nombre de usuario" error={errors.username?.message}>
            <input className="input" placeholder="tu_usuario" {...register('username')} />
          </Field>
        </div>
        <Field label="Email" error={errors.email?.message}>
          <input className="input" type="email" {...register('email')} />
        </Field>
        <Field label="Sobre mí" error={errors.bio?.message}>
          <textarea className="input min-h-[80px] resize-y" placeholder="Cuéntanos algo sobre ti…" {...register('bio')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Fecha de nacimiento" error={errors.birthDate?.message}>
            <input className="input" type="date" {...register('birthDate')} />
          </Field>
          <Field label="Pronombres" error={errors.pronouns?.message}>
            <input className="input" placeholder="él/ella/elle" {...register('pronouns')} />
          </Field>
          <Field label="Ubicación" error={errors.location?.message}>
            <input className="input" placeholder="Ciudad, País" {...register('location')} />
          </Field>
          <Field label="Teléfono" error={errors.phone?.message}>
            <input className="input" type="tel" placeholder="+52 …" {...register('phone')} />
          </Field>
        </div>
        <Field label="URL de avatar (opcional)" error={errors.avatar?.message}>
          <input className="input" placeholder="https://…" {...register('avatar')} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ChangePasswordModal({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const mutation = useMutation({
    mutationFn: (data: PasswordForm) =>
      api('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword: data.currentPassword, newPassword: data.newPassword },
      }),
    onSuccess: () => onDone(),
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'No se pudo cambiar la contraseña');
    },
  });

  return (
    <Modal open onClose={onClose} title="Cambiar contraseña">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
        <Field label="Contraseña actual" error={errors.currentPassword?.message}>
          <input className="input" type="password" {...register('currentPassword')} />
        </Field>
        <Field label="Nueva contraseña" error={errors.newPassword?.message}>
          <input className="input" type="password" {...register('newPassword')} />
        </Field>
        <Field label="Confirmar nueva contraseña" error={errors.confirmPassword?.message}>
          <input className="input" type="password" {...register('confirmPassword')} />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={mutation.isPending}>
            {mutation.isPending ? 'Guardando…' : 'Cambiar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
