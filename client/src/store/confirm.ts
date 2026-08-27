import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
  resolve: ((v: boolean) => void) | null;
  request: (options: ConfirmOptions) => Promise<boolean>;
  settle: (v: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  open: false,
  title: '',
  message: '',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  danger: false,
  resolve: null,
  request: (options) =>
    new Promise<boolean>((resolve) => {
      set({
        open: true,
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirmar',
        cancelLabel: options.cancelLabel ?? 'Cancelar',
        danger: options.danger ?? false,
        resolve,
      });
    }),
  settle: (v) => {
    get().resolve?.(v);
    set({ open: false, resolve: null });
  },
}));

/** Diálogo de confirmación imperativo: `if (!(await confirm({...}))) return;`
 *  Úsalo antes de cualquier acción destructiva (eliminar, cerrar sesión). */
export function confirm(options: ConfirmOptions): Promise<boolean> {
  return useConfirmStore.getState().request(options);
}
