"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

// One confirmation, used for the few things that can't be undone: deleting a track or
// a playlist, and walking away from an unsaved edit. Everything else just happens.
export default function ConfirmDialog({
  title,
  body,
  confirmLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  body?: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter") onConfirm();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="anim-fade absolute inset-0 bg-black/55" onClick={onCancel} />
      <div className="anim-sheet relative w-full rounded-t-lg border border-line bg-panel p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:m-4 sm:max-w-sm sm:rounded-lg">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {body && <p className="mt-1.5 text-sm leading-relaxed text-balance text-muted">{body}</p>}
        <div className="mt-5 flex gap-2">
          <button
            onClick={onCancel}
            className="h-11 flex-1 rounded-full border border-line text-sm font-medium text-ink transition-colors hover:bg-elevated"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            autoFocus
            className={`h-11 flex-1 rounded-full text-sm font-semibold transition-colors ${
              destructive ? "bg-red-500 text-white hover:bg-red-600" : "bg-brand text-on-brand hover:bg-brand-hover"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
