import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock } from 'lucide-react';
import { ApiError } from '../lib/api';
import { cn } from '../lib/utils';
import { hapticSuccess, hapticTap, hapticWarning } from '../lib/haptics';

const KEYS: [digit: string, letters: string][] = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
];

// Tiempos de la secuencia de validación (ms).
const ERROR_RESET = 650; // puntos en rojo + temblor, luego se limpian
const SUCCESS_LEAVE = 850; // check verde visible antes de desvanecer
const SUCCESS_DONE = 1100; // fin del desvanecido: se llama onSuccess

type Phase = 'input' | 'checking' | 'error' | 'success' | 'leaving';

/** Pantalla completa de PIN numérico estilo bloqueo de iPhone (crear,
 *  confirmar o pedir el PIN del Diario). Sin <input> real, así nunca abre
 *  el teclado del sistema; en escritorio igual acepta dígitos/Backspace/Esc
 *  del teclado físico. Va en un portal a <body>: dentro de la página quedaba
 *  atrapada por un ancestro con transform y no tapaba la barra de arriba.
 *
 *  Al completar los dígitos llama `onComplete(pin)`, que devuelve `true` si
 *  es válido o un mensaje de error (si lanza un ApiError se usa su mensaje).
 *  Error: puntos en rojo + temblor + vibración, y se limpian para reintentar.
 *  Éxito: los puntos se van, entra un check verde, se desvanece la pantalla
 *  y recién ahí se llama `onSuccess`. Con `showSuccess={false}` (p. ej. el
 *  primer paso de "crear PIN", que no valida nada) se salta la animación. */
export function PinScreen({
  title,
  length = 4,
  onComplete,
  onSuccess,
  showSuccess = true,
  onCancel,
}: {
  title: string;
  length?: number;
  onComplete: (pin: string) => Promise<true | string> | true | string;
  onSuccess: () => void;
  showSuccess?: boolean;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState('');
  const [phase, setPhase] = useState<Phase>('input');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const timers = useRef<number[]>([]);

  function later(fn: () => void, ms: number) {
    timers.current.push(window.setTimeout(fn, ms));
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const pending = timers.current;
    return () => {
      document.body.style.overflow = '';
      pending.forEach(clearTimeout);
    };
  }, []);

  async function submit(pin: string) {
    setPhase('checking');
    let result: true | string;
    try {
      result = await onComplete(pin);
    } catch (err) {
      result = err instanceof ApiError ? err.message : 'No se pudo verificar el PIN';
    }

    if (result === true) {
      if (!showSuccess) {
        later(onSuccess, 150);
        return;
      }
      setPhase('success');
      hapticSuccess();
      later(() => setPhase('leaving'), SUCCESS_LEAVE);
      later(onSuccess, SUCCESS_DONE);
    } else {
      setError(result);
      setPhase('error');
      setShake((n) => n + 1);
      hapticWarning();
      later(() => {
        setValue('');
        setPhase('input');
      }, ERROR_RESET);
    }
  }

  function press(digit: string) {
    if (phase !== 'input' || value.length >= length) return;
    hapticTap();
    setError(null);
    const next = value + digit;
    setValue(next);
    if (next.length === length) submit(next);
  }

  function backspace() {
    if (phase !== 'input' || !value.length) return;
    setValue(value.slice(0, -1));
  }

  // Sin deps a propósito: se re-registra en cada render para que press/
  // backspace siempre vean el `value`/`phase` actuales.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') backspace();
      else if (e.key === 'Escape' && phase === 'input') onCancel?.();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const done = phase === 'success' || phase === 'leaving';

  return createPortal(
    <div
      className={cn(
        'pin-screen fixed inset-0 z-[300] flex flex-col items-center justify-center px-4 text-white transition-opacity duration-300',
        phase === 'leaving' && 'opacity-0',
      )}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className={cn('flex flex-col items-center transition-opacity duration-200', done && 'opacity-0')}>
        <Lock className="h-6 w-6 text-white/80" />
        <p className="mt-4 text-xl font-medium">{title}</p>
      </div>

      <div className="relative mt-4 flex h-14 items-center justify-center">
        <div
          key={shake}
          role="status"
          aria-label={done ? 'PIN correcto' : `${value.length} de ${length} dígitos`}
          className={cn(
            'flex gap-5 transition-all duration-200',
            phase === 'error' && 'animate-pin-shake',
            done && 'scale-50 opacity-0',
          )}
        >
          {Array.from({ length }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-3.5 w-3.5 rounded-full border transition-colors duration-150',
                phase === 'error' ? 'border-red-400 bg-red-400' : 'border-white',
                phase !== 'error' && i < value.length && 'bg-white',
              )}
            />
          ))}
        </div>

        {done && (
          <div className="animate-pin-success absolute flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="draw-check" style={{ animationDelay: '0.3s' }} />
            </svg>
          </div>
        )}
      </div>

      <p className={cn('h-5 text-sm text-red-300 transition-opacity', done && 'opacity-0')}>{error}</p>

      <div
        className={cn(
          'mt-6 grid grid-cols-3 gap-x-6 gap-y-4 transition-opacity duration-200',
          done && 'pointer-events-none opacity-0',
        )}
      >
        {KEYS.map(([digit, letters]) => (
          <Key key={digit} digit={digit} letters={letters} onPress={press} />
        ))}
        <div />
        <Key digit="0" letters="" onPress={press} />
        {value.length > 0 ? (
          <button type="button" className="keypad-text" onClick={backspace}>
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
  onPress,
}: {
  digit: string;
  letters: string;
  onPress: (digit: string) => void;
}) {
  return (
    <button type="button" className="keypad-key" onClick={() => onPress(digit)}>
      <span className="text-[2.1rem] font-light leading-none">{digit}</span>
      <span className="mt-1 h-3 text-[0.6rem] font-semibold tracking-[0.2em] text-white/80">{letters}</span>
    </button>
  );
}
