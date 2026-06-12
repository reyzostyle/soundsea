"use client";

import { useState } from "react";
import { Playlist } from "@/lib/types";
import { MusicIcon, PencilIcon, PlusIcon, TrashIcon, WaveIcon, XIcon } from "./Icons";
import AuthButton from "./AuthButton";

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
    `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
      active ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-1 overflow-y-auto border-r border-slate-800 bg-slate-950 p-4 pb-32 transition-transform md:sticky md:top-0 md:z-auto md:h-dvh md:w-60 md:shrink-0 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 px-3 text-lg font-bold tracking-tight">
            <WaveIcon className="h-5 w-5 text-cyan-400" />
            <span>
              Sound<span className="text-cyan-400">Sea</span>
            </span>
          </span>
          <button className="p-1 text-slate-400 hover:text-white md:hidden" onClick={onClose} aria-label="Close menu">
            <XIcon />
          </button>
        </div>

        <div className="mb-4 px-1">
          <AuthButton />
        </div>

        <button className={itemClass(view === "library")} onClick={() => onSelectView("library")}>
          <MusicIcon className="h-4 w-4 shrink-0" />
          <span className="flex-1 truncate">Library</span>
          <span className="text-xs text-slate-500">{trackCount}</span>
        </button>

        <div className="mt-5 mb-1 flex items-center justify-between px-3">
          <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Playlists</span>
          <button
            className="text-slate-400 hover:text-white"
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
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm outline-none focus:border-cyan-500"
              />
            </form>
          ) : (
            <div
              key={p.id}
              role="button"
              tabIndex={0}
              className={itemClass(view === p.id) + " cursor-pointer"}
              onClick={() => onSelectView(p.id)}
              onKeyDown={(e) => e.key === "Enter" && onSelectView(p.id)}
            >
              <span className="flex-1 truncate">{p.name}</span>
              <span className="text-xs text-slate-600">{p.trackIds.length}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingId(p.id);
                  setEditName(p.name);
                }}
                className="p-0.5 text-slate-500 hover:text-white"
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
                className="p-0.5 text-slate-500 hover:text-red-400"
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
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-500"
            />
          </form>
        )}

        {playlists.length === 0 && !creating && (
          <p className="px-3 py-1 text-xs text-slate-600">No playlists yet — click + to create one.</p>
        )}
      </aside>
    </>
  );
}
