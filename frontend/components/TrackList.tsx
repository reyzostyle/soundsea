"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Playlist, Track } from "@/lib/types";
import { formatTime } from "@/lib/format";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MinusIcon,
  MoreIcon,
  MusicIcon,
  PauseIcon,
  PencilIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
} from "./Icons";

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
  onEdit: (trackId: string) => void;
  onMove: (trackId: string, direction: -1 | 1) => void;
  onRemove: (trackId: string) => void;
};

function TrackMenu({
  playlists,
  isPlaylistView,
  canMoveUp,
  canMoveDown,
  onEdit,
  onAddToPlaylist,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  playlists: Playlist[];
  isPlaylistView: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onEdit: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [addingTo, setAddingTo] = useState(false);
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number }>({ left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = () => {
    setOpen(false);
    setAddingTo(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      )
        close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggle = () => {
    if (open) return close();
    const r = btnRef.current!.getBoundingClientRect();
    const left = Math.max(8, r.right - 208); // 208 = menu width (w-52)
    const spaceBelow = window.innerHeight - r.bottom;
    setPos(spaceBelow < 260 ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 });
    setOpen(true);
  };

  const itemClass = "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink hover:bg-elevated";

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="rounded-md p-2 text-muted hover:bg-elevated hover:text-ink"
        title="More"
        aria-label="More options"
      >
        <MoreIcon className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom }}
            className="fixed z-[70] w-52 overflow-hidden rounded-md border border-line bg-panel py-1 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
          {addingTo ? (
            <>
              <button onClick={() => setAddingTo(false)} className={itemClass + " text-muted"}>
                <ChevronUpIcon className="h-4 w-4 rotate-[-90deg]" /> Back
              </button>
              {playlists.length === 0 ? (
                <p className="px-3 py-2 text-xs text-muted">No playlists yet.</p>
              ) : (
                playlists.map((p) => (
                  <button
                    key={p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToPlaylist(p.id);
                      close();
                    }}
                    className={itemClass}
                  >
                    <span className="truncate">{p.name}</span>
                  </button>
                ))
              )}
            </>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(); close(); }} className={itemClass}>
                <PencilIcon className="h-4 w-4" /> Edit details
              </button>
              <button onClick={(e) => { e.stopPropagation(); setAddingTo(true); }} className={itemClass}>
                <PlusIcon className="h-4 w-4" /> Add to playlist
              </button>
              {isPlaylistView && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveUp(); close(); }}
                    disabled={!canMoveUp}
                    className={itemClass + " disabled:opacity-40"}
                  >
                    <ChevronUpIcon className="h-4 w-4" /> Move up
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onMoveDown(); close(); }}
                    disabled={!canMoveDown}
                    className={itemClass + " disabled:opacity-40"}
                  >
                    <ChevronDownIcon className="h-4 w-4" /> Move down
                  </button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation(); onRemove(); close(); }} className={itemClass + " text-red-500 hover:text-red-500"}>
                {isPlaylistView ? <MinusIcon className="h-4 w-4" /> : <TrashIcon className="h-4 w-4" />}
                {isPlaylistView ? "Remove from playlist" : "Delete from library"}
              </button>
            </>
          )}
          </div>,
          document.body
        )}
    </>
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
  onEdit,
  onMove,
  onRemove,
}: Props) {
  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-16 text-center">
        <MusicIcon className="h-8 w-8 text-muted/60" />
        <p className="max-w-sm text-sm text-muted">{emptyHint}</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-panel">
      {tracks.map((t, i) => {
        const isCurrent = t.id === currentId;
        return (
          <li key={t.id}>
            <div
              className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-elevated/60"
              onClick={() => (isCurrent ? onTogglePlay() : onPlay(t.id))}
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-elevated">
                {t.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <MusicIcon className="h-5 w-5 text-muted" />
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
                <p className={`truncate text-sm font-medium ${isCurrent ? "text-accent" : "text-ink"}`}>{t.title}</p>
                <p className="text-xs text-muted">{formatTime(t.duration)}</p>
              </div>
              <TrackMenu
                playlists={playlists}
                isPlaylistView={isPlaylistView}
                canMoveUp={i > 0}
                canMoveDown={i < tracks.length - 1}
                onEdit={() => onEdit(t.id)}
                onAddToPlaylist={(plId) => onAddToPlaylist(plId, t.id)}
                onMoveUp={() => onMove(t.id, -1)}
                onMoveDown={() => onMove(t.id, 1)}
                onRemove={() => onRemove(t.id)}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
