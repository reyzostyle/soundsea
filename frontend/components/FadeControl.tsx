"use client";

import { useEffect, useRef, useState } from "react";

// The fade on a track, drawn on the track itself: drag either end inwards to make it
// longer, the way a clip's audio fades work in an editor. The same gesture as the
// Studio waveform, so the two screens behave alike.

const MAX = 10; // seconds
const SPAN = 20; // seconds across the control

export default function FadeControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const perSec = width / SPAN;
  const fadePx = Math.min(value * perSec, width / 2);
  const clamp = (v: number) => Math.min(MAX, Math.max(0, Math.round(v * 2) / 2));

  const set = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    onChange(clamp((x < r.width / 2 ? x : r.width - x) / perSec));
  };

  const onDown = (e: React.PointerEvent) => {
    dragRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    set(e);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.5 : e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.5 : 0;
    if (!step) return;
    e.preventDefault();
    onChange(clamp(value + step));
  };

  return (
    <div
      ref={boxRef}
      role="slider"
      tabIndex={0}
      aria-label="Fade length in seconds"
      aria-valuemin={0}
      aria-valuemax={MAX}
      aria-valuenow={value}
      onKeyDown={onKey}
      onPointerDown={onDown}
      onPointerMove={(e) => dragRef.current && set(e)}
      onPointerUp={() => (dragRef.current = false)}
      onPointerCancel={() => (dragRef.current = false)}
      className="relative h-16 w-full cursor-ew-resize touch-none rounded-md bg-elevated outline-none select-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {width > 0 && (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} 64`} preserveAspectRatio="none">
          {fadePx > 0 && (
            <>
              <polygon points={`0,0 ${fadePx},0 0,64`} className="fill-app/70" />
              <polygon points={`${width - fadePx},0 ${width},0 ${width},64`} className="fill-app/70" />
            </>
          )}
          <polyline
            points={`0,64 ${fadePx},0 ${width - fadePx},0 ${width},64`}
            className="fill-none stroke-accent"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}
      <span className="absolute -top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-accent bg-app" style={{ left: fadePx }} />
      <span className="absolute -top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-accent bg-app" style={{ left: width - fadePx }} />
    </div>
  );
}
