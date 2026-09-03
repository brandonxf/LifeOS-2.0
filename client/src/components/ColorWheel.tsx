import { useEffect, useRef, useState } from 'react';
import { clamp01, hexToHsv, hsvToHex, isValidHex } from '../lib/color';

/** Rueda de color HSV (matiz = ángulo, saturación = radio) + slider de brillo
 *  + campo hex, para elegir o crear cualquier color. Estado interno propio,
 *  sembrado desde `initialValue` una sola vez — quien lo use debe montarlo
 *  de nuevo (ej. dentro de un Modal que se abre/cierra) si quiere resetearlo
 *  a otro color de partida.
 *
 *  `onChange` se dispara en cada frame mientras se arrastra — debe ser
 *  barato (nada de escrituras a localStorage/estado persistido) para evitar
 *  lag en móvil. `onChangeEnd`, si se pasa, se dispara una sola vez al
 *  soltar, y es el lugar para commits caros (persistencia, etc). */
export function ColorWheel({
  initialValue,
  onChange,
  onChangeEnd,
}: {
  initialValue: string;
  onChange: (hex: string) => void;
  onChangeEnd?: (hex: string) => void;
}) {
  const [{ h, s, v }, setHsv] = useState(() => hexToHsv(initialValue));
  const [hexInput, setHexInput] = useState(initialValue);
  const wheelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'wheel' | null>(null);
  const wheelRect = useRef<{ cx: number; cy: number; radius: number } | null>(null);
  const pendingPoint = useRef<{ x: number; y: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const hsvRef = useRef({ h, s, v });
  hsvRef.current = { h, s, v };

  function commit(next: { h: number; s: number; v: number }) {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    setHexInput(hex);
    onChange(hex);
  }

  function applyPendingPoint() {
    rafId.current = null;
    const point = pendingPoint.current;
    const rect = wheelRect.current;
    if (!point || !rect) return;
    const dx = point.x - rect.cx;
    const dy = point.y - rect.cy;
    let hue = (Math.atan2(dx, -dy) * 180) / Math.PI;
    if (hue < 0) hue += 360;
    const sat = clamp01(Math.sqrt(dx * dx + dy * dy) / rect.radius);
    commit({ h: hue, s: sat, v: hsvRef.current.v });
  }

  function schedulePoint(clientX: number, clientY: number) {
    pendingPoint.current = { x: clientX, y: clientY };
    if (rafId.current == null) {
      rafId.current = requestAnimationFrame(applyPendingPoint);
    }
  }

  function onWheelPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragging.current = 'wheel';
    const el = wheelRef.current;
    if (el) {
      const rect = el.getBoundingClientRect();
      wheelRect.current = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
        radius: rect.width / 2,
      };
    }
    schedulePoint(e.clientX, e.clientY);
  }
  function onWheelPointerMove(e: React.PointerEvent) {
    if (dragging.current !== 'wheel') return;
    schedulePoint(e.clientX, e.clientY);
  }
  function endDrag() {
    dragging.current = null;
    if (rafId.current != null) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
      // Aplica el último punto pendiente antes de cerrar, para no perder el
      // valor final si soltaron entre frames.
      applyPendingPoint();
    }
    onChangeEnd?.(hsvToHex(hsvRef.current.h, hsvRef.current.s, hsvRef.current.v));
  }

  useEffect(() => {
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  function onValueChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = { h, s, v: Number(e.target.value) / 100 };
    commit(next);
    // El slider no sufre el lag de la rueda (no dispara decenas de eventos
    // por frame), así que aquí sí commiteamos en cada cambio, cubriendo
    // también el ajuste con teclado (que no dispara pointerup).
    onChangeEnd?.(hsvToHex(next.h, next.s, next.v));
  }

  function onHexInputChange(raw: string) {
    setHexInput(raw);
    if (isValidHex(raw)) {
      const hex = raw.startsWith('#') ? raw : `#${raw}`;
      const next = hexToHsv(hex);
      setHsv(next);
      const finalHex = hex.length === 4 ? hsvToHex(next.h, next.s, next.v) : hex;
      onChange(finalHex);
      onChangeEnd?.(finalHex);
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
          className="pointer-events-none absolute left-0 top-0 h-6 w-6 rounded-full border-2 border-white shadow-md will-change-transform"
          style={{ transform: `translate3d(${thumbX - 12}px, ${thumbY - 12}px, 0)`, backgroundColor: currentHex }}
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
