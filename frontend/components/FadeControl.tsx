"use client";

import { useEffect, useRef, useState } from "react";

// The fade, drawn the way a timeline draws a transition: an audio clip with a block
// at each end holding the crossing lines, and you drag the block's inner edge to make
// it longer or shorter. Both ends are the same length, because it is one setting.

const MAX = 10; // seconds
const SPAN = 20; // seconds across the clip

// a fixed, tame waveform so the lane reads as audio without pretending to be a file
const BARS = Array.from({ length: 96 }, (_, i) => {
  const wave = Math.sin(i * 0.7) * 0.25 + Math.sin(i * 0.23) * 0.3 + Math.sin(i * 1.9) * 0.12;
  return 0.42 + Math.abs(wave) * 0.55;
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
  const fadePx = Math.min(value * perSec, width / 2);
  const clamp = (v: number) => Math.min(MAX, Math.max(0, Math.round(v * 2) / 2));

  const set = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    onChange(clamp((x < r.width / 2 ? x : r.width - x) / perSec));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.5 : e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.5 : 0;
    if (!step) return;
    e.preventDefault();
    onChange(clamp(value + step));
  };

  // one fade block: the crossing lines inside it, a grab edge on the inner side
  const block = (side: "left" | "right") => (
    <div
      className={`absolute inset-y-0 overflow-hidden bg-app/55 ${side === "left" ? "left-0 border-r" : "right-0 border-l"} border-accent`}
      style={{ width: fadePx }}
    >
      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline points="0,100 100,0" className="fill-none stroke-accent" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <polyline points="0,0 100,100" className="fill-none stroke-accent/45" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );

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
      {/* the clip's audio */}
      <div className="absolute inset-0 flex items-center gap-px px-1">
        {BARS.map((h, i) => (
          <div key={i} className="flex-1 rounded-full bg-ink/15" style={{ height: `${h * 70}%` }} />
        ))}
      </div>

      {fadePx > 0 && (
        <>
          {block("left")}
          {block("right")}
        </>
      )}

      {/* grab hints, so it is clear the ends are draggable even at zero */}
      <span className="absolute inset-y-3 left-1 w-1 rounded-full bg-accent/60" />
      <span className="absolute inset-y-3 right-1 w-1 rounded-full bg-accent/60" />
    </div>
  );
}
