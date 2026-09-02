import { useRef, useState } from 'react';
import { clamp01, hexToHsv, hsvToHex, isValidHex } from '../lib/color';

/** Rueda de color HSV (matiz = ángulo, saturación = radio) + slider de brillo
 *  + campo hex, para elegir o crear cualquier color. Estado interno propio,
 *  sembrado desde `initialValue` una sola vez — quien lo use debe montarlo
 *  de nuevo (ej. dentro de un Modal que se abre/cierra) si quiere resetearlo
 *  a otro color de partida. */
export function ColorWheel({
  initialValue,
  onChange,
}: {
  initialValue: string;
  onChange: (hex: string) => void;
}) {
  const [{ h, s, v }, setHsv] = useState(() => hexToHsv(initialValue));
  const [hexInput, setHexInput] = useState(initialValue);
  const wheelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'wheel' | 'value' | null>(null);

  function commit(next: { h: number; s: number; v: number }) {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexInput(hex);
    onChange(hex);
  }

  function fromWheelPoint(clientX: number, clientY: number) {
    const el = wheelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const radius = rect.width / 2;
    const dist = Math.sqrt(dx * dx + dy * dy);
    let hue = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (hue < 0) hue += 360;
    const sat = clamp01(dist / radius);
    commit({ h: hue, s: sat, v });
  }

  function onWheelPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = 'wheel';
    fromWheelPoint(e.clientX, e.clientY);
  }
  function onWheelPointerMove(e: React.PointerEvent) {
    if (dragging.current !== 'wheel') return;
    fromWheelPoint(e.clientX, e.clientY);
  }
  function endDrag() {
    dragging.current = null;
  }

  function onValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    commit({ h, s, v: Number(e.target.value) / 100 });
  }

  function onHexInputChange(raw: string) {
    setHexInput(raw);
    if (isValidHex(raw)) {
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      const next = hexToHsv(hex);
      setHsv(next);
      onChange(hex.length === 4 ? hsvToHex(next.h, next.s, next.v) : hex);
    }
  }

  const radius = 100; // px, coincide con el tamaño del wheel abajo
  const thumbX = radius + s * radius * Math.sin((h * Math.PI) / 180);
  const thumbY = radius - s * radius * Math.cos((h * Math.PI) / 180);
  const currentHex = hsvToHex(h, s, v);
  const pureHueHex = hsvToHex(h, s, 1);

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        ref={wheelRef}
        onPointerDown={onWheelPointerDown}
        onPointerMove={onWheelPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative touch-none rounded-full shadow-inner"
        style={{
          width: radius * 2,
          height: radius * 2,
          background:
            'conic-gradient(from 0deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle at center, #fff 0%, rgba(255,255,255,0) 100%)' }}
        />
        <div
          className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{ left: thumbX, top: thumbY, backgroundColor: currentHex }}
        />
      </div>

      <div className="w-full max-w-[220px]">
        <label className="mb-1 block text-xs text-slate-400">Brillo</label>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(v * 100)}
          onChange={onValueChange}
          className="h-3 w-full cursor-pointer appearance-none rounded-full"
          style={{ background: `linear-gradient(to right, #000, ${pureHueHex})` }}
        />
      </div>

      <div className="flex w-full max-w-[220px] items-center gap-2">
        <div className="h-9 w-9 shrink-0 rounded-lg border border-slate-200 dark:border-white/10" style={{ backgroundColor: currentHex }} />
        <input
          className="input"
          value={hexInput}
          onChange={(e) => onHexInputChange(e.target.value)}
          placeholder="#RRGGBB"
          maxLength={7}
        />
      </div>
    </div>
  );
}
