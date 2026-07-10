import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, Dumbbell, Droplet, Moon, Scale, HeartPulse } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Modal, Field, EmptyState, Card } from '../components/ui';
import { cn } from '../lib/utils';
import type { HealthLog, HealthSummary } from '../lib/types';

const METRICS = {
  workout: { label: 'Ejercicio', unit: 'min', icon: Dumbbell, color: '#0D9488' },
  water: { label: 'Agua', unit: 'L', icon: Droplet, color: '#22c55e' },
  sleep: { label: 'Sueño', unit: 'horas', icon: Moon, color: '#e879f9' },
  weight: { label: 'Peso', unit: 'kg', icon: Scale, color: '#D97706' },
} as const;

type MetricType = keyof typeof METRICS;

export default function Health() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [presetType, setPresetType] = useState<MetricType>('water');

  const summary = useQuery({ queryKey: ['health', 'summary'], queryFn: () => api<HealthSummary>('/api/health/summary') });
  const logs = useQuery({ queryKey: ['health', 'logs'], queryFn: () => api<HealthLog[]>('/api/health/logs') });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/health/logs/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health'] }); toast.success('Registro eliminado'); },
  });

  function openLog(type: MetricType) { setPresetType(type); setModalOpen(true); }

  return (
    <div className="space-y-6">
      <SectionTitle title="Salud" subtitle="Registra tu ejercicio, agua, sueño y peso"
        action={<button onClick={() => openLog('water')} className="btn-primary"><Plus className="h-4 w-4" /> Registrar</button>} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(METRICS) as MetricType[]).map((type) => {
          const m = METRICS[type];
          const data = summary.data?.[type];
          const avg = data ? data.total / data.count : 0;
          return (
            <Card key={type} className="cursor-pointer transition hover:ring-2 hover:ring-primary/30" >
              <div onClick={() => openLog(type)}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}22`, color: m.color }}>
                    <m.icon className="h-5 w-5" />
                  </div>
                  <Plus className="h-4 w-4 text-slate-300" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{m.label}</p>
                {summary.isLoading ? (
                  <Skeleton className="mt-1 h-7 w-16" />
                ) : (
                  <p className="mt-1 text-2xl font-bold">
                    {data ? (type === 'workout' ? Math.round(data.total) : avg.toFixed(1)) : '—'}
                    <span className="ml-1 text-sm font-normal text-slate-400">{m.unit}</span>
                  </p>
                )}
                <p className="text-xs text-slate-400">{type === 'workout' ? 'total 7 días' : 'promedio 7 días'}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Per-metric charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(Object.keys(METRICS) as MetricType[]).map((type) => {
          const m = METRICS[type];
          const series = summary.data?.[type]?.series ?? [];
          return (
            <Card key={type}>
              <div className="mb-3 flex items-center gap-2">
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
                <h3 className="font-semibold">{m.label}</h3>
              </div>
              {summary.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : series.length ? (
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={series.map((s) => ({ date: format(parseISO(s.date), 'MMM d'), value: s.value }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={30} />
                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} formatter={(v: number) => `${v} ${m.unit}`} />
                    <Line type="monotone" dataKey="value" stroke={m.color} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-12 text-center text-sm text-slate-400">Aún no hay registros de {m.label.toLowerCase()}</p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Recent logs */}
      <Card>
        <h3 className="mb-4 font-semibold">Registros recientes</h3>
        {logs.isLoading ? (
          <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : logs.data?.length ? (
          <div className="divide-y">
            {logs.data.slice(0, 15).map((l) => {
              const m = METRICS[l.type];
              return (
                <div key={l.id} className="flex items-center gap-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: `${m.color}22`, color: m.color }}>
                    <m.icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-sm">{m.label}</span>
                  <span className="text-sm font-semibold">{Number(l.value)} {l.unit}</span>
                  <span className="text-xs text-slate-400">{format(parseISO(l.date), 'MMM d')}</span>
                  <button onClick={() => del.mutate(l.id)} className="text-slate-400 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={HeartPulse} title="Sin registros de salud" description="Toca una tarjeta de métrica arriba para registrar datos." />
        )}
      </Card>

      <LogModal open={modalOpen} onClose={() => setModalOpen(false)} presetType={presetType} />
    </div>
  );
}

function LogModal({ open, onClose, presetType }: { open: boolean; onClose: () => void; presetType: MetricType }) {
  const qc = useQueryClient();
  const [type, setType] = useState<MetricType>(presetType);
  const [value, setValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { if (open) { setType(presetType); setValue(''); setDate(new Date().toISOString().slice(0, 10)); } }, [open, presetType]);

  const save = useMutation({
    mutationFn: () => api('/api/health/logs', { method: 'POST', body: { type, value: Number(value), unit: METRICS[type].unit, date } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['health'] }); toast.success('¡Registrado!'); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="Registrar datos de salud">
      <form onSubmit={(e) => { e.preventDefault(); if (!value) return toast.error('Ingresa un valor'); save.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(METRICS) as MetricType[]).map((t) => {
            const m = METRICS[t];
            return (
              <button key={t} type="button" onClick={() => setType(t)}
                className={cn('flex items-center gap-2 rounded-xl border py-2.5 pl-3 text-sm font-medium', type === t ? 'border-primary bg-primary/10 text-primary' : 'text-slate-500')}>
                <m.icon className="h-4 w-4" /> {m.label}
              </button>
            );
          })}
        </div>
        <Field label={`Valor (${METRICS[type].unit})`}><input className="input" type="number" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" /></Field>
        <Field label="Fecha"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>Guardar registro</button>
      </form>
    </Modal>
  );
}
