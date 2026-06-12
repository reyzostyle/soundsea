"use client";

import { useEffect, useRef, useState } from "react";
import { Playlist, Track } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { MinusIcon, MusicIcon, PauseIcon, PlayIcon, PlusIcon, TrashIcon } from "./Icons";

type Props = {
  tracks: Track[];
  emptyHint: string;
  currentId: string | null;
  isPlaying: boolean;
  playlists: Playlist[];
  isPlaylistView: boolean;
  onPlay: (trackId: string) => void;
  onTogglePlay: () => void;
  onAddToPlaylist: (playlistId: string, trackId: string) => void;
  onRemove: (trackId: string) => void;
};

function AddToPlaylistButton({
  playlists,
  onAdd,
}: {
  playlists: Playlist[];
  onAdd: (playlistId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        title="Add to playlist"
        aria-label="Add to playlist"
      >
        <PlusIcon className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute top-full right-0 z-20 mt-1 w-48 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1 shadow-xl">
          {playlists.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No playlists yet — create one in the sidebar.</p>
          ) : (
            playlists.map((p) => (
              <button
                key={p.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onAdd(p.id);
                  setOpen(false);
                }}
                className="block w-full truncate px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800"
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function TrackList({
  tracks,
  emptyHint,
  currentId,
  isPlaying,
  playlists,
  isPlaylistView,
  onPlay,
  onTogglePlay,
  onAddToPlaylist,
  onRemove,
}: Props) {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-800 px-6 py-16 text-center">
        <MusicIcon className="h-8 w-8 text-slate-700" />
        <p className="max-w-sm text-sm text-slate-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-800/60 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40">
      {tracks.map((t) => {
        const isCurrent = t.id === currentId;
        return (
          <li key={t.id}>
            <div
              className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-900/80"
              onClick={() => (isCurrent ? onTogglePlay() : onPlay(t.id))}
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-800">
                {t.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <MusicIcon className="h-5 w-5 text-slate-600" />
                  </div>
                )}
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity ${
                    isCurrent ? "" : "opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isCurrent && isPlaying ? (
                    <PauseIcon className="h-5 w-5 text-white" />
                  ) : (
                    <PlayIcon className="h-5 w-5 text-white" />
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-sm font-medium ${isCurrent ? "text-cyan-400" : "text-slate-100"}`}>
                  {t.title}
                </p>
                <p className="text-xs text-slate-500">{formatTime(t.duration)}</p>
              </div>
              <AddToPlaylistButton playlists={playlists} onAdd={(plId) => onAddToPlaylist(plId, t.id)} />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(t.id);
                }}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                title={isPlaylistView ? "Remove from playlist" : "Delete from library"}
                aria-label={isPlaylistView ? "Remove from playlist" : "Delete from library"}
              >
                {isPlaylistView ? <MinusIcon className="h-4 w-4" /> : <TrashIcon className="h-4 w-4" />}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
