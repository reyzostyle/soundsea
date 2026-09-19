"use client";

import { CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { Track } from "@/lib/types";
import { audioUrl } from "@/lib/api";
import { formatTime } from "@/lib/format";
import {
  PRESETS,
  StudioPreview,
  StudioSettings,
  activePreset,
  computePeaks,
  decodeTrack,
  editSuffix,
  renderEdit,
} from "@/lib/studio";
import TrackCover from "./TrackCover";
import { CheckIcon, PauseIcon, PlayIcon, SearchIcon, SlidersIcon, Spinner } from "./Icons";

type Props = {
  tracks: Track[];
  trackId: string | null;
  onSelect: (trackId: string | null) => void;
  /** a finished edit, to be added to the library */
  onSaved: (track: Track) => void;
  /** preview is about to make sound: pause the main player */
  onPreviewStart: () => void;
  onPlayTrack: (trackId: string) => void;
  /** the main player is playing: the preview gives way */
  mainPlaying: boolean;
};

export default function Studio({ tracks, trackId, onSelect, onSaved, onPreviewStart, onPlayTrack, mainPlaying }: Props) {
  const track = trackId ? (tracks.find((t) => t.id === trackId) ?? null) : null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5 flex items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Studio</h1>
        {track && (
          <button onClick={() => onSelect(null)} className="text-sm text-muted hover:text-ink">
            Change track
          </button>
        )}
      </div>
      {track ? (
        <Editor
          key={track.id}
          track={track}
          onSaved={onSaved}
          onPreviewStart={onPreviewStart}
          onPlayTrack={onPlayTrack}
          mainPlaying={mainPlaying}
        />
      ) : (
        <TrackPicker tracks={tracks} onSelect={onSelect} />
      )}
    </div>
  );
}

function TrackPicker({ tracks, onSelect }: { tracks: Track[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tracks.filter((t) => t.title.toLowerCase().includes(q)) : tracks;
  }, [tracks, query]);

  if (!tracks.length) {
    return <p className="py-16 text-center text-sm text-muted">Download a track first, then come back to edit it here.</p>;
  }

  return (
    <>
      <p className="mb-4 text-sm text-muted">Pick a track to trim, speed up, slow down, add bass or a fade. The original stays as it is.</p>
      <div className="mb-3 flex h-11 items-center gap-2 rounded-full border border-line bg-panel px-4 focus-within:border-accent">
        <SearchIcon className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your library"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted/70"
        />
      </div>
      <ul className="-mx-3">
        {shown.map((t) => (
          <li key={t.id}>
            <button
              onClick={() => onSelect(t.id)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-elevated/60"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md">
                <TrackCover track={t} className="h-full w-full" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{t.title}</span>
              <span className="shrink-0 text-xs text-muted tabular-nums">{formatTime(t.duration)}</span>
            </button>
          </li>
        ))}
        {!shown.length && <li className="px-3 py-6 text-sm text-muted">Nothing matches “{query}”.</li>}
      </ul>
    </>
  );
}

function Editor({
  track,
  onSaved,
  onPreviewStart,
  onPlayTrack,
  mainPlaying,
}: {
  track: Track;
  onSaved: (track: Track) => void;
  onPreviewStart: () => void;
  onPlayTrack: (trackId: string) => void;
  mainPlaying: boolean;
}) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [s, setS] = useState<StudioSettings | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Track | null>(null);
  const previewRef = useRef<StudioPreview | null>(null);

  useEffect(() => {
    let cancelled = false;
    decodeTrack(audioUrl(track.filename))
      .then((buf) => {
        if (cancelled) return;
        previewRef.current = new StudioPreview(buf);
        setBuffer(buf);
        setS({ start: 0, end: buf.duration, speed: 1, bass: 0, reverb: 0, fadeIn: 0, fadeOut: 0 });
      })
      .catch((e) => !cancelled && setLoadError(e instanceof Error ? e.message : "Could not load the audio."));
    return () => {
      cancelled = true;
      previewRef.current?.dispose();
      previewRef.current = null;
    };
  }, [track.filename]);

  // move the playhead while previewing
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      if (previewRef.current) setPlayhead(previewRef.current.position());
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing]);

  useEffect(() => {
    const p = previewRef.current;
    if (mainPlaying && p?.playing) {
      p.stop();
      setPlaying(false);
      setPlayhead(p.position());
    }
  }, [mainPlaying]);

  const peaks = useMemo(() => (buffer ? computePeaks(buffer, 240) : []), [buffer]);

  if (loadError) return <p className="py-16 text-center text-sm text-red-500">{loadError}</p>;
  if (!buffer || !s) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted">
        <Spinner className="h-4 w-4" /> Loading audio
      </div>
    );
  }

  const outLen = (s.end - s.start) / s.speed;

  const startPreview = (settings: StudioSettings, from: number) => {
    const p = previewRef.current;
    if (!p) return;
    onPreviewStart();
    p.play(settings, from, () => {
      setPlaying(false);
      setPlayhead(settings.start);
    });
    setPlaying(true);
  };

  // live changes (speed, bass, reverb) apply in place; trim and fades restart the preview
  const update = (patch: Partial<StudioSettings>, restart = false) => {
    const next = { ...s, ...patch };
    setS(next);
    setSaved(null);
    const p = previewRef.current;
    if (!p) return;
    if (restart) {
      if (p.playing) startPreview(next, Math.min(Math.max(p.position(), next.start), next.end - 0.1));
      else setPlayhead((h) => Math.min(Math.max(h, next.start), next.end));
    } else {
      p.apply(next);
    }
  };

  const togglePreview = () => {
    const p = previewRef.current;
    if (!p) return;
    if (p.playing) {
      p.stop();
      setPlaying(false);
      setPlayhead(p.position());
    } else {
      startPreview(s, playhead >= s.end - 0.1 ? s.start : playhead);
    }
  };

  const seek = (pos: number) => {
    setPlayhead(pos);
    if (previewRef.current?.playing) startPreview(s, pos);
  };

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const out = await renderEdit(track.filename, s);
      const edit: Track = {
        id: crypto.randomUUID(),
        title: `${track.title} (${editSuffix(s)})`,
        filename: out.filename,
        duration: out.duration,
        thumbnail: track.thumbnail,
        addedAt: Date.now(),
        sourceUrl: track.sourceUrl ?? null,
      };
      onSaved(edit);
      setSaved(edit);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Rendering failed");
    } finally {
      setSaving(false);
    }
  };

  const preset = activePreset(s);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md">
          <TrackCover track={track} className="h-full w-full" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{track.title}</p>
          <p className="text-xs text-muted tabular-nums">
            {formatTime(buffer.duration)} original · {formatTime(outLen)} after edit
          </p>
        </div>
      </div>

      {/* presets: the one-tap versions people actually post */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => update(p.values)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              preset === p.id ? "border-ink bg-ink text-app" : "border-line text-ink hover:bg-elevated"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div>
        <Waveform
          peaks={peaks}
          duration={buffer.duration}
          start={s.start}
          end={s.end}
          playhead={playhead}
          onTrim={(start, end) => update({ start, end }, true)}
          onSeek={seek}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted tabular-nums">
          <span>Start {formatTime(s.start)}</span>
          <span>End {formatTime(s.end)}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={togglePreview}
          className="flex h-11 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand transition-colors hover:bg-brand-hover"
        >
          {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
          {playing ? "Stop" : "Preview"}
        </button>
        <button
          onClick={() => update({ start: 0, end: buffer.duration, speed: 1, bass: 0, reverb: 0, fadeIn: 0, fadeOut: 0 }, true)}
          className="h-11 rounded-full border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-elevated"
        >
          Reset
        </button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Slider label="Speed" value={s.speed} min={0.5} max={1.5} step={0.01} display={`${s.speed.toFixed(2)}×`} onChange={(v) => update({ speed: v })} />
        <Slider label="Bass" value={s.bass} min={0} max={15} step={0.5} display={s.bass ? `+${s.bass} dB` : "Off"} onChange={(v) => update({ bass: v })} />
        <Slider label="Reverb" value={s.reverb} min={0} max={1} step={0.01} display={s.reverb ? `${Math.round(s.reverb * 100)}%` : "Off"} onChange={(v) => update({ reverb: v })} />
        <Slider
          label="Fade in"
          value={s.fadeIn}
          min={0}
          max={Math.min(5, outLen / 2)}
          step={0.1}
          display={s.fadeIn ? `${s.fadeIn.toFixed(1)} s` : "Off"}
          onChange={(v) => update({ fadeIn: v }, true)}
        />
        <Slider
          label="Fade out"
          value={s.fadeOut}
          min={0}
          max={Math.min(10, outLen / 2)}
          step={0.1}
          display={s.fadeOut ? `${s.fadeOut.toFixed(1)} s` : "Off"}
          onChange={(v) => update({ fadeOut: v }, true)}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <button
          onClick={save}
          disabled={saving}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition-colors enabled:hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? <Spinner className="h-4 w-4" /> : <SlidersIcon className="h-4 w-4" />}
          {saving ? "Rendering" : "Save as new track"}
        </button>
        {saved && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <CheckIcon className="h-4 w-4 text-accent" />
            <span>Saved to your library.</span>
            <button onClick={() => onPlayTrack(saved.id)} className="font-medium text-ink hover:underline">
              Play it
            </button>
          </div>
        )}
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
      </div>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
}) {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-muted tabular-nums">{display}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Math.min(value, max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="h-4 w-full"
        style={{ "--fill": `${pct}%` } as CSSProperties}
      />
    </label>
  );
}

// Waveform with two trim handles. Drag a handle to trim; tap anywhere else to move
// the playhead there.
function Waveform({
  peaks,
  duration,
  start,
  end,
  playhead,
  onTrim,
  onSeek,
}: {
  peaks: number[];
  duration: number;
  start: number;
  end: number;
  playhead: number;
  onTrim: (start: number, end: number) => void;
  onSeek: (pos: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  const pct = (t: number) => `${(t / duration) * 100}%`;

  const timeAt = (clientX: number) => {
    const r = boxRef.current!.getBoundingClientRect();
    return Math.min(duration, Math.max(0, ((clientX - r.left) / r.width) * duration));
  };

  const onDown = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    const x = e.clientX - r.left;
    const sx = (start / duration) * r.width;
    const ex = (end / duration) * r.width;
    const grab = 18;
    if (Math.abs(x - sx) <= grab || Math.abs(x - ex) <= grab) {
      setDragging(Math.abs(x - sx) <= Math.abs(x - ex) ? "start" : "end");
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      const t = timeAt(e.clientX);
      if (t > start && t < end) onSeek(t);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const t = timeAt(e.clientX);
    if (dragging === "start") onTrim(Math.min(t, end - 0.5), end);
    else onTrim(start, Math.max(t, start + 0.5));
  };

  return (
    <div
      ref={boxRef}
      className="relative h-24 cursor-pointer touch-none select-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => setDragging(null)}
      onPointerCancel={() => setDragging(null)}
    >
      <div className="absolute inset-0 flex items-center gap-px">
        {peaks.map((p, i) => {
          const t = ((i + 0.5) / peaks.length) * duration;
          const inside = t >= start && t <= end;
          return (
            <div
              key={i}
              className={`flex-1 rounded-full ${inside ? "bg-ink/80" : "bg-ink/15"}`}
              style={{ height: `${Math.max(4, p * 100)}%` }}
            />
          );
        })}
      </div>
      {/* trim handles */}
      {[start, end].map((t, i) => (
        <div key={i} className="absolute inset-y-0 -ml-[3px] w-1.5 rounded-full bg-accent" style={{ left: pct(t) }}>
          <div className="absolute top-1/2 left-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        </div>
      ))}
      {/* playhead */}
      {playhead > start && playhead < end && (
        <div className="pointer-events-none absolute inset-y-0 w-px bg-ink" style={{ left: pct(playhead) }} />
      )}
    </div>
  );
}
