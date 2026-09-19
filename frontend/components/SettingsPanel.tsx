"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { MoonIcon, SunIcon } from "./Icons";
import AuthButton from "./AuthButton";
import ProfileEditor from "./ProfileEditor";
import { useAuth } from "@/contexts/AuthContext";
import BetweenTracks from "./BetweenTracks";
import { PlaybackOptions } from "@/lib/api";
import { OfflineState } from "@/lib/offline";

type Props = {
  playbackOpts: PlaybackOptions;
  onPlaybackOpts: (opts: PlaybackOptions) => void;
  offline: OfflineState;
};

export default function SettingsPanel({ playbackOpts, onPlaybackOpts, offline }: Props) {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();

  return (
    <div className="max-w-xl">
      <h1 className="mb-5 text-2xl font-bold tracking-tight">Settings</h1>

      <div className="flex flex-col gap-3">
        <section className="rounded-lg border border-line bg-panel px-4 py-4">
          {user ? <ProfileEditor /> : <AuthButton />}
        </section>

        <section className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3">
          <span className="text-sm font-medium text-ink">Theme</span>
          <div className="flex gap-1 rounded-md bg-app p-1">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  theme === t ? "bg-panel text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {t === "light" ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-5 rounded-lg border border-line bg-panel px-4 py-4">
          <div>
            <p className="text-sm font-medium text-ink">Between tracks</p>
            <p className="mt-0.5 text-xs text-muted">Drag the ramp to fade, drag the middle to leave silence. Applies from the next track that starts.</p>
          </div>
          <BetweenTracks
            fade={playbackOpts.fade}
            gap={playbackOpts.gap}
            onChange={(next) => onPlaybackOpts(next)}
          />
        </section>


        {offline.supported && (
          <section className="flex flex-col gap-3 rounded-lg border border-line bg-panel px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-ink">Keep library on this device</p>
                <p className="mt-0.5 text-xs text-muted">
                  Tracks play without internet. New ones save automatically. Fade and gap need a connection.
                </p>
              </div>
              <button
                role="switch"
                aria-checked={offline.enabled}
                onClick={() => offline.setEnabled(!offline.enabled)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${offline.enabled ? "bg-accent" : "bg-elevated"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    offline.enabled ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
            {offline.enabled && (
              <p className="text-xs text-muted tabular-nums">
                {offline.progress
                  ? `Saving ${offline.progress.done} of ${offline.progress.total} tracks`
                  : `${offline.saved.size} ${offline.saved.size === 1 ? "track" : "tracks"} saved${
                      offline.usageBytes ? ` · ${Math.round(offline.usageBytes / 1048576)} MB` : ""
                    }`}
              </p>
            )}
          </section>
        )}

        <a
          href="https://discord.gg/VPQ3xncf5Q"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg border border-line bg-panel px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-elevated"
        >
          Support
          <span className="text-xs text-muted">Discord</span>
        </a>
      </div>
    </div>
  );
}
