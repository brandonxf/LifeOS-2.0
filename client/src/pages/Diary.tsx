import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, BookOpen, Bold, Italic, List as ListIcon, Heading2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../lib/api';
import { SectionTitle, Skeleton, Modal, Field, EmptyState, Card } from '../components/ui';
import { MoodFace, MOOD_LABELS } from '../components/icons';
import { cn, MOOD_COLORS } from '../lib/utils';
import type { DiaryEntry } from '../lib/types';

export default function Diary() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);

  const entries = useQuery({ queryKey: ['diary'], queryFn: () => api<DiaryEntry[]>('/api/diary') });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/diary/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diary'] }); toast.success('Entrada eliminada'); },
  });

  const moodChart = useMemo(() => {
    const list = [...(entries.data ?? [])].reverse();
    return list.map((e) => ({ date: format(parseISO(e.date), 'MMM d'), mood: e.mood }));
  }, [entries.data]);

  return (
    <div className="space-y-6">
      <SectionTitle title="Diario" subtitle="Reflexiona sobre tus días y registra tu ánimo"
        action={<button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary"><Plus className="h-4 w-4" /> Nueva entrada</button>} />

      {(entries.data?.length ?? 0) > 1 && (
        <Card>
          <h3 className="mb-4 font-semibold">Ánimo en el tiempo</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={moodChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, fontSize: 13 }} formatter={(v: number) => [`${MOOD_LABELS[v]} (${v}/5)`, 'Ánimo']} />
              <Line type="monotone" dataKey="mood" stroke="#c4f82a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}

      {entries.isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
      ) : !entries.data?.length ? (
        <EmptyState icon={BookOpen} title="Aún no hay entradas" description="Escribe tu primera entrada del diario para empezar a reflexionar."
          action={<button onClick={() => setModalOpen(true)} className="btn-primary"><Plus className="h-4 w-4" /> Nueva entrada</button>} />
      ) : (
        <div className="space-y-3">
          {entries.data.map((e) => (
            <Card key={e.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <MoodFace mood={e.mood} className="h-7 w-7" style={{ color: MOOD_COLORS[e.mood] }} />
                <div className="mt-2 h-full w-1 rounded-full" style={{ backgroundColor: MOOD_COLORS[e.mood] }} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{e.title || 'Sin título'}</h3>
                    <p className="text-xs capitalize text-slate-400">{format(parseISO(e.date), "EEEE, d 'de' MMMM 'de' yyyy")}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditing(e); setModalOpen(true); }} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-primary">Editar</button>
                    <button onClick={() => del.mutate(e.id)} className="rounded-lg p-1.5 text-slate-400 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="prose-sm mt-2 line-clamp-3 text-sm text-slate-600 dark:text-slate-300" dangerouslySetInnerHTML={{ __html: e.content }} />
                {e.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {e.tags.map((t) => <span key={t} className="chip bg-primary/10 text-primary">#{t}</span>)}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <DiaryModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}

function DiaryModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: DiaryEntry | null }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState(3);
  const [tags, setTags] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: { attributes: { class: 'prose prose-sm dark:prose-invert max-w-none' } },
  });

  useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? '');
      setMood(editing?.mood ?? 3);
      setTags(editing?.tags.join(', ') ?? '');
      setDate(editing?.date ?? new Date().toISOString().slice(0, 10));
      editor?.commands.setContent(editing?.content ?? '<p></p>');
    }
  }, [open, editing, editor]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        title,
        content: editor?.getHTML() ?? '',
        mood,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        date,
      };
      return editing
        ? api(`/api/diary/${editing.id}`, { method: 'PUT', body })
        : api('/api/diary', { method: 'POST', body });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diary'] }); toast.success(editing ? 'Entrada actualizada' : 'Entrada guardada'); onClose(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Editar entrada' : 'Nueva entrada'} wide>
      <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Título"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Cómo estuvo tu día?" /></Field>
          <Field label="Fecha"><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        </div>

        <Field label="Ánimo">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((m) => (
              <button key={m} type="button" onClick={() => setMood(m)}
                className={cn('flex h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border transition', mood === m ? 'border-primary bg-primary/10 scale-105' : 'opacity-50 hover:opacity-100')}
                style={{ color: MOOD_COLORS[m] }}>
                <MoodFace mood={m} className="h-6 w-6" />
              </button>
            ))}
          </div>
        </Field>

        <Field label="Entrada">
          <div className="rounded-xl border">
            <div className="flex gap-1 border-b p-2">
              <ToolbarBtn active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></ToolbarBtn>
              <ToolbarBtn active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()}><ListIcon className="h-4 w-4" /></ToolbarBtn>
            </div>
            <div className="p-3">
              <EditorContent editor={editor} />
            </div>
          </div>
        </Field>

        <Field label="Etiquetas (separadas por coma)"><input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="agradecido, productivo" /></Field>
        <button type="submit" className="btn-primary w-full" disabled={save.isPending}>{editing ? 'Guardar cambios' : 'Guardar entrada'}</button>
      </form>
    </Modal>
  );
}

function ToolbarBtn({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn('rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800', active && 'bg-primary/10 text-primary')}>
      {children}
    </button>
  );
}
