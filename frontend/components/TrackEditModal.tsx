"use client";

import { useRef, useState } from "react";
import { Track } from "@/lib/types";
import { downscaleToDataUrl } from "@/lib/image";
import { MusicIcon, PencilIcon, XIcon } from "./Icons";

type Props = {
  track: Track;
  onClose: () => void;
  onSave: (changes: { title: string; thumbnail: string | null }) => void;
};

export default function TrackEditModal({ track, onClose, onSave }: Props) {
  const [title, setTitle] = useState(track.title);
  const [thumbnail, setThumbnail] = useState<string | null>(track.thumbnail);
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

  const save = () => {
    onSave({ title: title.trim() || track.title, thumbnail });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="anim-fade absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="anim-pop relative w-full max-w-sm rounded-xl border border-line bg-panel p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-ink">Edit track</h2>
          <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-elevated hover:text-ink" aria-label="Close">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-4">
          <div className="flex shrink-0 flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative h-20 w-20 overflow-hidden rounded-md bg-elevated"
              aria-label="Change cover"
            >
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnail} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <MusicIcon className="h-6 w-6 text-muted" />
                </div>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <PencilIcon className="h-5 w-5 text-white" />
              </span>
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-20 rounded-md border border-line py-1 text-xs text-muted hover:text-ink"
            >
              Change
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <label className="mb-1 block text-xs font-medium text-muted">Title</label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              rows={4}
              className="w-full resize-none rounded-md border border-line bg-app px-3 py-2 text-sm text-ink outline-none focus:border-accent"
            />
          </div>
        </div>

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
