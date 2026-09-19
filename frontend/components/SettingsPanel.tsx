"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { MoonIcon, SunIcon } from "./Icons";
import AuthButton from "./AuthButton";
import ProfileEditor from "./ProfileEditor";
import { useAuth } from "@/contexts/AuthContext";
import Slider from "./Slider";
import { PlaybackOptions } from "@/lib/api";

type Props = {
  playbackOpts: PlaybackOptions;
  onPlaybackOpts: (opts: PlaybackOptions) => void;
};

export default function SettingsPanel({ playbackOpts, onPlaybackOpts }: Props) {
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
            <p className="mt-0.5 text-xs text-muted">Applies from the next track that starts.</p>
          </div>
          <Slider
            label="Fade out"
            value={playbackOpts.fade}
            min={0}
            max={10}
            step={0.5}
            display={playbackOpts.fade ? `${playbackOpts.fade} s` : "Off"}
            onChange={(v) => onPlaybackOpts({ ...playbackOpts, fade: v })}
          />
          <Slider
            label="Gap"
            value={playbackOpts.gap}
            min={0}
            max={10}
            step={0.5}
            display={playbackOpts.gap ? `${playbackOpts.gap} s of silence` : "Off"}
            onChange={(v) => onPlaybackOpts({ ...playbackOpts, gap: v })}
          />
        </section>


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
