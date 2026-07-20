"use client";

import { useRef, useState } from "react";
import { Playlist, Track } from "@/lib/types";
import { formatTime } from "@/lib/format";
import { downscaleToDataUrl } from "@/lib/image";
import { useSquareCover } from "@/lib/useSquareCover";
import { CheckIcon, MusicIcon, PencilIcon, PlayIcon, ShareIcon, ShuffleIcon, XIcon } from "./Icons";

type Props = {
  playlist: Playlist;
  tracks: Track[];
  onPlay: () => void;
  onShuffle: () => void;
  onShare: () => void;
  onSave: (changes: { name: string; thumbnail: string | null }) => void;
};

export default function PlaylistHeader({ playlist, tracks, onPlay, onShuffle, onShare, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(playlist.name);
  // undefined = cover untouched during this edit session
  const [pendingThumb, setPendingThumb] = useState<string | undefined>(undefined);
  const fileRef = useRef<HTMLInputElement>(null);

  const savedCover = playlist.thumbnail || tracks.find((t) => t.thumbnail)?.thumbnail || null;
  const cover = useSquareCover(editing && pendingThumb !== undefined ? pendingThumb : savedCover);
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
  const empty = tracks.length === 0;

  const startEdit = () => {
    setName(playlist.name);
    setPendingThumb(undefined);
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    onSave({
      name: name.trim() || playlist.name,
      thumbnail: pendingThumb !== undefined ? pendingThumb : (playlist.thumbnail ?? null),
    });
    setEditing(false);
  };

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setPendingThumb(await downscaleToDataUrl(file));
      } catch {}
    }
    e.target.value = "";
  };

  const roundBtn = "flex h-10 w-10 items-center justify-center rounded-full transition-colors";

  return (
    <div className="mb-5">
      {/* Spotify-style banner: the square cover sits sharp on a blurred fill of
          itself; the bottom fades into the page. */}
      <div className="relative -mx-4 h-56 overflow-hidden sm:h-64 md:-mx-8">
        {cover ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl" />
            <div className="absolute inset-0 bg-app/25" />
            {editing ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="relative z-[1] mx-auto block h-full"
                aria-label="Change cover"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="h-full object-contain" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <PencilIcon className="h-8 w-8 text-white" />
                </span>
              </button>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt="" className="relative z-[1] mx-auto h-full object-contain" />
            )}
          </>
        ) : editing ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-app"
            aria-label="Change cover"
          >
            <PencilIcon className="h-10 w-10 text-muted" />
          </button>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent-soft to-app">
            <MusicIcon className="h-14 w-14 text-muted" />
          </div>
        )}
        {/* fade the bottom of the image into the background (Spotify-style) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-40 bg-gradient-to-t from-app via-app/80 to-transparent" />
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveEdit();
              if (e.key === "Escape") cancelEdit();
            }}
            className="absolute right-4 bottom-2 left-4 z-[3] rounded-md border border-white/25 bg-black/40 px-2 py-1 text-3xl font-extrabold tracking-tight text-white backdrop-blur outline-none focus:border-accent sm:text-4xl md:left-8"
            aria-label="Playlist name"
          />
        ) : (
          <h1 className="absolute right-4 bottom-2 left-4 z-[3] line-clamp-2 text-3xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] sm:text-4xl md:left-8">
            {playlist.name}
          </h1>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

      <p className="mt-2 text-sm text-muted">
        {tracks.length} {tracks.length === 1 ? "track" : "tracks"}
        {totalSeconds > 0 && <> · {formatTime(totalSeconds)}</>}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={onPlay}
          disabled={empty}
          className="flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition duration-150 enabled:hover:bg-brand-hover enabled:active:scale-[0.97] disabled:opacity-40"
        >
          <PlayIcon className="h-4 w-4" /> Play
        </button>
        <button
          onClick={onShuffle}
          disabled={empty}
          className="flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-semibold text-ink transition duration-150 enabled:hover:bg-elevated enabled:active:scale-[0.97] disabled:opacity-40"
        >
          <ShuffleIcon className="h-4 w-4" /> Shuffle
        </button>
        <span className="flex-1" />
        {editing ? (
          <>
            <button onClick={cancelEdit} className={`${roundBtn} text-muted hover:bg-elevated hover:text-ink`} aria-label="Cancel" title="Cancel">
              <XIcon className="h-5 w-5" />
            </button>
            <button onClick={saveEdit} className={`${roundBtn} bg-brand text-white hover:bg-brand-hover`} aria-label="Save" title="Save">
              <CheckIcon className="h-5 w-5" />
            </button>
          </>
        ) : (
          <>
            <button onClick={startEdit} className={`${roundBtn} text-muted hover:bg-elevated hover:text-ink`} aria-label="Edit playlist" title="Edit playlist">
              <PencilIcon className="h-5 w-5" />
            </button>
            <button onClick={onShare} className={`${roundBtn} text-muted hover:bg-elevated hover:text-ink`} aria-label="Share playlist" title="Share playlist">
              <ShareIcon className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
