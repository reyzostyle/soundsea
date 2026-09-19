"use client";

import { useRef, useState } from "react";
import { DownloadIcon, Spinner, XIcon } from "./Icons";

type Props = {
  downloading: boolean;
  error: string | null;
  onDownload: (url: string) => Promise<boolean>;
};

export default function DownloadForm({ downloading, error, onDownload }: Props) {
  const [url, setUrl] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const clear = () => {
    setUrl("");
    inputRef.current?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed || downloading) return;
    const ok = await onDownload(trimmed);
    if (ok) setUrl("");
  };

  return (
    <form onSubmit={submit}>
      {/* One pill: the field fills it, the clear and download buttons sit inside on the right */}
      <div className="flex h-12 items-center gap-1 rounded-full border border-line bg-panel pr-1 transition-colors focus-within:border-accent">
        <input
          ref={inputRef}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube or TikTok link"
          disabled={downloading}
          className="h-full min-w-0 flex-1 rounded-l-full bg-transparent pl-5 text-sm text-ink outline-none placeholder:text-muted/70 disabled:opacity-60"
        />
        {url && !downloading && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear link"
            title="Clear"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-elevated hover:text-ink"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="submit"
          disabled={downloading || !url.trim()}
          aria-label="Download"
          className="flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white transition-colors enabled:hover:bg-brand-hover disabled:opacity-50 sm:w-auto sm:px-4"
        >
          {downloading ? <Spinner className="h-5 w-5" /> : <DownloadIcon className="h-5 w-5" />}
          <span className="hidden sm:inline">{downloading ? "Downloading" : "Download"}</span>
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
    </form>
  );
}
