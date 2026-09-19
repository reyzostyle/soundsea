"use client";

import { useEffect, useRef, useState } from "react";

// The handover between two tracks, drawn at the cut like a timeline does it: the
// track that is ending on the left, the one starting on the right, and a transition
// block on each side of the join. Drag outwards from the middle to make the fade
// longer — that is the whole gesture.

const MAX = 10; // seconds
const SPAN = 24; // seconds across the lane

// a fixed, tame waveform so the lane reads as audio without pretending to be a file
const BARS = Array.from({ length: 110 }, (_, i) => {
  const wave = Math.sin(i * 0.7) * 0.25 + Math.sin(i * 0.23) * 0.3 + Math.sin(i * 1.9) * 0.12;
  return 0.4 + Math.abs(wave) * 0.55;
});

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
  const mid = width / 2;
  const fadePx = Math.min(value * perSec, mid);
  const clamp = (v: number) => Math.min(MAX, Math.max(0, Math.round(v * 2) / 2));

  const set = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    onChange(clamp(Math.abs(e.clientX - r.left - r.width / 2) / perSec));
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
      onPointerDown={(e) => {
        dragRef.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        set(e);
      }}
      onPointerMove={(e) => dragRef.current && set(e)}
      onPointerUp={() => (dragRef.current = false)}
      onPointerCancel={() => (dragRef.current = false)}
      className="relative h-20 w-full cursor-ew-resize touch-none overflow-hidden rounded-md bg-elevated outline-none select-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      {/* the two clips, meeting in the middle */}
      <div className="absolute inset-0 flex items-center gap-px px-1">
        {BARS.map((h, i) => (
          <div key={i} className="flex-1 rounded-full bg-ink/15" style={{ height: `${h * 70}%` }} />
        ))}
      </div>
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line" />

      {/* the transition: one block each side of the cut, with the fade curves */}
      {width > 0 && fadePx > 0 && (
        <div
          className="absolute inset-y-1 overflow-hidden rounded-sm border border-accent bg-app/55 transition-[width,left] duration-100 ease-out"
          style={{ left: mid - fadePx, width: fadePx * 2 }}
        >
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* out of the ending track, into the starting one: the two halves cross */}
            <path d="M0 0 Q 25 55 50 100" className="fill-none stroke-accent" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
            <path d="M50 100 Q 75 55 100 0" className="fill-none stroke-accent" strokeWidth={1.25} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent/40" />
        </div>
      )}

      {/* the grip at the cut, so it is obvious where the drag starts */}
      <span className="pointer-events-none absolute top-1/2 left-1/2 h-8 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
    </div>
  );
}
