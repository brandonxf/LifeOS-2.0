import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2, BookOpen, Bold, Italic, List as ListIcon, Heading2, Camera as CameraIcon, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { api } from '../lib/api';
import { useSettings } from '../store/settings';
import { SectionTitle, Skeleton, Modal, Field, EmptyState, Card, ExpandableText, Lightbox } from '../components/ui';
import { MoodFace, MOOD_LABELS } from '../components/icons';
import { cn, MOOD_COLORS } from '../lib/utils';
import { confirm } from '../store/confirm';
import { externalPickerOpen } from '../components/BiometricGate';
import { bogotaISODate } from '../lib/date';
import type { DiaryEntry } from '../lib/types';

export default function Diary() {
  const qc = useQueryClient();
  const performanceModeEnabled = useSettings((s) => s.performanceModeEnabled);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DiaryEntry | null>(null);
  const [viewing, setViewing] = useState<DiaryEntry | null>(null);
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null);

  const entries = useQuery({ queryKey: ['diary'], queryFn: () => api<DiaryEntry[]>('/api/diary') });

  const del = useMutation({
    mutationFn: (id: string) => api(`/api/diary/${id}`, { method: 'DELETE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['diary'] }); toast.success('Entrada eliminada'); },
  });

  async function confirmDeleteEntry(e: DiaryEntry) {
    const ok = await confirm({
      title: 'Eliminar entrada',
      message: `¿Seguro que quieres eliminar "${e.title || 'esta entrada'}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (ok) del.mutate(e.id);
  }

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
              <Line type="monotone" dataKey="mood" stroke="rgb(var(--primary))" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={!performanceModeEnabled} />
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
              <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setViewing(e)}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{e.title || 'Sin título'}</h3>
                    <p className="text-xs capitalize text-slate-400">{format(parseISO(e.date), "EEEE, d 'de' MMMM 'de' yyyy")}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={(ev) => { ev.stopPropagation(); setEditing(e); setModalOpen(true); }} className="rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-primary">Editar</button>
                    <button onClick={(ev) => { ev.stopPropagation(); confirmDeleteEntry(e); }} className="rounded-lg p-1.5 text-slate-400 hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
                <ExpandableText
                  lines={3}
                  className="mt-2"
                  textClassName="prose-sm text-sm text-slate-600 dark:text-slate-300"
                  html={e.content}
                />
                {e.photos?.length > 0 && (
                  <div className="mt-2 flex gap-2 overflow-x-auto">
                    {e.photos.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={(ev) => { ev.stopPropagation(); setLightbox({ photos: e.photos, index: i }); }}
                        className="shrink-0"
                      >
                        <img src={src} alt="" className="h-16 w-16 rounded-lg object-cover transition hover:opacity-80" />
                      </button>
                    ))}
                  </div>
                )}
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
      <DiaryViewModal
        entry={viewing}
        onClose={() => setViewing(null)}
        onEdit={(e) => { setViewing(null); setEditing(e); setModalOpen(true); }}
        onPhotoClick={(photos, index) => setLightbox({ photos, index })}
      />

      {lightbox && (
        <Lightbox
          images={lightbox.photos}
          index={lightbox.index}
          onClose={() => setLightbox(null)}
          onIndexChange={(index) => setLightbox((l) => (l ? { ...l, index } : l))}
        />
      )}
    </div>
  );
}

function DiaryViewModal({
  entry, onClose, onEdit, onPhotoClick,
}: {
  entry: DiaryEntry | null;
  onClose: () => void;
  onEdit: (e: DiaryEntry) => void;
  onPhotoClick: (photos: string[], index: number) => void;
}) {
  return (
    <Modal open={!!entry} onClose={onClose} title={entry?.title || 'Entrada'} wide>
      {entry && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <MoodFace mood={entry.mood} className="h-6 w-6" style={{ color: MOOD_COLORS[entry.mood] }} />
            <p className="text-xs capitalize text-slate-400">{format(parseISO(entry.date), "EEEE, d 'de' MMMM 'de' yyyy")}</p>
          </div>
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: entry.content }}
          />
          {entry.photos?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.photos.map((src, i) => (
                <button key={i} type="button" onClick={() => onPhotoClick(entry.photos, i)} className="shrink-0">
                  <img src={src} alt="" className="h-20 w-20 rounded-lg object-cover transition hover:opacity-80" />
                </button>
              ))}
            </div>
          )}
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {entry.tags.map((t) => <span key={t} className="chip bg-primary/10 text-primary">#{t}</span>)}
            </div>
          )}
          <button onClick={() => onEdit(entry)} className="btn-primary w-full">Editar</button>
        </div>
      )}
    </Modal>
  );
}

function DiaryModal({ open, onClose, editing }: { open: boolean; onClose: () => void; editing: DiaryEntry | null }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [mood, setMood] = useState(3);
  const [tags, setTags] = useState('');
  const [date, setDate] = useState(bogotaISODate());
  const [photos, setPhotos] = useState<string[]>([]);
  const nativeCamera = Capacitor.isNativePlatform();

  async function addPhoto() {
    // Abrir la cámara/galería manda la app a segundo plano igual que el
    // diálogo de huella, así que suprimimos el bloqueo biométrico mientras
    // dura para que no tape la app justo cuando la foto vuelve.
    externalPickerOpen.current = true;
    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
        quality: 55,
        width: 1080,
        promptLabelHeader: 'Agregar foto',
        promptLabelPhoto: 'Elegir de la galería',
        promptLabelPicture: 'Tomar foto',
      });
      if (photo.base64String) {
        setPhotos((p) => [...p, `data:image/${photo.format};base64,${photo.base64String}`]);
      }
    } catch {
      /* usuario canceló */
    } finally {
      setTimeout(() => { externalPickerOpen.current = false; }, 500);
    }
  }

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
      setDate(editing?.date ?? bogotaISODate());
      setPhotos(editing?.photos ?? []);
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
        photos,
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

        <Field label="Fotos">
          <div className="flex flex-wrap gap-2">
            {photos.map((src, i) => (
              <div key={i} className="group relative h-16 w-16">
                <img src={src} alt="" className="h-full w-full rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white shadow"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {nativeCamera && photos.length < 6 && (
              <button
                type="button"
                onClick={addPhoto}
                className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed text-slate-400 hover:border-primary hover:text-primary"
              >
                <CameraIcon className="h-5 w-5" />
                <span className="text-[10px]">Agregar</span>
              </button>
            )}
          </div>
        </Field>

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
