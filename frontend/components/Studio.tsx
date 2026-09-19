"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import Slider from "./Slider";
import { CheckIcon, ChevronUpIcon, PauseIcon, PlayIcon, SearchIcon, SlidersIcon, Spinner } from "./Icons";

type Props = {
  tracks: Track[];
  trackId: string | null;
  onSelect: (trackId: string | null) => void;
  /** a finished edit, to be added to the library as a new track */
  onSaved: (track: Track) => void;
  /** a finished edit that replaces the track it was made from */
  onReplaced: (trackId: string, file: { filename: string; duration: number }) => void;
  /** preview is about to make sound: pause the main player */
  onPreviewStart: () => void;
  onPlayTrack: (trackId: string) => void;
  /** the main player is playing: the preview gives way */
  mainPlaying: boolean;
  /** hands the page a way to start/stop the preview (the space bar) */
  onRegisterToggle: (toggle: (() => void) | null) => void;
};

export default function Studio({ tracks, trackId, onSelect, onSaved, onReplaced, onPreviewStart, onPlayTrack, mainPlaying, onRegisterToggle }: Props) {
  const track = trackId ? (tracks.find((t) => t.id === trackId) ?? null) : null;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-5 flex items-center gap-2">
        {track && (
          <button
            onClick={() => onSelect(null)}
            className="-ml-2 rounded-full p-2 text-muted transition-colors hover:bg-elevated hover:text-ink"
            aria-label="Back to track list"
            title="Back"
          >
            <ChevronUpIcon className="h-5 w-5 -rotate-90" />
          </button>
        )}
        <h1 className="text-2xl font-bold tracking-tight">Studio</h1>
      </div>
      {track ? (
        <Editor
          key={track.id}
          track={track}
          onSaved={onSaved}
          onReplaced={onReplaced}
          onPreviewStart={onPreviewStart}
          onPlayTrack={onPlayTrack}
          mainPlaying={mainPlaying}
          onRegisterToggle={onRegisterToggle}
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
  onReplaced,
  onPreviewStart,
  onPlayTrack,
  mainPlaying,
  onRegisterToggle,
}: {
  track: Track;
  onSaved: (track: Track) => void;
  onReplaced: (trackId: string, file: { filename: string; duration: number }) => void;
  onPreviewStart: () => void;
  onPlayTrack: (trackId: string) => void;
  mainPlaying: boolean;
  onRegisterToggle: (toggle: (() => void) | null) => void;
}) {
  const [buffer, setBuffer] = useState<AudioBuffer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [s, setS] = useState<StudioSettings | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [saving, setSaving] = useState<"new" | "replace" | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Track | null>(null);
  const [replaced, setReplaced] = useState(false);
  const previewRef = useRef<StudioPreview | null>(null);

  useEffect(() => {
    let cancelled = false;
    setBuffer(null);
    setS(null);
    setPlaying(false);
    setPlayhead(0);
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

  // the toggle the page's space-bar handler calls (kept fresh via a ref inside)
  const toggleRef = useRef<() => void>(() => {});
  useEffect(() => {
    onRegisterToggle(() => toggleRef.current());
    return () => onRegisterToggle(null);
  }, [onRegisterToggle]);

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
    setReplaced(false);
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

  toggleRef.current = () => togglePreview();

  const seek = (pos: number) => {
    setPlayhead(pos);
    if (previewRef.current?.playing) startPreview(s, pos);
  };

  const save = async (mode: "new" | "replace") => {
    previewRef.current?.stop();
    setPlaying(false);
    setSaving(mode);
    setSaveError(null);
    try {
      const out = await renderEdit(track.filename, s);
      if (mode === "replace") {
        onReplaced(track.id, out);
        setReplaced(true);
        setSaved(null);
      } else {
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
        setReplaced(false);
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Rendering failed");
    } finally {
      setSaving(null);
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
          fadeIn={s.fadeIn}
          fadeOut={s.fadeOut}
          speed={s.speed}
          playhead={playhead}
          onTrim={(start, end) => update({ start, end }, true)}
          onFade={(fadeIn, fadeOut) => update({ fadeIn, fadeOut }, true)}
          onSeek={seek}
        />
        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted tabular-nums">
          <span>Start {formatTime(s.start)}</span>
          <span className="truncate">
            {s.fadeIn || s.fadeOut
              ? `Fade in ${s.fadeIn.toFixed(1)}s · out ${s.fadeOut.toFixed(1)}s`
              : "Drag the top corners to fade"}
          </span>
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
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
        <button
          onClick={() => save("new")}
          disabled={!!saving}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand px-6 text-sm font-semibold text-on-brand transition-colors enabled:hover:bg-brand-hover disabled:opacity-60"
        >
          {saving === "new" ? <Spinner className="h-4 w-4" /> : <SlidersIcon className="h-4 w-4" />}
          {saving === "new" ? "Rendering" : "Save as new track"}
        </button>
        <button
          onClick={() => save("replace")}
          disabled={!!saving}
          className="flex h-11 items-center justify-center gap-2 rounded-full border border-line px-6 text-sm font-medium text-ink transition-colors enabled:hover:bg-elevated disabled:opacity-60"
        >
          {saving === "replace" && <Spinner className="h-4 w-4" />}
          {saving === "replace" ? "Rendering" : "Save over this track"}
        </button>
        {saved && (
          <div className="flex items-center gap-3 text-sm text-muted">
            <CheckIcon className="h-4 w-4 text-accent" />
            <span>Saved as a new track.</span>
            <button onClick={() => onPlayTrack(saved.id)} className="font-medium text-ink hover:underline">
              Play it
            </button>
          </div>
        )}
        {replaced && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <CheckIcon className="h-4 w-4 text-accent" />
            <span>This track now plays the edit.</span>
          </div>
        )}
        {saveError && <p className="text-sm text-red-500">{saveError}</p>}
      </div>
    </div>
  );
}

// Waveform with trim handles at the edges and fade handles in the top corners, the
// way a clip's audio fades work in Premiere: drag a corner inwards to make the ramp
// longer. Anywhere else, press and drag scrubs the playhead.
function Waveform({
  peaks,
  duration,
  start,
  end,
  fadeIn,
  fadeOut,
  speed,
  playhead,
  onTrim,
  onFade,
  onSeek,
}: {
  peaks: number[];
  duration: number;
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
  speed: number;
  playhead: number;
  onTrim: (start: number, end: number) => void;
  onFade: (fadeIn: number, fadeOut: number) => void;
  onSeek: (pos: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // a ref, not state: the first pointermove can land in the same tick as the
  // pointerdown that started the drag, before a state update would be visible
  const dragRef = useRef<"start" | "end" | "fadeIn" | "fadeOut" | "scrub" | null>(null);
  const pct = (t: number) => `${(t / duration) * 100}%`;

  // fades are seconds of the *result*; on this ruler of original seconds they are
  // that much longer or shorter depending on the speed
  const region = end - start;
  const maxFade = region / 2;
  const fadeInAt = Math.min(start + fadeIn * speed, start + maxFade);
  const fadeOutAt = Math.max(end - fadeOut * speed, end - maxFade);

  const timeAt = (clientX: number) => {
    const r = boxRef.current!.getBoundingClientRect();
    return Math.min(duration, Math.max(0, ((clientX - r.left) / r.width) * duration));
  };
  const x = (t: number) => (boxRef.current ? (t / duration) * boxRef.current.getBoundingClientRect().width : 0);

  const onDown = (e: React.PointerEvent) => {
    const r = boxRef.current!.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const grab = 18;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // fade corners live in the top strip, so they never fight the trim handles
    if (py <= 28) {
      const dIn = Math.abs(px - x(fadeInAt));
      const dOut = Math.abs(px - x(fadeOutAt));
      if (Math.min(dIn, dOut) <= grab) {
        dragRef.current = dIn <= dOut ? "fadeIn" : "fadeOut";
        return;
      }
    }
    const dStart = Math.abs(px - x(start));
    const dEnd = Math.abs(px - x(end));
    if (Math.min(dStart, dEnd) <= grab) {
      dragRef.current = dStart <= dEnd ? "start" : "end";
      return;
    }
    dragRef.current = "scrub";
    onSeek(Math.min(Math.max(timeAt(e.clientX), start), end));
  };

  const onMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const t = timeAt(e.clientX);
    if (drag === "start") onTrim(Math.min(t, end - 0.5), end);
    else if (drag === "end") onTrim(start, Math.max(t, start + 0.5));
    else if (drag === "scrub") onSeek(Math.min(Math.max(t, start), end));
    else if (drag === "fadeIn") onFade(Math.min(Math.max(t - start, 0) / speed, maxFade / speed), fadeOut);
    else onFade(fadeIn, Math.min(Math.max(end - t, 0) / speed, maxFade / speed));
  };

  const stop = () => {
    dragRef.current = null;
  };

  // the ramps are drawn in percentages, so they follow the box at any width
  const u = (t: number) => (t / duration) * 100;

  return (
    <div
      ref={boxRef}
      className="relative h-28 touch-none select-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={stop}
      onPointerCancel={stop}
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

      {/* the fade envelope: what it takes away is dimmed, the ramp itself is a line */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        {fadeIn > 0 && (
          <polygon points={`${u(start)},100 ${u(fadeInAt)},0 ${u(start)},0`} className="fill-app/75" />
        )}
        {fadeOut > 0 && (
          <polygon points={`${u(fadeOutAt)},0 ${u(end)},100 ${u(end)},0`} className="fill-app/75" />
        )}
        <polyline
          points={`${u(start)},100 ${u(fadeInAt)},0 ${u(fadeOutAt)},0 ${u(end)},100`}
          className="fill-none stroke-accent"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* trim handles */}
      {[start, end].map((t, i) => (
        <div key={i} className="absolute inset-y-0 -ml-[3px] w-1.5 cursor-ew-resize rounded-full bg-accent" style={{ left: pct(t) }}>
          <div className="absolute top-1/2 left-1/2 h-8 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        </div>
      ))}

      {/* fade handles */}
      {[fadeInAt, fadeOutAt].map((t, i) => (
        <div
          key={i}
          className="absolute -top-1 -ml-2 h-4 w-4 cursor-ew-resize rounded-full border-2 border-accent bg-app"
          style={{ left: pct(t) }}
          title={i === 0 ? "Fade in" : "Fade out"}
        />
      ))}

      {/* playhead */}
      {playhead >= start && playhead <= end && (
        <div className="pointer-events-none absolute inset-y-0 w-px bg-ink" style={{ left: pct(playhead) }} />
      )}
    </div>
  );
}
