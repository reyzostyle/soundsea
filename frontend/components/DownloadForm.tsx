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
    <form onSubmit={submit} className="mb-8">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube or TikTok link"
          disabled={downloading}
          className="min-w-0 flex-1 rounded-md border border-line bg-panel px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={downloading || !url.trim()}
          className="flex items-center justify-center gap-2 rounded-md bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors enabled:hover:bg-brand-hover disabled:opacity-50"
        >
          {downloading ? (
            <>
              <Spinner className="h-4 w-4" /> Downloading
            </>
          ) : (
            <>
              <DownloadIcon className="h-4 w-4" /> Download
            </>
          )}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </form>
  );
}
