import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Send, Database, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from 'lucide-react';
import { AiMark } from '../components/Brand';
import toast from 'react-hot-toast';
import { useAuth } from '../store/auth';
import { api, API_BASE } from '../lib/api';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}
interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

const SUGGESTIONS = [
  '¿Cómo van mis finanzas este mes?',
  '¿Qué hábitos me salté esta semana?',
  'Resume mi semana',
  '¿Qué tareas tengo vencidas?',
];

/** Oculta los bloques ```action del texto (los ejecuta el servidor, no se
 *  muestran al usuario). También cubre un bloque incompleto durante el stream. */
function stripActions(s: string): string {
  return s
    .replace(/```action[\s\S]*?```/g, '')
    .replace(/```action[\s\S]*$/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function AIChat() {
  const { accessToken } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [badge, setBadge] = useState<string[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [mobileHistory, setMobileHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const conversations = useQuery({
    queryKey: ['conversations'],
    queryFn: () => api<Conversation[]>('/api/ai/conversations'),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  // Prefill from dashboard quick-prompt (starts a fresh chat).
  useEffect(() => {
    const prompt = (location.state as any)?.prompt;
    if (prompt) send(prompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openConversation(id: string) {
    if (streaming) return;
    setActiveId(id);
    setBadge([]);
    try {
      const convo = await api<{ messages: Message[] }>(`/api/ai/conversations/${id}`);
      setMessages(convo.messages.map((m) => ({ role: m.role, content: m.content })));
    } catch {
      toast.error('No se pudo abrir la conversación');
    }
  }

  function newChat() {
    if (streaming) return;
    setActiveId(null);
    setMessages([]);
    setBadge([]);
    setInput('');
  }

  const delConvo = useMutation({
    mutationFn: (id: string) => api(`/api/ai/conversations/${id}`, { method: 'DELETE' }),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (activeIdRef.current === id) newChat();
      toast.success('Conversación eliminada');
    },
  });

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    const history = messages;
    const userMsg: Message = { role: 'user', content: text };
    setMessages([...history, userMsg, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ message: text, conversationId: activeIdRef.current }),
      });
      if (!res.ok || !res.body) throw new Error('Request failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() ?? '';

        for (const part of parts) {
          const lines = part.split('\n');
          const eventLine = lines.find((l) => l.startsWith('event:'));
          const dataLine = lines.find((l) => l.startsWith('data:'));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.slice(6).trim();
          const data = JSON.parse(dataLine.slice(5).trim());

          if (event === 'meta') {
            // Capture the conversation id (new chats) and refresh the list.
            if (!activeIdRef.current) setActiveId(data.conversationId);
            activeIdRef.current = data.conversationId;
            qc.invalidateQueries({ queryKey: ['conversations'] });
          } else if (event === 'context') {
            setBadge(data.badge);
          } else if (event === 'delta') {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: 'assistant', content: copy[copy.length - 1].content + data.text };
              return copy;
            });
          } else if (event === 'action') {
            const KEY: Record<string, string> = {
              task: 'tasks', finance: 'finance', event: 'events', habit: 'habits',
              goal: 'goals', note: 'notes', diary: 'diary', health: 'health',
            };
            for (const r of data.results as { ok: boolean; kind: string; label: string; error?: string }[]) {
              if (r.ok) {
                toast.success(`✓ ${r.label}`);
                const key = KEY[r.kind];
                if (key) qc.invalidateQueries({ queryKey: [key] });
              } else {
                toast.error(`No se pudo crear ${r.label}${r.error ? `: ${r.error}` : ''}`);
              }
            }
          } else if (event === 'error') {
            setMessages((m) => {
              const copy = [...m];
              copy[copy.length - 1] = { role: 'assistant', content: `**Error:** ${data.message}` };
              return copy;
            });
          }
        }
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: '**Error:** No se pudo conectar con el asistente. Inténtalo de nuevo.' };
        return copy;
      });
    } finally {
      setStreaming(false);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    }
  }

  const historyContent = (
    <>
      <div className="p-3">
        <button
          onClick={() => { newChat(); setMobileHistory(false); }}
          className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-medium transition hover:bg-white/[0.09]"
        >
          <Plus className="h-4 w-4" /> Nuevo chat
        </button>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {conversations.isLoading ? (
          <p className="px-2 py-4 text-center text-xs text-white/40">Cargando…</p>
        ) : !conversations.data?.length ? (
          <p className="px-2 py-4 text-center text-xs text-white/40">Sin conversaciones aún</p>
        ) : (
          conversations.data.map((c) => (
            <div
              key={c.id}
              onClick={() => { openConversation(c.id); setMobileHistory(false); }}
              className={cn(
                'group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm transition',
                activeId === c.id
                  ? 'bg-slate-200/70 dark:bg-white/10'
                  : 'hover:bg-slate-100 dark:hover:bg-white/[0.06]',
              )}
            >
              <MessageSquare className="h-4 w-4 shrink-0 opacity-50" />
              <p className="min-w-0 flex-1 truncate">{c.title}</p>
              <button
                onClick={(e) => { e.stopPropagation(); delConvo.mutate(c.id); }}
                className="shrink-0 rounded-md p-1 text-white/40 opacity-0 transition hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar: historial en desktop (glass) */}
      {showSidebar && (
        <aside className="hidden w-64 shrink-0 flex-col border-r border-white/[0.07] bg-white/[0.03] backdrop-blur-xl md:flex">
          {historyContent}
        </aside>
      )}

      {/* Historial en móvil: drawer deslizable */}
      {mobileHistory && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/50 animate-scrim-in md:hidden"
          onClick={() => setMobileHistory(false)}
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.07] bg-ink-900 transition-transform duration-200 md:hidden',
          mobileHistory ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {historyContent}
      </aside>

      {/* Chat column */}
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* Header slim */}
        <div className="flex items-center gap-2 border-b px-3 py-2.5 dark:border-white/[0.06]">
          <button
            onClick={() => setShowSidebar((s) => !s)}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/[0.06] md:flex"
            title="Mostrar/ocultar historial"
          >
            {showSidebar ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setMobileHistory(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/[0.06] md:hidden"
            title="Historial de chats"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <span className="font-display text-sm font-semibold">Asistente IA</span>
          <button
            onClick={newChat}
            className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:hover:bg-white/[0.06]"
            title="Nuevo chat"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        {/* Scroll area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-4 text-center">
              <AiMark size={52} className="mb-4 opacity-95" />
              <p className="eyebrow mb-2">Asistente IA</p>
              <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">¿En qué puedo ayudarte?</h2>
              <p className="mb-8 mt-2 text-sm text-white/50">
                Veo tus tareas, hábitos, finanzas, diario y salud en vivo.
              </p>
              <div className="grid w-full max-w-xl grid-cols-1 gap-2.5 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left text-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/[0.06]"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6">
              {badge.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                  <Database className="h-3.5 w-3.5 text-primary" />
                  <span className="font-semibold text-primary">Contexto enviado:</span>
                  {badge.map((b) => (
                    <span key={b} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{b}</span>
                  ))}
                </div>
              )}
              <div className="space-y-6">
                {messages.map((m, i) =>
                  m.role === 'user' ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm backdrop-blur-sm">
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                        <AiMark size={18} />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        {m.content ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-headings:my-2 prose-pre:bg-black/40">
                            <ReactMarkdown>{stripActions(m.content)}</ReactMarkdown>
                          </div>
                        ) : (
                          <span className="inline-flex gap-1 pt-1.5">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70" style={{ animationDelay: '0ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70" style={{ animationDelay: '150ms' }} />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-primary/70" style={{ animationDelay: '300ms' }} />
                          </span>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="px-4 pb-4 pt-2">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="mx-auto flex max-w-3xl items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] py-1.5 pl-4 pr-1.5 shadow-glass backdrop-blur-xl transition focus-within:border-primary/40"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escríbele a tu asistente…"
              disabled={streaming}
              className="flex-1 bg-transparent py-1.5 text-sm outline-none placeholder:text-white/40"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-ink-950 transition hover:bg-primary-200 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <p className="mx-auto mt-2 max-w-3xl text-center text-[11px] text-white/40">
            El asistente usa los datos en vivo de tu Life OS.
          </p>
        </div>
      </div>
    </div>
  );
}
