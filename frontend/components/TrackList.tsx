"use client";

import { useState } from "react";
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
  XIcon,
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

// A YouTube-Music-style bottom sheet of actions for one track. Rendered in a portal
// so it always sits above everything and never gets clipped by the scroll area.
function TrackActionSheet({
  track,
  playlists,
  isPlaylistView,
  canMoveUp,
  canMoveDown,
  onClose,
  onEdit,
  onAddToPlaylist,
  onMoveUp,
  onMoveDown,
  onRemove,
}: {
  track: Track;
  playlists: Playlist[];
  isPlaylistView: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}) {
  const [addingTo, setAddingTo] = useState(false);
  const row = "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm text-ink hover:bg-elevated disabled:opacity-40";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative max-h-[80vh] w-full overflow-y-auto rounded-t-2xl border border-line bg-panel p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:m-4 sm:max-w-sm sm:rounded-2xl">
        <div className="mx-auto mt-1 mb-2 h-1 w-9 rounded-full bg-line sm:hidden" />

        {/* track header */}
        <div className="mb-1 flex items-center gap-3 px-2 py-2">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-elevated">
            {track.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track.thumbnail} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MusicIcon className="h-5 w-5 text-muted" />
              </div>
            )}
          </div>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{track.title}</p>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-elevated hover:text-ink" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-1 h-px bg-line" />

        {addingTo ? (
          <>
            <button onClick={() => setAddingTo(false)} className={row + " text-muted"}>
              <ChevronUpIcon className="h-5 w-5 -rotate-90" /> Back
            </button>
            {playlists.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted">No playlists yet. Create one from the menu.</p>
            ) : (
              playlists.map((p) => (
                <button key={p.id} onClick={() => { onAddToPlaylist(p.id); onClose(); }} className={row}>
                  <PlusIcon className="h-5 w-5 text-muted" />
                  <span className="truncate">{p.name}</span>
                </button>
              ))
            )}
          </>
        ) : (
          <>
            <button onClick={() => { onEdit(); onClose(); }} className={row}>
              <PencilIcon className="h-5 w-5 text-muted" /> Edit details
            </button>
            <button onClick={() => setAddingTo(true)} className={row}>
              <PlusIcon className="h-5 w-5 text-muted" /> Add to playlist
            </button>
            {isPlaylistView && (
              <>
                <button onClick={() => { onMoveUp(); onClose(); }} disabled={!canMoveUp} className={row}>
                  <ChevronUpIcon className="h-5 w-5 text-muted" /> Move up
                </button>
                <button onClick={() => { onMoveDown(); onClose(); }} disabled={!canMoveDown} className={row}>
                  <ChevronDownIcon className="h-5 w-5 text-muted" /> Move down
                </button>
              </>
            )}
            <button onClick={() => { onRemove(); onClose(); }} className={row + " text-red-500"}>
              {isPlaylistView ? <MinusIcon className="h-5 w-5" /> : <TrashIcon className="h-5 w-5" />}
              {isPlaylistView ? "Remove from playlist" : "Delete from library"}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
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
  const [menuId, setMenuId] = useState<string | null>(null);

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-line px-6 py-16 text-center">
        <MusicIcon className="h-8 w-8 text-muted/60" />
        <p className="max-w-sm text-sm text-muted">{emptyHint}</p>
      </div>
    );
  }

  const menuIndex = tracks.findIndex((t) => t.id === menuId);
  const menuTrack = menuIndex >= 0 ? tracks[menuIndex] : null;

  return (
    <>
      <ul className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-panel">
        {tracks.map((t) => {
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuId(t.id);
                  }}
                  className="rounded-md p-2 text-muted hover:bg-elevated hover:text-ink"
                  title="More"
                  aria-label="More options"
                >
                  <MoreIcon className="h-5 w-5" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {menuTrack && (
        <TrackActionSheet
          track={menuTrack}
          playlists={playlists}
          isPlaylistView={isPlaylistView}
          canMoveUp={menuIndex > 0}
          canMoveDown={menuIndex < tracks.length - 1}
          onClose={() => setMenuId(null)}
          onEdit={() => onEdit(menuTrack.id)}
          onAddToPlaylist={(plId) => onAddToPlaylist(plId, menuTrack.id)}
          onMoveUp={() => onMove(menuTrack.id, -1)}
          onMoveDown={() => onMove(menuTrack.id, 1)}
          onRemove={() => onRemove(menuTrack.id)}
        />
      )}
    </>
  );
}
