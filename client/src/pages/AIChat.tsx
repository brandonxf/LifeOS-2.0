import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { Sparkles, Send, User, Database, Plus, MessageSquare, Trash2, PanelLeftClose, PanelLeft } from 'lucide-react';
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

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar: conversation history */}
      {showSidebar && (
        <aside className="hidden w-64 shrink-0 flex-col rounded-2xl border bg-white dark:bg-slate-900 md:flex">
          <div className="p-3">
            <button onClick={newChat} className="btn-primary w-full">
              <Plus className="h-4 w-4" /> Nuevo chat
            </button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-2">
            {conversations.isLoading ? (
              <p className="px-2 py-4 text-center text-xs text-slate-400">Cargando…</p>
            ) : !conversations.data?.length ? (
              <p className="px-2 py-4 text-center text-xs text-slate-400">Sin conversaciones aún</p>
            ) : (
              conversations.data.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openConversation(c.id)}
                  className={cn(
                    'group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                    activeId === c.id ? 'bg-primary/10 text-primary' : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-60" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="truncate text-[11px] text-slate-400">
                      {formatDistanceToNow(parseISO(c.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); delConvo.mutate(c.id); }}
                    className="shrink-0 rounded-lg p-1 text-slate-300 opacity-0 hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      )}

      {/* Chat column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => setShowSidebar((s) => !s)}
            className="hidden h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 md:flex"
            title="Mostrar/ocultar historial"
          >
            {showSidebar ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Asistente IA</h1>
            <p className="text-xs text-slate-400">Basado en los datos en vivo de tu Life OS</p>
          </div>
          <button onClick={newChat} className="btn-ghost border md:hidden">
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        </div>

        {badge.length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
            <Database className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-primary">Contexto enviado:</span>
            {badge.map((b) => <span key={b} className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">{b}</span>)}
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-white p-4 dark:bg-slate-900">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Sparkles className="mb-3 h-10 w-10 text-primary/40" />
              <p className="font-semibold">Pregúntame lo que sea sobre tu vida</p>
              <p className="mb-6 text-sm text-slate-400">Puedo ver tus tareas, hábitos, finanzas, diario y salud.</p>
              <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => send(s)} className="rounded-xl border p-3 text-left text-sm hover:border-primary hover:bg-primary/5">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn('flex gap-3', m.role === 'user' && 'flex-row-reverse')}>
                <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', m.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-primary text-white')}>
                  {m.role === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                </div>
                <div className={cn('max-w-[80%] rounded-2xl px-4 py-2.5 text-sm', m.role === 'user' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800')}>
                  {m.content ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="inline-flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '0ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '150ms' }} />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" style={{ animationDelay: '300ms' }} />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="mt-3 flex items-center gap-2 rounded-2xl border bg-white p-2 dark:bg-slate-900">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escríbele a tu asistente…"
            disabled={streaming}
            className="flex-1 bg-transparent px-2 text-sm outline-none"
          />
          <button type="submit" disabled={streaming || !input.trim()} className="btn-primary px-3 py-2">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
