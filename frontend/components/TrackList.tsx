"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Playlist, Track } from "@/lib/types";
import { formatTime } from "@/lib/format";
import {
  ChevronUpIcon,
  GripIcon,
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
  onRemove: (trackId: string) => void;
  /** present in playlist view: enables drag-to-reorder via the grip handles */
  onReorder?: (ids: string[]) => void;
};

type DragState = { id: string; from: number; dy: number };

// A YouTube-Music-style bottom sheet of actions for one track. Rendered in a portal
// so it always sits above everything and never gets clipped by the scroll area.
function TrackActionSheet({
  track,
  playlists,
  isPlaylistView,
  onClose,
  onEdit,
  onAddToPlaylist,
  onRemove,
}: {
  track: Track;
  playlists: Playlist[];
  isPlaylistView: boolean;
  onClose: () => void;
  onEdit: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onRemove: () => void;
}) {
  const [addingTo, setAddingTo] = useState(false);
  const row = "flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm text-ink hover:bg-elevated disabled:opacity-40";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="anim-fade absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="anim-sheet relative max-h-[80vh] w-full overflow-y-auto rounded-t-xl border border-line bg-panel p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:m-4 sm:max-w-sm sm:rounded-xl">
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
  onRemove,
  onReorder,
}: Props) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const rowHeight = useRef(68);
  const startYRef = useRef(0);

  const canDrag = isPlaylistView && !!onReorder && tracks.length > 1;

  const dropIndex = drag
    ? Math.max(0, Math.min(tracks.length - 1, drag.from + Math.round(drag.dy / rowHeight.current)))
    : -1;

  const beginDrag = (e: React.PointerEvent, id: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const rowEl = (e.currentTarget as HTMLElement).closest("[data-track-row]") as HTMLElement | null;
    if (rowEl) rowHeight.current = rowEl.offsetHeight;
    startYRef.current = e.clientY;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
    setDrag({ id, from: index, dy: 0 });
  };

  const moveDrag = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ ...drag, dy: e.clientY - startYRef.current });
  };

  const endDrag = () => {
    if (!drag) return;
    if (dropIndex !== drag.from && onReorder) {
      const ids = tracks.map((t) => t.id);
      const [moved] = ids.splice(drag.from, 1);
      ids.splice(dropIndex, 0, moved);
      onReorder(ids);
    }
    setDrag(null);
  };

  const rowShift = (index: number): number => {
    if (!drag || tracks[index]?.id === drag.id) return 0;
    if (drag.from < dropIndex && index > drag.from && index <= dropIndex) return -rowHeight.current;
    if (drag.from > dropIndex && index >= dropIndex && index < drag.from) return rowHeight.current;
    return 0;
  };

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
      <ul className={`divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-panel ${drag ? "select-none" : ""}`}>
        {tracks.map((t, index) => {
          const isCurrent = t.id === currentId;
          const isDragged = drag?.id === t.id;
          return (
            <li
              key={t.id}
              data-track-row
              className={
                drag
                  ? isDragged
                    ? "relative z-10 scale-[1.01] bg-elevated shadow-lg transition-none"
                    : "transition-transform duration-150 ease-out"
                  : ""
              }
              style={drag ? { transform: `translateY(${isDragged ? drag.dy : rowShift(index)}px)` } : undefined}
            >
              <div
                className="group flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-elevated/60"
                onClick={() => (isCurrent ? onTogglePlay() : onPlay(t.id))}
              >
                {canDrag && (
                  <span
                    className="-ml-1 shrink-0 cursor-grab touch-none p-1 text-muted/50 active:cursor-grabbing"
                    onPointerDown={(e) => beginDrag(e, t.id, index)}
                    onPointerMove={moveDrag}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`Reorder ${t.title}`}
                  >
                    <GripIcon className="h-4 w-4" />
                  </span>
                )}
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
          onClose={() => setMenuId(null)}
          onEdit={() => onEdit(menuTrack.id)}
          onAddToPlaylist={(plId) => onAddToPlaylist(plId, menuTrack.id)}
          onRemove={() => onRemove(menuTrack.id)}
        />
      )}
    </>
  );
}
