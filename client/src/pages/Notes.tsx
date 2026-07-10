import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Plus, Trash2, Pin, PinOff, StickyNote, Search } from 'lucide-react';
import { AiMark } from '../components/Brand';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Modal, Field, EmptyState } from '../components/ui';
import { cn } from '../lib/utils';
import type { Note } from '../lib/types';

const NOTE_COLORS = ['#1f2937', '#365314', '#134e4a', '#713f12', '#7f1d1d', '#581c87'];

export default function Notes() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [search, setSearch] = useState('');
  const [semantic, setSemantic] = useState(false);
  const [debounced, setDebounced] = useState('');
  const [tagFilter, setTagFilter] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const notes = useQuery({ queryKey: ['notes'], queryFn: () => api<Note[]>('/api/notes') });
  const semanticResults = useQuery({
    queryKey: ['notes', 'search', debounced],
    queryFn: () => api<Note[]>('/api/notes/search', { query: { q: debounced } }),
    enabled: semantic && debounced.length > 1,
  });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/notes/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); toast.success('Nota eliminada'); },
  });
  const togglePin = useMutation({
    mutationFn: (n: Note) => api(`/api/notes/${n.id}`, { method: 'PUT', body: { pinned: !n.pinned } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notes'] }),
  });

  const allTags = useMemo(() => {
    const s = new Set<string>();
    (notes.data ?? []).forEach((n) => n.tags.forEach((t) => s.add(t)));
    return [...s];
  }, [notes.data]);

  const visible = useMemo(() => {
    if (semantic && debounced.length > 1) return semanticResults.data ?? [];
    let list = notes.data ?? [];
    if (debounced) {
      const q = debounced.toLowerCase();
      list = list.filter((n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q));
    }
    if (tagFilter) list = list.filter((n) => n.tags.includes(tagFilter));
    return list;
  }, [notes.data, semanticResults.data, semantic, debounced, tagFilter]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Notas" subtitle="Captura ideas con markdown y búsqueda semántica"
        action={<button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Nueva nota</button>} />

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder={semantic ? 'Búsqueda semántica…' : 'Buscar notas…'} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => setSemantic((s) => !s)}
          className={cn('btn border', semantic ? 'border-primary bg-primary/10 text-primary' : 'btn-ghost')}>
          <AiMark size={16} /> Semántica
        </button>
        {allTags.length > 0 && (
          <select className="input w-auto" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
            <option value="">Todas las etiquetas</option>
            {allTags.map((t) => <option key={t}>{t}</option>)}
          </select>
        )}
      </div>

      {notes.isLoading ? (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="mb-4 h-40" />)}
        </div>
      ) : !visible.length ? (
        <EmptyState icon={StickyNote} title={debounced ? 'Sin coincidencias' : 'Aún no hay notas'} description={debounced ? 'Prueba con otra búsqueda.' : 'Crea tu primera nota.'} />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
          {visible.map((n) => (
            <div key={n.id} className="mb-4 break-inside-avoid rounded-2xl border p-4 text-white shadow-sm" style={{ backgroundColor: n.color }}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="font-semibold leading-tight">{n.title}</h3>
                <div className="flex shrink-0 gap-1">
                  <button onClick={() => togglePin.mutate(n)} className="text-white/60 hover:text-white">
                    {n.pinned ? <Pin className="h-4 w-4 fill-current" /> : <PinOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => del.mutate(n.id)} className="text-white/60 hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
              <div className="prose prose-sm prose-invert max-w-none text-sm text-white/80 [&_a]:text-white cursor-pointer" onClick={() => { setEditing(n); setModalOpen(true); }}>
                <ReactMarkdown>{n.content}</ReactMarkdown>
              </div>
              {n.similarity !== undefined && (
                <p className="mt-2 text-xs text-white/50">{Math.round(n.similarity * 100)}% de coincidencia</p>
              )}
              {n.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {n.tags.map((t) => <span key={t} className="rounded-full bg-white/15 px-2 py-0.5 text-xs">#{t}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <NoteModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}

function NoteModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: Note | null }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const [tags, setTags] = useState('');
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? '');
      setContent(editing?.content ?? '');
      setColor(editing?.color ?? NOTE_COLORS[0]);
      setTags(editing?.tags.join(', ') ?? '');
      setPinned(editing?.pinned ?? false);
    }
  }, [open, editing]);

  const save = useMutation({
    mutationFn: () => {
      const body = { title: title || 'Sin título', content, color, pinned, tags: tags.split(',').map((t) => t.trim()).filter(Boolean) };
      return editing
        ? api(`/api/notes/${editing.id}`, { method: 'PUT', body })
        : api('/api/notes', { method: 'POST', body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); toast.success(editing ? 'Nota actualizada' : 'Nota creada'); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar nota' : 'Nueva nota'} wide>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <Field label="Título"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la nota" /></Field>
        <Field label="Contenido (compatible con Markdown)"><textarea className="input min-h-[160px] font-mono text-sm" value={content} onChange={(e) => setContent(e.target.value)} placeholder="# Encabezado&#10;- elemento&#10;**negrita**" /></Field>
        <Field label="Etiquetas (separadas por coma)"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ideas, trabajo" /></Field>
        <div className="flex items-center justify-between">
          <Field label="Color">
            <div className="flex gap-2">
              {NOTE_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} className={cn('h-8 w-8 rounded-full ring-offset-2 dark:ring-offset-slate-900', color === c && 'ring-2 ring-primary')} style={{ backgroundColor: c }} />
              ))}
            </div>
          </Field>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-4 w-4 accent-primary" /> Fijar arriba
          </label>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>{editing ? 'Guardar cambios' : 'Crear nota'}</button>
      </form>
    </Modal>
  );
}
