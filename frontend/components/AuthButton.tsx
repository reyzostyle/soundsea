"use client";

import { useAuth } from "@/contexts/AuthContext";
import { GoogleIcon, LogOutIcon } from "./Icons";

export default function AuthButton() {
  const { configured, ready, user, profile, signInWithGoogle, signOut } = useAuth();

  // Supabase not wired up yet: show a gentle hint instead of a dead button.
  if (!configured) {
    return (
      <p className="text-sm text-muted">
        Connect Supabase to enable accounts &amp; sharing.
      </p>
    );
  }

  if (!ready) {
    return <div className="h-9 animate-pulse rounded-md bg-elevated" />;
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-line bg-base px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-elevated"
      >
        <GoogleIcon className="h-4 w-4" />
        Sign in with Google
      </button>
    );
  }

  const name = profile?.display_name || profile?.username || user.email || "You";
  const avatar = profile?.avatar_url;

  return (
    <div className="flex items-center gap-3">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{name}</p>
        {profile?.username && <p className="truncate text-xs text-muted">@{profile.username}</p>}
      </div>
      <button
        onClick={signOut}
        className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-ink"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOutIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
