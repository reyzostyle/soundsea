"use client";

import { useRef, useState } from "react";
import { Playlist } from "@/lib/types";
import { CheckIcon, GripIcon, MusicIcon, PencilIcon, PlusIcon, SettingsIcon, TrashIcon, XIcon } from "./Icons";

type Props = {
  playlists: Playlist[];
  trackCount: number;
  view: string;
  open: boolean;
  onClose: () => void;
  onSelectView: (view: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onReorder: (ids: string[]) => void;
};

type DragState = { id: string; from: number; dy: number };

export default function Sidebar({
  playlists,
  trackCount,
  view,
  open,
  onClose,
  onSelectView,
  onCreate,
  onRename,
  onDelete,
  onReorder,
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [drag, setDrag] = useState<DragState | null>(null);
  const rowHeight = useRef(40);
  const startYRef = useRef(0);

  const submitCreate = () => {
    if (newName.trim()) onCreate(newName);
    setCreating(false);
    setNewName("");
  };

  const submitRename = () => {
    if (editingId && editName.trim()) onRename(editingId, editName);
    setEditingId(null);
  };

  // --- drag to reorder (grip handle, pointer events, springy FLIP-style shifts) ---

  const dropIndex = drag
    ? Math.max(0, Math.min(playlists.length - 1, drag.from + Math.round(drag.dy / rowHeight.current)))
    : -1;

  const beginDrag = (e: React.PointerEvent, id: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    const row = (e.currentTarget as HTMLElement).closest("[data-playlist-row]") as HTMLElement | null;
    if (row) rowHeight.current = row.offsetHeight + 4; // + list gap
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
    if (dropIndex !== drag.from) {
      const ids = playlists.map((p) => p.id);
      const [moved] = ids.splice(drag.from, 1);
      ids.splice(dropIndex, 0, moved);
      onReorder(ids);
    }
    setDrag(null);
  };

  const rowShift = (index: number): number => {
    if (!drag || playlists[index]?.id === drag.id) return 0;
    if (drag.from < dropIndex && index > drag.from && index <= dropIndex) return -rowHeight.current;
    if (drag.from > dropIndex && index >= dropIndex && index < drag.from) return rowHeight.current;
    return 0;
  };

  const itemClass = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
      active ? "bg-elevated text-ink" : "text-muted hover:bg-elevated/60 hover:text-ink"
    }`;

  const inputClass =
    "w-full rounded-md border border-line bg-app px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-accent";

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-1 overflow-y-auto border-r border-line bg-panel p-3 pb-6 transition-transform duration-200 ease-out md:static md:z-auto md:w-60 md:shrink-0 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } ${drag ? "select-none" : ""}`}
      >
        <div className="mb-4 flex items-center justify-between px-2 pt-1 md:hidden">
          <span className="text-lg font-semibold tracking-tight text-ink">SoundSea</span>
          <button className="p-1 text-muted hover:text-ink" onClick={onClose} aria-label="Close menu">
            <XIcon />
          </button>
        </div>

        <button className={itemClass(view === "library")} onClick={() => onSelectView("library")}>
          <MusicIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Library</span>
          <span className="text-xs text-muted">{trackCount}</span>
        </button>

        <button className={itemClass(view === "settings")} onClick={() => onSelectView("settings")}>
          <SettingsIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Settings</span>
        </button>

        <div className="mt-5 mb-1 flex items-center justify-between px-3">
          <span className="text-xs font-semibold tracking-wider text-muted uppercase">Playlists</span>
          <button
            className="text-muted hover:text-ink"
            onClick={() => setCreating(true)}
            aria-label="New playlist"
            title="New playlist"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>

        {playlists.map((p, index) =>
          editingId === p.id ? (
            <form
              key={p.id}
              className="px-1 py-0.5"
              onSubmit={(e) => {
                e.preventDefault();
                submitRename();
              }}
            >
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={submitRename}
                onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                className={inputClass}
              />
            </form>
          ) : (
            <div
              key={p.id}
              data-playlist-row
              role="button"
              tabIndex={0}
              className={
                itemClass(view === p.id) +
                " group cursor-pointer " +
                (drag?.id === p.id
                  ? "relative z-10 scale-[1.02] bg-elevated shadow-lg transition-none"
                  : "transition-transform duration-150 ease-out")
              }
              style={
                drag
                  ? { transform: `translateY(${drag.id === p.id ? drag.dy : rowShift(index)}px)` }
                  : undefined
              }
              onClick={() => onSelectView(p.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelectView(p.id)}
            >
              <span
                className="-ml-1 shrink-0 cursor-grab touch-none p-0.5 text-muted/50 active:cursor-grabbing"
                onPointerDown={(e) => beginDrag(e, p.id, index)}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Reorder ${p.name}`}
              >
                <GripIcon className="h-4 w-4" />
              </span>
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-xs text-muted group-hover:hidden">{p.trackIds.length}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(p.id);
                  setEditName(p.name);
                }}
                className="hidden p-0.5 text-muted hover:text-ink group-hover:block"
                aria-label={`Rename ${p.name}`}
                title="Rename"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(p.id);
                }}
                className="hidden p-0.5 text-muted hover:text-red-500 group-hover:block"
                aria-label={`Delete ${p.name}`}
                title="Delete"
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        )}

        {creating && (
          <form
            className="flex items-center gap-1 px-1 py-0.5"
            onSubmit={(e) => {
              e.preventDefault();
              submitCreate();
            }}
          >
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Playlist name"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!newName.trim()}
              className="shrink-0 rounded-md bg-brand p-2 text-white transition-colors enabled:hover:bg-brand-hover disabled:opacity-40"
              aria-label="Create playlist"
              title="Create"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
          </form>
        )}

        {playlists.length === 0 && !creating && (
          <p className="px-3 py-1 text-xs text-muted">No playlists yet. Click + to create one.</p>
        )}
      </aside>
    </>
  );
}
