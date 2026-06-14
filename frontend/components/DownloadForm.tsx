"use client";

import { useState } from "react";
import { DownloadIcon, Spinner } from "./Icons";

type Props = {
  downloading: boolean;
  error: string | null;
  onDownload: (url: string) => Promise<boolean>;
};

export default function DownloadForm({ downloading, error, onDownload }: Props) {
  const [url, setUrl] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || downloading) return;
    const ok = await onDownload(trimmed);
    if (ok) setUrl("");
  };

  return (
    <form onSubmit={submit}>
      <div className="flex items-center gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube or TikTok link"
          disabled={downloading}
          className="min-w-0 flex-1 rounded-md border border-line bg-panel px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={downloading || !url.trim()}
          aria-label="Download"
          className="flex shrink-0 items-center justify-center gap-2 rounded-md bg-brand px-3.5 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-brand-hover disabled:opacity-50"
        >
          {downloading ? <Spinner className="h-5 w-5" /> : <DownloadIcon className="h-5 w-5" />}
          <span className="hidden sm:inline">{downloading ? "Downloading" : "Download"}</span>
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </form>
  );
}
