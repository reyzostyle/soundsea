"use client";

import { useState } from "react";
import { Track } from "@/lib/types";
import { reportBrokenThumb } from "@/lib/thumbRepair";
import { MusicIcon } from "./Icons";

// A track's cover, or the note placeholder when there is none or it fails to load.
// A failed load also asks for a fresh cover, see lib/thumbRepair.
export default function TrackCover({ track, className }: { track: Track | null; className: string }) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = track?.thumbnail ?? null;

  if (!track || !src || failedSrc === src) {
    return (
      <div className={`flex items-center justify-center bg-elevated ${className}`}>
        <MusicIcon className="h-5 w-5 text-muted" />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={`object-cover ${className}`}
      onError={() => {
        setFailedSrc(src);
        reportBrokenThumb(track);
      }}
    />
  );
}
