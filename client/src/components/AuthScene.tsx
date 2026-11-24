import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Fondo sobrio de las pantallas de auth: un resplandor tenue y una rejilla casi invisible. */
export function AuthBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-ink-950">
      <div className="auth-glow absolute inset-0" />
      <div className="auth-grid absolute inset-0" />
    </div>
  );
}

/** Campo con icono a la izquierda que se ilumina al enfocar. */
export function AuthIconField({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="auth-field relative">
      <Icon size={18} className="auth-field-icon pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white/45 transition-colors" />
      {children}
    </div>
  );
}
