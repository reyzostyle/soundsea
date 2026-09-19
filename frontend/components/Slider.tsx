"use client";

import { CSSProperties } from "react";

// A labelled range input with its current value on the right.
export default function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(value, max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-4 w-full"
        style={{ "--fill": `${pct}%` } as CSSProperties}
      />
    </label>
  );
}
