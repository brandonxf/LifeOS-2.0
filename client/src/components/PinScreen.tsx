import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ApiError } from '../lib/api';
import { cn } from '../lib/utils';
import { hapticSuccess, hapticTap, hapticWarning } from '../lib/haptics';
import { Logo } from './Brand';

const KEYS: [digit: string, letters: string][] = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
];

// Tiempos de la secuencia de validación (ms).
const ERROR_RESET = 650; // puntos en rojo + temblor, luego se limpian
const SUCCESS_LEAVE = 1700; // check verde visible antes de desvanecer
const SUCCESS_DONE = 1950; // fin del desvanecido: se llama onSuccess

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
 *  Éxito: todo menos el logo se encoge hacia él, un check verde crece de
 *  chico a grande desde donde estaba la tecla 5, se desvanece la pantalla
 *  y recién ahí se llama
 *  `onSuccess`. Con `showSuccess={false}` (p. ej. el primer paso de "crear
 *  PIN", que no valida nada) se salta la animación. */
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
  const [checkPos, setCheckPos] = useState<{ x: number; y: number } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
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
      // Medir antes de cambiar de fase: después el pad ya empieza a encogerse.
      // children[4] es la tecla 5 (el centro del pad).
      const key5 = gridRef.current?.children[4]?.getBoundingClientRect();
      setCheckPos(
        key5
          ? { x: key5.left + key5.width / 2, y: key5.top + key5.height / 2 }
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      );
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
      <Logo size={104} />

      {done && checkPos && (
        // Posicionado donde estaba la tecla 5 (medido justo antes de que el
        // pad se encoja): el wrapper lo centra y el hijo anima la escala, así
        // el translate no pisa el transform de la animación.
        <div
          className="pointer-events-none fixed z-10"
          style={{ left: checkPos.x, top: checkPos.y, transform: 'translate(-50%, -50%)' }}
        >
          <div className="animate-pin-check-grow flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/40">
            <svg
              viewBox="0 0 24 24"
              className="h-9 w-9"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} className="draw-check" style={{ animationDelay: '0.6s', animationDuration: '400ms' }} />
            </svg>
          </div>
        </div>
      )}

      <div
        className={cn(
          'flex origin-top flex-col items-center transition-all duration-[350ms] ease-in',
          done && 'pointer-events-none scale-50 opacity-0',
        )}
      >
        <p className="mt-5 text-xl font-medium">{title}</p>

        <div
          key={shake}
          role="status"
          aria-label={done ? 'PIN correcto' : `${value.length} de ${length} dígitos`}
          className={cn('mt-6 flex gap-5', phase === 'error' && 'animate-pin-shake')}
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

        <p className="mt-4 h-5 text-sm text-red-300">{error}</p>

        <div ref={gridRef} className="mt-6 grid grid-cols-3 gap-x-6 gap-y-4">
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
