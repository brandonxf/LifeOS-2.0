import { createPortal } from 'react-dom';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import { useConfirmStore } from '../store/confirm';
import { cn } from '../lib/utils';

/** Host único del diálogo de confirmación imperativo (ver store/confirm.ts).
 *  Se monta una sola vez en main.tsx, igual que el <Toaster />. */
export function ConfirmDialogHost() {
  const { open, title, message, confirmLabel, cancelLabel, danger, settle } = useConfirmStore();

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md" onClick={() => settle(false)} />
      <div className="glass-menu relative z-10 w-full max-w-sm animate-fade-in rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-glass-lg dark:border-white/10 dark:bg-ink-900/90 dark:backdrop-blur-2xl">
        <div
          className={cn(
            'mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full',
            danger ? 'bg-danger/10 text-danger' : 'bg-primary/10 text-primary',
          )}
        >
          {danger ? <AlertTriangle className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
        </div>
        <h2 className="font-display text-lg font-bold">{title}</h2>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <div className="mt-6 flex gap-2">
          <button onClick={() => settle(false)} className="btn-ghost flex-1 border">
            {cancelLabel}
          </button>
          <button onClick={() => settle(true)} className={cn('flex-1', danger ? 'btn-danger' : 'btn-primary')}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
