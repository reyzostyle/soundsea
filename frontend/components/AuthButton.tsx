"use client";

import { useAuth } from "@/contexts/AuthContext";
import { GoogleIcon, LogOutIcon } from "./Icons";

export default function AuthButton() {
  const { configured, ready, user, profile, signInWithGoogle, signOut } = useAuth();

  // Supabase not wired up yet — show a gentle hint instead of a dead button.
  if (!configured) {
    return (
      <p className="rounded-lg border border-dashed border-slate-800 px-3 py-2 text-xs text-slate-500">
        Connect Supabase to enable accounts &amp; sharing.
      </p>
    );
  }

  if (!ready) {
    return <div className="h-9 animate-pulse rounded-lg bg-slate-900" />;
  }

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
      >
        <GoogleIcon className="h-4 w-4" />
        Sign in with Google
      </button>
    );
  }

  const name = profile?.display_name || profile?.username || user.email || "You";
  const avatar = profile?.avatar_url;

  return (
    <div className="flex items-center gap-2">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-sm font-semibold text-cyan-300">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-100">{name}</p>
        {profile?.username && <p className="truncate text-xs text-slate-500">@{profile.username}</p>}
      </div>
      <button
        onClick={signOut}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
        title="Sign out"
        aria-label="Sign out"
      >
        <LogOutIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
