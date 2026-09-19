"use client";

import { useEffect, useRef, useState } from "react";
import { Track } from "@/lib/types";
import { audioUrl } from "@/lib/api";
import { formatTime } from "@/lib/format";
import { PublicTrack, fetchPublicLibrary } from "@/lib/cloud";
import TrackCover from "./TrackCover";
import { CheckIcon, MusicIcon, PauseIcon, PlayIcon, PlusIcon, SearchIcon, Spinner } from "./Icons";

type Props = {
  myTracks: Track[];
  myUserId: string | null;
  onAdd: (track: PublicTrack) => void;
  /** a preview is about to make sound: pause the main player */
  onPreviewStart: () => void;
  /** the main player is playing: the preview gives way */
  mainPlaying: boolean;
};

// The public library: tracks people published, searchable, sorted by how many
// people added them or by newest. Rows preview right here (their own audio element,
// separate from the main queue) and add to your library in one tap.
export default function Discover({ myTracks, myUserId, onAdd, onPreviewStart, mainPlaying }: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"popular" | "new">("popular");
  const [items, setItems] = useState<PublicTrack[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      fetchPublicLibrary(query, sort)
        .then((rows) => {
          if (cancelled) return;
          setItems(rows);
          setError(null);
        })
        .catch(() => {
          if (cancelled) return;
          setItems([]);
          setError("Discover isn't available right now.");
        });
    }, query ? 300 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, sort]);

  useEffect(() => {
    const a = new Audio();
    a.onplay = () => setPreviewPlaying(true);
    a.onpause = () => setPreviewPlaying(false);
    a.onended = () => setPreviewPlaying(false);
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    if (mainPlaying) audioRef.current?.pause();
  }, [mainPlaying]);

  const togglePreview = (t: PublicTrack) => {
    const a = audioRef.current;
    if (!a) return;
    if (previewId === t.id && !a.paused) {
      a.pause();
      return;
    }
    if (previewId !== t.id) {
      a.src = audioUrl(t.filename);
      setPreviewId(t.id);
    }
    onPreviewStart();
    a.play().catch(() => {});
  };

  // added = I already have a copy of it (or it is mine)
  const owned = new Set<string>();
  for (const t of myTracks) {
    if (t.savedFrom) owned.add(t.savedFrom);
    owned.add(t.id);
  }

  const tab = (value: "popular" | "new", label: string) => (
    <button
      onClick={() => setSort(value)}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        sort === value ? "bg-elevated text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-2xl font-bold tracking-tight">Discover</h1>
      <p className="mt-1 mb-5 text-sm text-muted">Tracks people shared. Add one to your library in a tap.</p>

      <div className="mb-3 flex h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 focus-within:border-accent">
        <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shared tracks"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
        />
      </div>
      <div className="mb-4 flex gap-1">
        {tab("popular", "Popular")}
        {tab("new", "New")}
      </div>

      {items === null ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
          <Spinner className="h-4 w-4" /> Loading
        </div>
      ) : error ? (
        <p className="py-16 text-center text-sm text-muted">{error}</p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <MusicIcon className="h-8 w-8 text-muted/60" />
          <p className="max-w-sm text-sm text-muted">
            {query ? `Nothing shared matches “${query}”.` : "Nothing shared yet. Publish a track from its menu to be the first."}
          </p>
        </div>
      ) : (
        <ul className="-mx-3">
          {items.map((t) => {
            const isPreview = previewId === t.id;
            const added = owned.has(t.id);
            const mine = t.user_id === myUserId;
            const cover = { id: t.id, title: t.title, filename: t.filename, duration: t.duration, thumbnail: t.thumbnail, addedAt: 0 };
            return (
              <li key={t.id} className="group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-elevated/60">
                <button
                  onClick={() => togglePreview(t)}
                  className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md"
                  aria-label={isPreview && previewPlaying ? "Pause preview" : "Play preview"}
                >
                  <TrackCover track={cover} className="h-full w-full" />
                  <span
                    className={`absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity ${
                      isPreview ? "" : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isPreview && previewPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-medium ${isPreview ? "text-accent" : "text-ink"}`}>{t.title}</p>
                  <p className="truncate text-xs text-muted">
                    {mine ? "You" : t.display_name || (t.username ? `@${t.username}` : "Someone")}
                    {" · "}
                    <span className="tabular-nums">
                      {t.adds} {t.adds === 1 ? "add" : "adds"}
                    </span>
                    {t.duration ? <span className="tabular-nums"> · {formatTime(t.duration)}</span> : null}
                  </p>
                </div>
                <button
                  onClick={() => !added && onAdd(t)}
                  disabled={added}
                  className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors ${
                    added ? "text-muted" : "bg-brand text-on-brand hover:bg-brand-hover"
                  }`}
                >
                  {added ? <CheckIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                  <span className="hidden sm:inline">{added ? (mine ? "Yours" : "Added") : "Add"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
