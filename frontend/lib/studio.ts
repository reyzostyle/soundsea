import { API_BASE } from "./api";

// Studio edit settings. Times are in seconds of the ORIGINAL file; fades are in
// seconds of the result. The server (/api/render) and the preview below read the
// same numbers the same way, so what you hear is what gets saved.
export type StudioSettings = {
  start: number;
  end: number;
  speed: number; // 0.5–1.5, resampled: pitch moves with tempo, like "sped up" edits
  bass: number; // dB of low-shelf boost, 0–15
  reverb: number; // 0–1
  fadeIn: number;
  fadeOut: number;
};

export type PresetId = "original" | "spedup" | "slowed" | "bass";

export const PRESETS: { id: PresetId; label: string; values: Pick<StudioSettings, "speed" | "bass" | "reverb"> }[] = [
  { id: "original", label: "Original", values: { speed: 1, bass: 0, reverb: 0 } },
  { id: "spedup", label: "Sped up", values: { speed: 1.25, bass: 0, reverb: 0 } },
  { id: "slowed", label: "Slowed + reverb", values: { speed: 0.8, bass: 0, reverb: 0.5 } },
  { id: "bass", label: "Bass boosted", values: { speed: 1, bass: 10, reverb: 0 } },
];

export function activePreset(s: StudioSettings): PresetId | null {
  const hit = PRESETS.find(
    (p) => Math.abs(p.values.speed - s.speed) < 0.001 && p.values.bass === s.bass && Math.abs(p.values.reverb - s.reverb) < 0.001
  );
  return hit ? hit.id : null;
}

// "Song (sped up + bass boosted)" — what the saved copy is called
export function editSuffix(s: StudioSettings): string {
  const parts: string[] = [];
  if (s.speed > 1.005) parts.push("sped up");
  if (s.speed < 0.995) parts.push("slowed");
  if (s.reverb > 0) parts.push("reverb");
  if (s.bass > 0) parts.push("bass boosted");
  return parts.length ? parts.join(" + ") : "edit";
}

export async function renderEdit(filename: string, s: StudioSettings): Promise<{ filename: string; duration: number }> {
  const res = await fetch(`${API_BASE}/api/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, ...s }),
  });
  const data = (await res.json().catch(() => null)) as { filename?: string; duration?: number; error?: string } | null;
  if (!res.ok || !data?.filename) throw new Error(data?.error || `Render failed (${res.status})`);
  return { filename: data.filename, duration: data.duration ?? s.end - s.start };
}

/** Peak per bar, 0–1, for drawing the waveform. */
export function computePeaks(buffer: AudioBuffer, bars: number): number[] {
  const data = buffer.getChannelData(0);
  const step = Math.max(1, Math.floor(data.length / bars));
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < bars; i++) {
    let peak = 0;
    const from = i * step;
    const to = Math.min(data.length, from + step);
    for (let j = from; j < to; j += 16) peak = Math.max(peak, Math.abs(data[j]));
    peaks.push(peak);
    max = Math.max(max, peak);
  }
  return max > 0 ? peaks.map((p) => p / max) : peaks;
}

// Same shape as the server's impulse response: 2.5s of exponentially decaying noise.
function impulse(ctx: BaseAudioContext): AudioBuffer {
  const len = Math.round(ctx.sampleRate * 2.5);
  const ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const ch = ir.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
  }
  return ir;
}

let sharedCtx: AudioContext | null = null;
function audioContext(): AudioContext {
  if (!sharedCtx) sharedCtx = new AudioContext();
  return sharedCtx;
}

export async function decodeTrack(url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status === 404 ? "The audio file for this track is gone from the server." : "Could not load the audio.");
  return audioContext().decodeAudioData(await res.arrayBuffer());
}

/**
 * Live preview of an edit. This plays a decoded buffer through its own Web Audio
 * graph and never touches the main <audio> player, so background playback on iOS
 * is unaffected: the studio is a foreground screen anyway.
 */
export class StudioPreview {
  private ctx = audioContext();
  private source: AudioBufferSourceNode | null = null;
  private shelf = this.ctx.createBiquadFilter();
  private dry = this.ctx.createGain();
  private wet = this.ctx.createGain();
  private convolver = this.ctx.createConvolver();
  private fade = this.ctx.createGain();
  private limiter = this.ctx.createDynamicsCompressor();
  // playhead bookkeeping, so position stays right while speed changes mid-play
  private anchorCtxTime = 0;
  private anchorPos = 0;
  private rate = 1;
  private endPos = 0;

  constructor(private buffer: AudioBuffer) {
    this.shelf.type = "lowshelf";
    this.shelf.frequency.value = 100;
    this.convolver.buffer = impulse(this.ctx);
    this.limiter.threshold.value = -1;
    this.limiter.ratio.value = 20;
    this.shelf.connect(this.dry).connect(this.fade);
    this.shelf.connect(this.convolver).connect(this.wet).connect(this.fade);
    this.fade.connect(this.limiter).connect(this.ctx.destination);
  }

  get playing() {
    return this.source !== null;
  }

  play(s: StudioSettings, from: number, onEnded: () => void) {
    this.stop();
    void this.ctx.resume();
    const startAt = Math.min(Math.max(from, s.start), s.end - 0.05);
    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.shelf);
    this.source = src;
    this.apply(s);

    const now = this.ctx.currentTime;
    this.anchorCtxTime = now;
    this.anchorPos = startAt;
    this.endPos = s.end;

    // fades are scheduled in real (output) time
    const outLeft = (s.end - startAt) / s.speed;
    const g = this.fade.gain;
    g.cancelScheduledValues(now);
    const intoFadeIn = (startAt - s.start) / s.speed;
    if (s.fadeIn > 0 && intoFadeIn < s.fadeIn) {
      g.setValueAtTime(intoFadeIn / s.fadeIn, now);
      g.linearRampToValueAtTime(1, now + (s.fadeIn - intoFadeIn));
    } else {
      g.setValueAtTime(1, now);
    }
    if (s.fadeOut > 0) {
      const fadeStart = Math.max(0, outLeft - s.fadeOut);
      g.setValueAtTime(fadeStart > 0 ? 1 : outLeft / s.fadeOut, now + fadeStart);
      g.linearRampToValueAtTime(0, now + outLeft);
    }

    src.onended = () => {
      if (this.source === src) {
        this.source = null;
        onEnded();
      }
    };
    src.start(now, startAt, s.end - startAt);
  }

  /** Speed, bass and reverb follow the controls live; trim and fades need a restart. */
  apply(s: StudioSettings) {
    const now = this.ctx.currentTime;
    if (this.source) {
      this.anchorPos = this.position();
      this.anchorCtxTime = now;
      this.source.playbackRate.setValueAtTime(s.speed, now);
    }
    this.rate = s.speed;
    this.shelf.gain.setValueAtTime(s.bass, now);
    this.dry.gain.setValueAtTime(1 - s.reverb * 0.35, now);
    this.wet.gain.setValueAtTime(s.reverb * 0.5, now);
  }

  /** Current position in the original file's seconds. */
  position(): number {
    if (!this.source) return this.anchorPos;
    return Math.min(this.endPos, this.anchorPos + (this.ctx.currentTime - this.anchorCtxTime) * this.rate);
  }

  stop() {
    if (this.source) {
      this.anchorPos = this.position();
      const src = this.source;
      this.source = null;
      try {
        src.stop();
      } catch {}
      src.disconnect();
    }
  }

  dispose() {
    this.stop();
    this.fade.disconnect();
    this.limiter.disconnect();
  }
}
