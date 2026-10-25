import { useRef, useState } from 'react';
import { cn } from '../lib/utils';
import { hapticTap } from '../lib/haptics';

export interface SwipeAction {
  icon: React.ReactNode;
  /** Colores del fondo que se revela, p. ej. 'bg-success text-white'. */
  className: string;
  onTrigger: () => void;
}

const THRESHOLD = 88; // px de arrastre a partir de los cuales se dispara
const MAX_DRAG = 140;

/** Fila que se desliza con el dedo: a la derecha dispara `right`, a la
 *  izquierda `left`. Solo reacciona a touch/lápiz (en escritorio quedan los
 *  botones de siempre) y deja pasar el scroll vertical. Al soltar pasado el
 *  umbral ejecuta la acción y la fila vuelve a su sitio; el fondo de color
 *  solo ocupa el hueco que deja la fila al moverse (así no se transparenta
 *  a través de superficies de vidrio). */
export function SwipeRow({
  children,
  right,
  left,
  className,
}: {
  children: React.ReactNode;
  right?: SwipeAction;
  left?: SwipeAction;
  className?: string;
}) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dxRef = useRef(0);
  const gesture = useRef({ active: false, locked: false, moved: false, passed: false, id: -1, x: 0, y: 0 });

  function reset() {
    gesture.current.active = false;
    gesture.current.locked = false;
    dxRef.current = 0;
    setDragging(false);
    setDx(0);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' || (!right && !left)) return;
    gesture.current = { active: true, locked: false, moved: false, passed: false, id: e.pointerId, x: e.clientX, y: e.clientY };
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g.active || e.pointerId !== g.id) return;
    const ddx = e.clientX - g.x;
    const ddy = e.clientY - g.y;
    if (!g.locked) {
      if (Math.abs(ddy) > 10 && Math.abs(ddy) > Math.abs(ddx)) {
        g.active = false; // es scroll vertical: no es nuestro
        return;
      }
      if (Math.abs(ddx) < 10) return;
      g.locked = true;
      g.moved = true;
      setDragging(true);
    }
    let v = Math.max(-MAX_DRAG, Math.min(MAX_DRAG, ddx));
    if ((v > 0 && !right) || (v < 0 && !left)) v = 0;
    const passed = Math.abs(v) >= THRESHOLD;
    if (passed && !g.passed) hapticTap();
    g.passed = passed;
    dxRef.current = v;
    setDx(v);
  }

  function onPointerUp(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g.active || e.pointerId !== g.id) return;
    if (g.locked) {
      const v = dxRef.current;
      const action = v > 0 ? right : left;
      reset();
      if (action && Math.abs(v) >= THRESHOLD) action.onTrigger();
    } else {
      g.active = false;
    }
  }

  const action = dx > 0 ? right : dx < 0 ? left : undefined;
  const progress = Math.min(1, Math.abs(dx) / THRESHOLD);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {action && (
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 flex items-center',
            dx > 0 ? 'left-0 justify-start pl-5' : 'right-0 justify-end pr-5',
            action.className,
          )}
          style={{ width: Math.abs(dx) }}
        >
          <span style={{ opacity: progress, transform: `scale(${0.6 + 0.4 * progress})` }}>{action.icon}</span>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
        onClickCapture={(e) => {
          if (gesture.current.moved) {
            gesture.current.moved = false;
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? 'none' : 'transform 280ms cubic-bezier(0.22, 1, 0.36, 1)',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  );
}
