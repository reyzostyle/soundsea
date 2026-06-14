"use client";

import { Playlist, Track } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { MusicIcon, PencilIcon, PlayIcon, ShareIcon, ShuffleIcon } from "./Icons";

type Props = {
  playlist: Playlist;
  tracks: Track[];
  onPlay: () => void;
  onShuffle: () => void;
  onEdit: () => void;
  onShare: () => void;
};

export default function PlaylistHeader({ playlist, tracks, onPlay, onShuffle, onEdit, onShare }: Props) {
  const cover = playlist.thumbnail || tracks.find((t) => t.thumbnail)?.thumbnail || null;
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const empty = tracks.length === 0;

  return (
    <div className="mb-5">
      {/* Spotify-style banner: the full cover sits sharp on a blurred fill of itself,
          so nothing important gets cropped; the bottom fades into the page. */}
      <div className="relative -mx-4 h-56 overflow-hidden sm:h-64 md:-mx-8">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl" />
            <div className="absolute inset-0 bg-app/25" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" className="relative z-[1] mx-auto h-full object-contain" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-app">
            <MusicIcon className="h-14 w-14 text-muted" />
          </div>
        )}
        {/* fade the bottom of the image into the background (Spotify-style) */}
        <div className="absolute inset-x-0 bottom-0 z-[2] h-40 bg-gradient-to-t from-app via-app/80 to-transparent" />
        <h1 className="absolute right-4 bottom-2 left-4 z-[3] line-clamp-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-4xl md:left-8">
          {playlist.name}
        </h1>
      </div>

      <p className="mt-2 text-sm text-muted">
        {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
        {totalSeconds > 0 && <> · {formatTime(totalSeconds)}</>}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onPlay}
          disabled={empty}
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-brand-hover disabled:opacity-40"
        >
          <PlayIcon className="h-4 w-4" /> Play
        </button>
        <button
          onClick={onShuffle}
          disabled={empty}
          className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition-colors enabled:hover:bg-elevated disabled:opacity-40"
        >
          <ShuffleIcon className="h-4 w-4" /> Shuffle
        </button>
        <span className="flex-1" />
        <button
          onClick={onEdit}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink"
          aria-label="Edit playlist"
          title="Edit playlist"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
        <button
          onClick={onShare}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink"
          aria-label="Share playlist"
          title="Share playlist"
        >
          <ShareIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
