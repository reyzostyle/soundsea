"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { downscaleToDataUrl } from "@/lib/image";
import { CheckIcon, LogOutIcon, PencilIcon, Spinner } from "./Icons";

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

// Name, @username and avatar for the signed-in account. The avatar is stored the
// same way custom covers are: a small square data URL in the profiles row.
export default function ProfileEditor() {
  const { user, profile, refreshProfile, signOut } = useAuth();
  const fallbackUsername = user ? `user_${user.id.replace(/-/g, "").slice(0, 8)}` : "";
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // (re)fill the form whenever the stored profile changes
  useEffect(() => {
    setName(profile?.display_name ?? "");
    setUsername(profile?.username ?? fallbackUsername);
    setAvatar(profile?.avatar_url ?? null);
  }, [profile, fallbackUsername]);

  if (!user) return null;

  const dirty =
    name.trim() !== (profile?.display_name ?? "") ||
    username !== (profile?.username ?? fallbackUsername) ||
    avatar !== (profile?.avatar_url ?? null);
  const usernameValid = USERNAME_RE.test(username);
  const initial = (name || username || user.email || "?").charAt(0).toUpperCase();

  const pickAvatar = async (file: File | undefined) => {
    if (!file) return;
    try {
      setAvatar(await downscaleToDataUrl(file, 256));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not use that image.");
    }
  };

  const save = async () => {
    if (!supabase || !usernameValid) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").upsert({
      id: user.id,
      username,
      display_name: name.trim() || null,
      avatar_url: avatar,
    });
    setSaving(false);
    if (err) {
      setError(err.code === "23505" ? "That username is taken." : "Could not save your profile.");
      return;
    }
    await refreshProfile();
    setSavedAt(Date.now());
  };

  const field =
    "h-10 w-full rounded-lg border border-line bg-app px-3 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-accent";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => fileRef.current?.click()}
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-elevated"
          aria-label="Change avatar"
          title="Change avatar"
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xl font-semibold text-muted">{initial}</span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <PencilIcon className="h-4 w-4" />
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            pickAvatar(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-ink">{name.trim() || username}</p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-elevated hover:text-ink"
        >
          <LogOutIcon className="h-4 w-4" /> Sign out
        </button>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Name</span>
        <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={field} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted">Username</span>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted">@</span>
          <input
            value={username}
            maxLength={20}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
            className={`${field} pl-7`}
          />
        </div>
        {!usernameValid && <span className="text-xs text-red-500">3 to 20 characters: letters, numbers, _ and .</span>}
      </label>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={!dirty || !usernameValid || saving}
          className="flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-on-brand transition-colors enabled:hover:bg-brand-hover disabled:opacity-40"
        >
          {saving && <Spinner className="h-4 w-4" />}
          Save profile
        </button>
        {!dirty && savedAt > 0 && Date.now() - savedAt < 10000 && (
          <span className="flex items-center gap-1.5 text-sm text-muted">
            <CheckIcon className="h-4 w-4 text-accent" /> Saved
          </span>
        )}
        {error && <span className="text-sm text-red-500">{error}</span>}
      </div>
    </div>
  );
}
