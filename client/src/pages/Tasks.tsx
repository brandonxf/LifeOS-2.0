import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { Plus, Trash2, LayoutGrid, List, CheckSquare, Calendar, Flag } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Modal, Field, EmptyState, Card } from '../components/ui';
import { cn, PRIORITY_STYLES } from '../lib/utils';
import type { Task } from '../lib/types';

const COLUMNS: { id: Task['status']; label: string; accent: string }[] = [
  { id: 'todo', label: 'Por hacer', accent: 'bg-slate-400' },
  { id: 'in_progress', label: 'En progreso', accent: 'bg-primary' },
  { id: 'done', label: 'Hecho', accent: 'bg-success' },
];

const PRIORITY_LABELS: Record<string, string> = {
  low: 'baja', medium: 'media', high: 'alta', urgent: 'urgente',
};

export default function Tasks() {
  const qc = useQueryClient();
  const [view, setView] = useState<'board' | 'list'>('board');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => api<Task[]>('/api/tasks') });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task['status'] }) =>
      api(`/api/tasks/${id}/status`, { method: 'PATCH', body: { status } }),
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks'] });
      const prev = qc.getQueryData<Task[]>(['tasks']);
      qc.setQueryData<Task[]>(['tasks'], (old) => old?.map((t) => (t.id === id ? { ...t, status } : t)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['tasks'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Tarea eliminada'); },
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    (tasks.data ?? []).forEach((t) => t.tags.forEach((tag) => s.add(tag)));
    return [...s];
  }, [tasks.data]);

  const filtered = useMemo(() => {
    return (tasks.data ?? []).filter(
      (t) =>
        (!filterPriority || t.priority === filterPriority) &&
        (!filterTag || t.tags.includes(filterTag)),
    );
  }, [tasks.data, filterPriority, filterTag]);

  function onDragEnd(result: DropResult) {
    const { destination, draggableId, source } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    updateStatus.mutate({ id: draggableId, status: destination.droppableId as Task['status'] });
  }

  const byColumn = (status: Task['status']) => filtered.filter((t) => t.status === status);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Tareas"
        subtitle="Organiza tu trabajo con un tablero kanban"
        action={
          <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary">
            <Plus className="h-4 w-4" /> Nueva tarea
          </button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <select className="input w-auto" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
            <option value="">Todas las prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          {allTags.length > 0 && (
            <select className="input w-auto" value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
              <option value="">Todas las etiquetas</option>
              {allTags.map((t) => <option key={t}>{t}</option>)}
            </select>
          )}
        </div>
        <div className="flex rounded-xl border p-1">
          <button onClick={() => setView('board')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm', view === 'board' && 'bg-primary/10 text-primary')}>
            <LayoutGrid className="h-4 w-4" /> Tablero
          </button>
          <button onClick={() => setView('list')} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm', view === 'list' && 'bg-primary/10 text-primary')}>
            <List className="h-4 w-4" /> Lista
          </button>
        </div>
      </div>

      {tasks.isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : !tasks.data?.length ? (
        <EmptyState icon={CheckSquare} title="Aún no hay tareas" description="Crea tu primera tarea para empezar a organizarte."
          action={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nueva tarea</button>} />
      ) : view === 'board' ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <Droppable droppableId={col.id} key={col.id}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}
                    className={cn('rounded-2xl border bg-slate-100/50 p-3 transition-colors dark:bg-slate-900/50', snapshot.isDraggingOver && 'bg-primary/5 ring-2 ring-primary/30')}>
                    <div className="mb-3 flex items-center gap-2 px-1">
                      <span className={cn('h-2.5 w-2.5 rounded-full', col.accent)} />
                      <h3 className="text-sm font-semibold">{col.label}</h3>
                      <span className="ml-auto rounded-full bg-slate-200 px-2 text-xs font-medium dark:bg-slate-800">{byColumn(col.id).length}</span>
                    </div>
                    <div className="space-y-2">
                      {byColumn(col.id).map((task, index) => (
                        <Draggable draggableId={task.id} index={index} key={task.id}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps} {...prov.dragHandleProps}
                              onClick={() => { setEditing(task); setModalOpen(true); }}
                              className={cn('cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition dark:bg-slate-900', snap.isDragging && 'rotate-1 shadow-lg')}>
                              <TaskCard task={task} onDelete={() => del.mutate(task.id)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {byColumn(col.id).length === 0 && <p className="py-4 text-center text-xs text-slate-400">Arrastra tareas aquí</p>}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((task) => (
              <div key={task.id} className="flex items-center gap-3 py-3">
                <input type="checkbox" checked={task.status === 'done'}
                  onChange={() => updateStatus.mutate({ id: task.id, status: task.status === 'done' ? 'todo' : 'done' })}
                  className="h-4 w-4 accent-primary" />
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => { setEditing(task); setModalOpen(true); }}>
                  <p className={cn('truncate text-sm font-medium', task.status === 'done' && 'text-slate-400 line-through')}>{task.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    <span className={cn('chip', PRIORITY_STYLES[task.priority])}>{PRIORITY_LABELS[task.priority]}</span>
                    {task.dueDate && <span>{format(parseISO(task.dueDate), 'MMM d')}</span>}
                    {task.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                  </div>
                </div>
                <button onClick={() => del.mutate(task.id)} className="text-slate-400 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <TaskModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}

function TaskCard({ task, onDelete }: { task: Task; onDelete: () => void }) {
  const overdue = task.dueDate && isPast(parseISO(task.dueDate)) && !isToday(parseISO(task.dueDate)) && task.status !== 'done';
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="shrink-0 text-slate-300 hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
      </div>
      {task.description && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{task.description}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={cn('chip', PRIORITY_STYLES[task.priority])}>
          <Flag className="h-3 w-3" /> {PRIORITY_LABELS[task.priority]}
        </span>
        {task.dueDate && (
          <span className={cn('chip', overdue ? 'bg-danger/10 text-danger' : 'bg-slate-100 text-slate-500 dark:bg-slate-800')}>
            <Calendar className="h-3 w-3" /> {format(parseISO(task.dueDate), 'MMM d')}
          </span>
        )}
        {task.tags.map((tag) => <span key={tag} className="chip bg-primary/10 text-primary">#{tag}</span>)}
      </div>
    </div>
  );
}

function TaskModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Task | null }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('medium');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [tags, setTags] = useState('');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? '');
      setDescription(editing?.description ?? '');
      setPriority(editing?.priority ?? 'medium');
      setStatus(editing?.status ?? 'todo');
      setTags(editing?.tags.join(', ') ?? '');
      setDueDate(editing?.dueDate ? editing.dueDate.slice(0, 10) : '');
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title,
        description,
        priority,
        status,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      };
      return editing
        ? api(`/api/tasks/${editing.id}`, { method: 'PUT', body })
        : api('/api/tasks', { method: 'POST', body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success(editing ? 'Tarea actualizada' : 'Tarea creada'); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar tarea' : 'Nueva tarea'} wide>
      <form onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return toast.error('El título es obligatorio'); save.mutate(); }} className="space-y-4">
        <Field label="Título"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué hay que hacer?" /></Field>
        <Field label="Descripción"><textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles opcionales" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Prioridad">
            <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Task['priority'])}>
              <option value="low">Baja</option><option value="medium">Media</option><option value="high">Alta</option><option value="urgent">Urgente</option>
            </select>
          </Field>
          <Field label="Estado">
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Task['status'])}>
              <option value="todo">Por hacer</option><option value="in_progress">En progreso</option><option value="done">Hecho</option>
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha límite"><input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Etiquetas (separadas por coma)"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="trabajo, urgente" /></Field>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>{editing ? 'Guardar cambios' : 'Crear tarea'}</button>
      </form>
    </Modal>
  );
}
