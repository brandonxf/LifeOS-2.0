import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Trash2, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SectionTitle, Modal, Field } from '../components/ui';
import { cn } from '../lib/utils';
import type { CalendarEvent } from '../lib/types';

const EVENT_COLORS = ['#c4f82a', '#22c55e', '#0d9488', '#f59e0b', '#f43f5e', '#e879f9'];
const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function Calendar() {
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<'month' | 'week'>('month');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);

  const rangeStart = view === 'month' ? startOfWeek(startOfMonth(cursor)) : startOfWeek(cursor);
  const rangeEnd = view === 'month' ? endOfWeek(endOfMonth(cursor)) : endOfWeek(cursor);
  const days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const events = useQuery({
    queryKey: ['events', rangeStart.toISOString(), rangeEnd.toISOString()],
    queryFn: () =>
      api<CalendarEvent[]>('/api/calendar/events', {
        query: { start: rangeStart.toISOString(), end: addDays(rangeEnd, 1).toISOString() },
      }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/calendar/events/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success('Evento eliminado'); },
  });

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events.data ?? []) {
      const key = e.startTime.slice(0, 10);
      (map[key] ??= []).push(e);
    }
    return map;
  }, [events.data]);

  function openDay(day: Date) {
    setSelectedDay(day);
    setEditing(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Calendario"
        subtitle={format(cursor, 'MMMM yyyy')}
        action={
          <button onClick={() => openDay(new Date())} className="btn-primary"><Plus className="h-4 w-4" /> Nuevo evento</button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setCursor(view === 'month' ? subMonths(cursor, 1) : addDays(cursor, -7))} className="btn-ghost border"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setCursor(new Date())} className="btn-ghost border">Hoy</button>
          <button onClick={() => setCursor(view === 'month' ? addMonths(cursor, 1) : addDays(cursor, 7))} className="btn-ghost border"><ChevronRight className="h-4 w-4" /></button>
        </div>
        <div className="flex rounded-xl border p-1">
          {(['month', 'week'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn('rounded-lg px-3 py-1.5 text-sm', view === v && 'bg-primary/10 text-primary')}>{v === 'month' ? 'Mes' : 'Semana'}</button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-white dark:bg-slate-900">
        <div className="grid grid-cols-7 border-b bg-slate-50 text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50">
          {WEEKDAYS.map((d) => <div key={d} className="py-2">{d}</div>)}
        </div>
        <div className={cn('grid grid-cols-7', view === 'month' ? 'grid-rows-6' : 'grid-rows-1')}>
          {days.map((day) => {
            const key = day.toISOString().slice(0, 10);
            const dayEvents = eventsByDay[key] ?? [];
            const outside = view === 'month' && !isSameMonth(day, cursor);
            return (
              <div
                key={key}
                onClick={() => openDay(day)}
                className={cn(
                  'group relative min-h-[96px] cursor-pointer border-b border-r p-1.5 transition hover:bg-slate-50 dark:hover:bg-slate-800/50',
                  outside && 'bg-slate-50/50 text-slate-400 dark:bg-slate-950/30',
                  view === 'week' && 'min-h-[400px]',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-sm', isToday(day) && 'bg-primary font-bold text-ink-950')}>
                    {format(day, 'd')}
                  </span>
                </div>
                <div className="mt-1 space-y-1">
                  {dayEvents.slice(0, view === 'week' ? 20 : 3).map((e) => (
                    <div
                      key={e.id}
                      onClick={(ev) => { ev.stopPropagation(); setEditing(e); setSelectedDay(day); setModalOpen(true); }}
                      className="truncate rounded px-1.5 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: `${e.color}26`, color: e.color }}
                      title={e.title}
                    >
                      {!e.allDay && format(parseISO(e.startTime), 'HH:mm')} {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && view === 'month' && (
                    <div className="px-1.5 text-xs text-slate-400">+{dayEvents.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        day={selectedDay ?? new Date()}
        editing={editing}
        onDelete={(id) => { del.mutate(id); setModalOpen(false); }}
      />
    </div>
  );
}

function EventModal({
  open, onClose, day, editing, onDelete,
}: {
  open: boolean; onClose: () => void; day: Date; editing: CalendarEvent | null; onDelete: (id: string) => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [color, setColor] = useState('#c4f82a');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [dateStr, setDateStr] = useState(format(day, 'yyyy-MM-dd'));

  useEffect(() => {
    if (open) {
      if (editing) {
        setTitle(editing.title);
        setLocation(editing.location ?? '');
        setColor(editing.color);
        setStart(format(parseISO(editing.startTime), 'HH:mm'));
        setEnd(format(parseISO(editing.endTime), 'HH:mm'));
        setDateStr(editing.startTime.slice(0, 10));
      } else {
        setTitle(''); setLocation(''); setColor('#c4f82a'); setStart('09:00'); setEnd('10:00');
        setDateStr(format(day, 'yyyy-MM-dd'));
      }
    }
  }, [open, editing, day]);

  const save = useMutation({
    mutationFn: () => {
      const startTime = new Date(`${dateStr}T${start}:00`).toISOString();
      const endTime = new Date(`${dateStr}T${end}:00`).toISOString();
      const body = { title, location, color, startTime, endTime, allDay: false };
      return editing
        ? api(`/api/calendar/events/${editing.id}`, { method: 'PUT', body })
        : api('/api/calendar/events', { method: 'POST', body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['events'] }); toast.success(editing ? 'Evento actualizado' : 'Evento creado'); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar evento' : 'Nuevo evento'}>
      <form onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return toast.error('El título es obligatorio'); save.mutate(); }} className="space-y-4">
        <Field label="Título"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre del evento" /></Field>
        <Field label="Fecha"><input className="input" type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Inicio"><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Fin"><input className="input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Ubicación"><input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Opcional" /></Field>
        <Field label="Color">
          <div className="flex gap-2">
            {EVENT_COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} className={cn('h-8 w-8 rounded-full ring-offset-2 dark:ring-offset-slate-900', color === c && 'ring-2 ring-primary')} style={{ backgroundColor: c }} />
            ))}
          </div>
        </Field>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary flex-1" disabled={save.isPending}>{editing ? 'Guardar' : 'Crear'}</button>
          {editing && <button type="button" onClick={() => onDelete(editing.id)} className="btn-danger"><Trash2 className="h-4 w-4" /></button>}
        </div>
      </form>
    </Modal>
  );
}
