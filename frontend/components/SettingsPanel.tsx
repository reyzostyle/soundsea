"use client";

import { useTheme, Theme } from "@/contexts/ThemeContext";
import { MoonIcon, SunIcon } from "./Icons";
import AuthButton from "./AuthButton";

function ThemeOption({
  value,
  label,
  active,
  onSelect,
  children,
}: {
  value: Theme;
  label: string;
  active: boolean;
  onSelect: (t: Theme) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onSelect(value)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "border-accent bg-accent-soft text-ink"
          : "border-line text-muted hover:border-line hover:text-ink"
      }`}
    >
      {children}
      {label}
    </button>
  );
}

export default function SettingsPanel() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-xl font-semibold tracking-tight">Settings</h1>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">Appearance</h2>
        <p className="mb-3 text-sm text-muted">Choose how SoundSea looks.</p>
        <div className="flex gap-2">
          <ThemeOption value="light" label="Light" active={theme === "light"} onSelect={setTheme}>
            <SunIcon className="h-4 w-4" />
          </ThemeOption>
          <ThemeOption value="dark" label="Dark" active={theme === "dark"} onSelect={setTheme}>
            <MoonIcon className="h-4 w-4" />
          </ThemeOption>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-1 text-sm font-semibold text-ink">Account</h2>
        <p className="mb-3 text-sm text-muted">Sign in to sync your library and share playlists.</p>
        <div className="rounded-lg border border-line bg-panel p-4">
          <AuthButton />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold text-ink">Support</h2>
        <p className="mb-3 text-sm text-muted">Questions, bugs or ideas? Join our Discord server.</p>
        <a
          href="https://discord.gg/VPQ3xncf5Q"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-elevated"
        >
          Join the Discord
        </a>
      </section>
    </div>
  );
}
