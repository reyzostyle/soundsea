"use client";

import { useState } from "react";
import { Playlist } from "@/lib/types";
import { MusicIcon, PencilIcon, PlusIcon, SettingsIcon, TrashIcon, XIcon } from "./Icons";

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
};

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
}: Props) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const submitCreate = () => {
    if (newName.trim()) onCreate(newName);
    setCreating(false);
    setNewName("");
  };

  const submitRename = () => {
    if (editingId && editName.trim()) onRename(editingId, editName);
    setEditingId(null);
  };

  const itemClass = (active: boolean) =>
    `flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors ${
      active ? "bg-elevated text-ink" : "text-muted hover:bg-elevated/60 hover:text-ink"
    }`;

  const inputClass =
    "w-full rounded-md border border-line bg-base px-2.5 py-1.5 text-sm text-ink outline-none placeholder:text-muted/70 focus:border-accent";

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-1 overflow-y-auto border-r border-line bg-panel p-3 pb-32 transition-transform md:sticky md:top-0 md:z-auto md:h-dvh md:w-60 md:shrink-0 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between px-2 pt-1 md:hidden">
          <span className="text-base font-semibold tracking-tight">SoundSea</span>
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

        {playlists.map((p) =>
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
              role="button"
              tabIndex={0}
              className={itemClass(view === p.id) + " group cursor-pointer"}
              onClick={() => onSelectView(p.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelectView(p.id)}
            >
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
            className="px-1 py-0.5"
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
              onBlur={submitCreate}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setCreating(false);
                  setNewName("");
                }
              }}
              className={inputClass}
            />
          </form>
        )}

        {playlists.length === 0 && !creating && (
          <p className="px-3 py-1 text-xs text-muted">No playlists yet. Click + to create one.</p>
        )}
      </aside>
    </>
  );
}
