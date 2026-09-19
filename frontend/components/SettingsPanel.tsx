"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { MoonIcon, SunIcon } from "./Icons";
import AuthButton from "./AuthButton";
import ProfileEditor from "./ProfileEditor";
import { useAuth } from "@/contexts/AuthContext";
import FadeControl from "./FadeControl";
import Slider from "./Slider";
import { PlaybackOptions } from "@/lib/api";
import { OfflineState } from "@/lib/offline";

type Props = {
  playbackOpts: PlaybackOptions;
  onPlaybackOpts: (opts: PlaybackOptions) => void;
  offline: OfflineState;
};

// Settings reads as one page of rows, like the library does: a heading, a line of
// explanation, the control. No cards — those were the only panels left in the app.
function Row({
  title,
  hint,
  align = "stretch",
  children,
}: {
  title: string;
  hint?: string;
  /** small controls sit at the right edge; wide ones fill the row */
  align?: "stretch" | "end";
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-line py-6 sm:flex-row sm:items-center sm:gap-8">
      <div className="sm:w-52 sm:shrink-0">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
        {hint && <p className="mt-1 text-xs leading-relaxed text-balance text-muted">{hint}</p>}
      </div>
      <div className={`min-w-0 flex-1 ${align === "end" ? "flex justify-start sm:justify-end" : ""}`}>{children}</div>
    </section>
  );
}

export default function SettingsPanel({ playbackOpts, onPlaybackOpts, offline }: Props) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Settings</h1>

      <div className="border-b border-line">
        <section className="pb-6">{user ? <ProfileEditor /> : <AuthButton />}</section>

        <Row title="Theme" align="end">
          {/* the knob slides between the two, rather than blinking from one to the other */}
          <div className="relative flex w-fit rounded-full bg-elevated p-1">
            <span
              className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-app transition-transform duration-300 ease-out"
              style={{ transform: `translateX(${theme === "dark" ? "100%" : "0%"})` }}
            />
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`relative z-10 flex w-24 items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-medium transition-colors ${
                  theme === t ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {t === "light" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </Row>

        <Row title="Fade" hint="One track eases out as the next eases in. Drag out from the middle.">
          <FadeControl value={playbackOpts.fade} onChange={(fade) => onPlaybackOpts({ ...playbackOpts, fade })} />
          <p className="mt-2 text-xs text-muted tabular-nums">
            {playbackOpts.fade ? `${playbackOpts.fade.toFixed(1)} s at each end` : "Off"}
          </p>
        </Row>

        <Row title="Gap" hint="Silence after a track, before the next one starts.">
          <Slider
            label="Length"
            value={playbackOpts.gap}
            min={0}
            max={10}
            step={0.5}
            display={playbackOpts.gap ? `${playbackOpts.gap.toFixed(1)} s` : "Off"}
            onChange={(gap) => onPlaybackOpts({ ...playbackOpts, gap })}
          />
        </Row>

        {offline.supported && (
          <Row title="Offline" hint="Keep the library on this device and play it with no signal.">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-ink">Save tracks here</p>
              <button
                role="switch"
                aria-checked={offline.enabled}
                onClick={() => offline.setEnabled(!offline.enabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  offline.enabled ? "bg-accent" : "bg-elevated"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    offline.enabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
            {offline.enabled && (
              <p className="mt-2 text-xs text-muted tabular-nums">
                {offline.progress
                  ? `Saving ${offline.progress.done} of ${offline.progress.total} tracks`
                  : `${offline.saved.size} ${offline.saved.size === 1 ? "track" : "tracks"} saved${
                      offline.usageBytes ? ` · ${Math.round(offline.usageBytes / 1048576)} MB` : ""
                    }`}
              </p>
            )}
          </Row>
        )}

        <Row title="Support" hint="Something broken or missing? Say so in Discord." align="end">
          <a
            href="https://discord.gg/VPQ3xncf5Q"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center rounded-full border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-elevated"
          >
            Open Discord
          </a>
        </Row>
      </div>
    </div>
  );
}
