"use client";

import { useRef, useState } from "react";
import { Playlist } from "@/lib/types";
import { downscaleToDataUrl } from "@/lib/image";
import { MusicIcon, XIcon } from "./Icons";

type Props = {
  playlist: Playlist;
  fallbackCover: string | null;
  onClose: () => void;
  onSave: (changes: { name: string; thumbnail: string | null }) => void;
};

export default function PlaylistEditModal({ playlist, fallbackCover, onClose, onSave }: Props) {
  const [name, setName] = useState(playlist.name);
  const [thumbnail, setThumbnail] = useState<string | null>(playlist.thumbnail ?? null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      setThumbnail(await downscaleToDataUrl(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the image.");
    }
  };

  const cover = thumbnail || fallbackCover;

  const save = () => {
    onSave({ name: name.trim() || playlist.name, thumbnail });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-sm rounded-xl border border-line bg-panel p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Edit playlist</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-elevated hover:text-ink" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center">
          <div className="h-28 w-28 overflow-hidden rounded-lg bg-elevated">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MusicIcon className="h-8 w-8 text-muted" />
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
          <div className="mt-2 flex gap-3 text-xs">
            <button onClick={() => fileRef.current?.click()} className="text-accent hover:underline">
              Change cover
            </button>
            {thumbnail && (
              <button onClick={() => setThumbnail(null)} className="text-muted hover:text-ink">
                Reset
              </button>
            )}
          </div>
        </div>

        <label className="mt-4 mb-1 block text-xs font-medium text-muted">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-line bg-app px-3 py-2 text-sm text-ink outline-none focus:border-accent"
        />

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-2 text-sm text-muted hover:text-ink">
            Cancel
          </button>
          <button
            onClick={save}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
