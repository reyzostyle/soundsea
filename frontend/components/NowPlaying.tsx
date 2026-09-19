"use client";

import { CSSProperties, useEffect } from "react";
import { createPortal } from "react-dom";
import { RepeatMode, Track } from "@/lib/types";
import { formatTime } from "@/lib/format";
import TrackCover from "./TrackCover";
import { ChevronDownIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon, RepeatOneIcon, ShuffleIcon } from "./Icons";

// The full-screen player, for phones: tap the bar at the bottom and the track fills
// the screen — big cover, title, scrubber and the transport under your thumb.
export default function NowPlaying({
  track,
  isPlaying,
  position,
  duration,
  repeat,
  shuffle,
  onClose,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onCycleRepeat,
  onToggleShuffle,
}: {
  track: Track;
  isPlaying: boolean;
  position: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  onClose: () => void;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
}) {
  const total = duration || track.duration || 0;
  const pct = total ? Math.min(100, (position / total) * 100) : 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="anim-sheet fixed inset-0 z-[70] flex flex-col bg-app pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={onClose}
          aria-label="Close player"
          className="rounded-full p-2 text-muted transition-colors hover:bg-elevated hover:text-ink"
        >
          <ChevronDownIcon className="h-6 w-6" />
        </button>
        <span className="text-xs tracking-wider text-muted uppercase">Now playing</span>
        <span className="w-10" />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-8 px-6">
        <TrackCover track={track} className="mx-auto aspect-square w-full max-w-sm rounded-lg" />

        <div>
          <h1 className="line-clamp-2 text-xl leading-snug font-bold tracking-tight text-balance">{track.title}</h1>
          <p className="mt-1 text-sm text-muted">SoundSea</p>
        </div>

        <div>
          <input
            type="range"
            min={0}
            max={total || 1}
            step={0.1}
            value={Math.min(position, total || 0)}
            onChange={(e) => onSeek(parseFloat(e.target.value))}
            className="h-5 w-full"
            aria-label="Seek"
            style={{ "--fill": `${pct}%` } as CSSProperties}
          />
          <div className="mt-1 flex justify-between text-xs text-muted tabular-nums">
            <span>{formatTime(position)}</span>
            <span>{formatTime(total || null)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={onToggleShuffle}
            aria-label="Shuffle"
            className={`rounded-full p-3 ${shuffle ? "text-accent" : "text-muted"}`}
          >
            <ShuffleIcon className="h-5 w-5" />
          </button>
          <button onClick={onPrev} aria-label="Previous track" className="rounded-full p-3 text-ink">
            <PrevIcon className="h-7 w-7" />
          </button>
          <button
            onClick={onTogglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-brand text-on-brand"
          >
            {isPlaying ? <PauseIcon className="h-7 w-7" /> : <PlayIcon className="h-7 w-7 translate-x-0.5" />}
          </button>
          <button onClick={onNext} aria-label="Next track" className="rounded-full p-3 text-ink">
            <NextIcon className="h-7 w-7" />
          </button>
          <button
            onClick={onCycleRepeat}
            aria-label="Repeat"
            className={`rounded-full p-3 ${repeat === "off" ? "text-muted" : "text-accent"}`}
          >
            {repeat === "one" ? <RepeatOneIcon className="h-5 w-5" /> : <RepeatIcon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
