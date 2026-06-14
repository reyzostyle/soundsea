"use client";

import { Playlist, Track } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { MusicIcon, PencilIcon, PlayIcon, ShuffleIcon } from "./Icons";

type Props = {
  playlist: Playlist;
  tracks: Track[];
  onPlay: () => void;
  onShuffle: () => void;
  onEdit: () => void;
};

export default function PlaylistHeader({ playlist, tracks, onPlay, onShuffle, onEdit }: Props) {
  const cover = playlist.thumbnail || tracks.find((t) => t.thumbnail)?.thumbnail || null;
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const empty = tracks.length === 0;

  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <div className="relative">
        <div className="h-44 w-44 overflow-hidden rounded-xl bg-elevated shadow-lg sm:h-52 sm:w-52">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <MusicIcon className="h-12 w-12 text-muted" />
            </div>
          )}
        </div>
        <button
          onClick={onEdit}
          className="absolute right-2 bottom-2 flex h-10 w-10 items-center justify-center rounded-full bg-panel/90 text-ink shadow-md backdrop-blur transition hover:bg-panel"
          aria-label="Edit playlist"
          title="Edit playlist"
        >
          <PencilIcon className="h-5 w-5" />
        </button>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">{playlist.name}</h1>
      <p className="mt-1 text-sm text-muted">
        {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
        {totalSeconds > 0 && <> · {formatTime(totalSeconds)}</>}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={onPlay}
          disabled={empty}
          className="flex items-center gap-2 rounded-full bg-brand px-6 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-brand-hover disabled:opacity-40"
        >
          <PlayIcon className="h-4 w-4" /> Play
        </button>
        <button
          onClick={onShuffle}
          disabled={empty}
          className="flex items-center gap-2 rounded-full border border-line px-6 py-2.5 text-sm font-semibold text-ink transition-colors enabled:hover:bg-elevated disabled:opacity-40"
        >
          <ShuffleIcon className="h-4 w-4" /> Shuffle
        </button>
      </div>
    </div>
  );
}
