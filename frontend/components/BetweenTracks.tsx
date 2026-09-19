"use client";

import { useEffect, useRef, useState } from "react";

// How one track hands over to the next, shown the way an editing timeline shows it:
// two clips side by side, the crossing ramps where one fades out as the next fades
// in, and the silence between them. Drag the ramp handle to make the fade longer,
// drag the middle to push the tracks apart.

const MAX = 10; // seconds, for both the fade and the gap
const SPAN = 24; // seconds across the whole widget

type Props = {
  fade: number;
  gap: number;
  onChange: (next: { fade: number; gap: number }) => void;
};

export default function BetweenTracks({ fade, gap, onChange }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<"fade" | "gap" | null>(null);
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
  const gapPx = gap * perSec;
  const clipW = Math.max(0, (width - gapPx) / 2);
  const fadePx = Math.min(fade * perSec, clipW);
  const aEnd = clipW;
  const bStart = clipW + gapPx;

  const round = (v: number) => Math.round(v * 2) / 2; // half-second steps, like the server
  const clamp = (v: number) => Math.min(MAX, Math.max(0, round(v)));

  const xOf = (e: React.PointerEvent) => e.clientX - boxRef.current!.getBoundingClientRect().left;

  const onDown = (e: React.PointerEvent) => {
    const x = xOf(e);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    // the middle belongs to the gap, the ramp shoulders to the fade
    dragRef.current = Math.abs(x - width / 2) <= Math.max(12, gapPx / 2) ? "gap" : "fade";
    onMove(e);
  };

  const onMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const x = xOf(e);
    if (drag === "gap") onChange({ fade, gap: clamp(((x - width / 2) * 2) / perSec) });
    else {
      // either shoulder sets the same length: it is one crossfade
      const len = x < width / 2 ? aEnd - x : x - bStart;
      onChange({ fade: clamp(len / perSec), gap });
    }
  };

  const stop = () => {
    dragRef.current = null;
  };

  const key = (field: "fade" | "gap") => (e: React.KeyboardEvent) => {
    const step = e.key === "ArrowLeft" || e.key === "ArrowDown" ? -0.5 : e.key === "ArrowRight" || e.key === "ArrowUp" ? 0.5 : 0;
    if (!step) return;
    e.preventDefault();
    if (field === "fade") onChange({ fade: clamp(fade + step), gap });
    else onChange({ fade, gap: clamp(gap + step) });
  };

  const clip = "absolute inset-y-0 overflow-hidden rounded-md bg-elevated";

  return (
    <div>
      <div
        ref={boxRef}
        className="relative h-20 w-full touch-none select-none"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        {/* the two tracks */}
        <div className={clip} style={{ left: 0, width: clipW }}>
          <span className="absolute bottom-1.5 left-2 text-[11px] text-muted">This track</span>
        </div>
        <div className={clip} style={{ left: bStart, right: 0 }}>
          <span className="absolute bottom-1.5 left-2 text-[11px] text-muted">Next track</span>
        </div>

        {/* the crossing ramps, drawn over the ends that fade */}
        {width > 0 && (
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${width} 80`} preserveAspectRatio="none">
            {fadePx > 0 && (
              <>
                <polygon points={`${aEnd - fadePx},0 ${aEnd},0 ${aEnd},80`} className="fill-app/70" />
                <polygon points={`${bStart},0 ${bStart + fadePx},0 ${bStart},80`} className="fill-app/70" />
              </>
            )}
            <polyline
              points={`${aEnd - fadePx},0 ${aEnd},80`}
              className="fill-none stroke-accent"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={`${bStart},80 ${bStart + fadePx},0`}
              className="fill-none stroke-accent"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {/* handles */}
        <div
          role="slider"
          tabIndex={0}
          aria-label="Fade between tracks, seconds"
          aria-valuemin={0}
          aria-valuemax={MAX}
          aria-valuenow={fade}
          onKeyDown={key("fade")}
          className="absolute -top-1.5 h-4 w-4 -translate-x-1/2 cursor-ew-resize rounded-full border-2 border-accent bg-app outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ left: aEnd - fadePx }}
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label="Gap between tracks, seconds"
          aria-valuemin={0}
          aria-valuemax={MAX}
          aria-valuenow={gap}
          onKeyDown={key("gap")}
          className="absolute top-1/2 h-9 w-2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full bg-accent outline-none focus-visible:ring-2 focus-visible:ring-accent"
          style={{ left: width / 2 }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-muted tabular-nums">
        <span>{fade ? `Fade ${fade.toFixed(1)} s` : "No fade"}</span>
        <span>{gap ? `Gap ${gap.toFixed(1)} s of silence` : "No gap"}</span>
      </div>
    </div>
  );
}
