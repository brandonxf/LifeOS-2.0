import { Delete } from 'lucide-react';
import { cn } from '../lib/utils';

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** PIN numérico de `length` dígitos: puntos de progreso + pad de botones
 *  0-9 y borrar, sin ningún <input> real — así nunca abre el teclado del
 *  sistema (es lo que se usa para desbloquear/crear el PIN del Diario, ver
 *  DiaryLockGate y los modales de Ajustes). `glass` cambia el estilo de los
 *  botones para verse bien sobre un fondo oscuro fijo en vez del fondo
 *  claro/oscuro del tema (igual que BiometricGate/DiaryLockGate, que no
 *  siguen el `dark:` del tema porque su fondo siempre es oscuro). */
export function PinInput({
  value,
  onChange,
  length = 4,
  disabled,
  glass,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  disabled?: boolean;
  glass?: boolean;
}) {
  function press(digit: string) {
    if (disabled || value.length >= length) return;
    onChange(value + digit);
  }

  function backspace() {
    if (disabled || !value.length) return;
    onChange(value.slice(0, -1));
  }

  const btnClass = glass ? 'keypad-btn-glass' : 'keypad-btn';

  return (
    <div className="flex flex-col items-center gap-6">
      <div role="status" aria-label={`${value.length} de ${length} dígitos`} className="flex gap-3">
        {Array.from({ length }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-3.5 w-3.5 rounded-full border-2 transition',
              glass ? 'border-white/25' : 'border-slate-300 dark:border-white/25',
              i < value.length && 'border-primary bg-primary',
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {DIGITS.map((d) => (
          <button key={d} type="button" className={btnClass} disabled={disabled} onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <div />
        <button type="button" className={btnClass} disabled={disabled} onClick={() => press('0')}>
          0
        </button>
        <button
          type="button"
          aria-label="Borrar"
          className={btnClass}
          disabled={disabled || !value.length}
          onClick={backspace}
        >
          <Delete className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
