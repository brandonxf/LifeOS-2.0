import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Lock } from 'lucide-react';
import { cn } from '../lib/utils';
import { hapticTap } from '../lib/haptics';

const KEYS: [digit: string, letters: string][] = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
];

/** Pantalla completa de PIN numérico estilo bloqueo de iPhone (crear,
 *  confirmar o pedir el PIN del Diario). Sin <input> real, así nunca abre
 *  el teclado del sistema; en escritorio igual acepta dígitos/Backspace/Esc
 *  del teclado físico. Va en un portal a <body>: dentro de la página quedaba
 *  atrapada por un ancestro con transform y no tapaba la barra de arriba.
 *  Incrementar `errorSignal` hace temblar los puntos (PIN incorrecto). */
export function PinScreen({
  title,
  value,
  onChange,
  length = 4,
  disabled,
  error,
  errorSignal = 0,
  onCancel,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string | null;
  errorSignal?: number;
  onCancel?: () => void;
}) {
  function press(digit: string) {
    if (disabled || value.length >= length) return;
    hapticTap();
    onChange(value + digit);
  }

  function backspace() {
    if (disabled || !value.length) return;
    onChange(value.slice(0, -1));
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Sin deps a propósito: se re-registra en cada render para que press/
  // backspace siempre vean el `value` actual.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape') onCancel?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return createPortal(
    <div
      className="pin-screen fixed inset-0 z-[300] flex flex-col items-center justify-center px-4 text-white"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Lock className="h-6 w-6 text-white/80" />
      <p className="mt-4 text-xl font-medium">{title}</p>

      <div
        key={errorSignal}
        role="status"
        aria-label={`${value.length} de ${length} dígitos`}
        className={cn('mt-6 flex gap-5', errorSignal > 0 && 'animate-pin-shake')}
      >
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-3.5 w-3.5 rounded-full border border-white transition-colors duration-150',
              i < value.length && 'bg-white',
            )}
          />
        ))}
      </div>

      <p className="mt-4 h-5 text-sm text-red-300">{error}</p>

      <div className="mt-6 grid grid-cols-3 gap-x-6 gap-y-4">
        {KEYS.map(([digit, letters]) => (
          <Key key={digit} digit={digit} letters={letters} disabled={disabled} onPress={press} />
        ))}
        <div />
        <Key digit="0" letters="" disabled={disabled} onPress={press} />
        {value.length > 0 ? (
          <button type="button" className="keypad-text" disabled={disabled} onClick={backspace}>
            Borrar
          </button>
        ) : onCancel ? (
          <button type="button" className="keypad-text" onClick={onCancel}>
            Cancelar
          </button>
        ) : (
          <div />
        )}
      </div>
    </div>,
    document.body,
  );
}

function Key({
  digit,
  letters,
  disabled,
  onPress,
}: {
  digit: string;
  letters: string;
  disabled?: boolean;
  onPress: (digit: string) => void;
}) {
  return (
    <button type="button" className="keypad-key" disabled={disabled} onClick={() => onPress(digit)}>
      <span className="text-[2.1rem] font-light leading-none">{digit}</span>
      <span className="mt-1 h-3 text-[0.6rem] font-semibold tracking-[0.2em] text-white/80">{letters}</span>
    </button>
  );
}
