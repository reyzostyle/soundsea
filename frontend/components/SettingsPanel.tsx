"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { MoonIcon, SunIcon } from "./Icons";
import AuthButton from "./AuthButton";

export default function SettingsPanel() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-xl">
      <h1 className="mb-5 text-xl font-semibold tracking-tight">Settings</h1>

      <div className="flex flex-col gap-3">
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

        <section className="rounded-lg border border-line bg-panel px-4 py-3.5">
          <AuthButton />
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
