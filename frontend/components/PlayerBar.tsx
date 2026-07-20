"use client";

import { CSSProperties } from "react";
import { RepeatMode, Track } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { MusicIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, RepeatIcon, ShuffleIcon, VolumeIcon } from "./Icons";

type Props = {
  track: Track | null;
  isPlaying: boolean;
  position: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  volume: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (seconds: number) => void;
  onCycleRepeat: () => void;
  onToggleShuffle: () => void;
  onVolume: (v: number) => void;
};

const repeatLabel: Record<RepeatMode, string> = {
  off: "Repeat: off",
  all: "Repeat: playlist",
  one: "Repeat: one track",
};

export default function PlayerBar({
  track,
  isPlaying,
  position,
  duration,
  repeat,
  shuffle,
  volume,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onCycleRepeat,
  onToggleShuffle,
  onVolume,
}: Props) {
  const total = duration || track?.duration || 0;
  const pct = total ? Math.min(100, (position / total) * 100) : 0;

  return (
    <div className="shrink-0 border-t border-line bg-panel">
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          {track?.thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={track.thumbnail} alt="" className="h-11 w-11 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-elevated">
              <MusicIcon className="h-5 w-5 text-muted" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{track ? track.title : "Nothing playing"}</p>
            {!track && <p className="truncate text-xs text-muted">Download a track to get started</p>}
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={onToggleShuffle}
              title={shuffle ? "Shuffle: on" : "Shuffle: off"}
              aria-label={shuffle ? "Shuffle: on" : "Shuffle: off"}
              className={`hidden rounded-md p-2 sm:block ${shuffle ? "text-accent" : "text-muted hover:text-ink"}`}
            >
              <ShuffleIcon className="h-5 w-5" />
            </button>
            <button
              onClick={onPrev}
              disabled={!track}
              className="rounded-md p-2 text-muted enabled:hover:text-ink disabled:opacity-40"
              aria-label="Previous track"
            >
              <PrevIcon />
            </button>
            <button
              onClick={onTogglePlay}
              disabled={!track}
              className="rounded-full bg-ink p-2.5 text-app transition duration-150 enabled:hover:opacity-90 enabled:active:scale-95 disabled:opacity-40"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              onClick={onNext}
              disabled={!track}
              className="rounded-md p-2 text-muted enabled:hover:text-ink disabled:opacity-40"
              aria-label="Next track"
            >
              <NextIcon />
            </button>
            <button
              onClick={onCycleRepeat}
              title={repeatLabel[repeat]}
              aria-label={repeatLabel[repeat]}
              className={`relative rounded-md p-2 ${
                repeat === "off" ? "text-muted hover:text-ink" : "text-accent"
              }`}
            >
              <RepeatIcon className="h-5 w-5" />
              {repeat === "one" && (
                <span className="absolute -top-0.5 -right-0.5 rounded-full bg-accent px-1 text-[9px] leading-3 font-bold text-app">
                  1
                </span>
              )}
            </button>
            {/* volume: desktop only (iOS ignores programmatic volume) */}
            <div className="hidden items-center gap-1.5 pl-2 md:flex">
              <button
                onClick={() => onVolume(volume === 0 ? 1 : 0)}
                className={`p-1 ${volume === 0 ? "text-muted/50" : "text-muted hover:text-ink"}`}
                title={volume === 0 ? "Unmute" : "Mute"}
                aria-label={volume === 0 ? "Unmute" : "Mute"}
              >
                <VolumeIcon className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => onVolume(Number(e.target.value))}
                className="h-4 w-24"
                style={{ "--fill": `${volume * 100}%` } as CSSProperties}
                aria-label="Volume"
              />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted tabular-nums">
          <span className="w-10 text-right">{formatTime(position)}</span>
          <input
            type="range"
            min={0}
            max={total || 1}
            step={0.1}
            value={Math.min(position, total || 0)}
            onChange={(e) => onSeek(Number(e.target.value))}
            disabled={!track}
            className="h-4 min-w-0 flex-1 disabled:opacity-40"
            style={{ "--fill": `${pct}%` } as CSSProperties}
            aria-label="Seek"
          />
          <span className="w-10">{formatTime(total || null)}</span>
        </div>
      </div>
    </div>
  );
}
