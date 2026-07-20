"use client";

import { useEffect, useState } from "react";
import { squareCoverUrl } from "./image";

// Shows the original image until the square center-crop is ready, then swaps it in.
// Falls back to the original URL if cropping fails (e.g. a CORS-blocked host).
export function useSquareCover(src: string | null | undefined): string | null {
  const [out, setOut] = useState<string | null>(src ?? null);

  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setOut(null);
      return;
    }
    setOut(src);
    squareCoverUrl(src)
      .then((u) => {
        if (!cancelled) setOut(u);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [src]);

  return out;
}
