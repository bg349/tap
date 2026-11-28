"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { button, input, label } from "@/components/ui";
import { handleProblem } from "@/lib/handle";
import { checkHandle, saveProfile, type HandleCheck } from "@/app/onboarding/actions";

type Initial = { handle: string; displayName: string; bio: string; avatarUrl: string | null };

/** Downscale to a 384px square JPEG so uploads stay tiny. */
async function shrink(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(384, side);
  canvas.getContext("2d")!.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  return blob ? new File([blob], "avatar.jpg", { type: "image/jpeg" }) : file;
}

export function ProfileForm({ initial, mode, suggestion }: { initial: Initial; mode: "onboarding" | "account"; suggestion?: string }) {
  const [state, action, pending] = useActionState(saveProfile, undefined);
  const [handle, setHandle] = useState(mode === "onboarding" ? (suggestion ?? "") : initial.handle);
  const [name, setName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [preview, setPreview] = useState<string | null>(initial.avatarUrl);
  const [removed, setRemoved] = useState(false);
  const [check, setCheck] = useState<(HandleCheck & { for: string }) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const picked = useRef<File | null>(null);

  const localProblem = handle ? handleProblem(handle) : null;
  const unchanged = mode === "account" && handle === initial.handle;

  useEffect(() => {
    if (!handle || localProblem || unchanged) return;
    const t = setTimeout(async () => {
      const r = await checkHandle(handle);
      setCheck({ ...r, for: handle });
    }, 350);
    return () => clearTimeout(t);
  }, [handle, localProblem, unchanged]);

  const status: { ok: boolean | null; text: string } = !handle
    ? { ok: null, text: "3 to 20 characters: lowercase letters, numbers, underscores." }
    : localProblem
      ? { ok: false, text: localProblem }
      : unchanged
        ? { ok: true, text: "This is your current username." }
        : check?.for === handle
          ? { ok: check.ok, text: check.ok ? `@${handle} is available` : check.message }
          : { ok: null, text: "Checking…" };

  const canSave = !pending && name.trim().length > 0 && (unchanged || status.ok === true);
  const color = status.ok === true ? "text-[var(--win)]" : status.ok === false ? "text-[var(--loss)]" : "text-[var(--muted)]";

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const small = await shrink(f).catch(() => f);
    picked.current = small;
    setRemoved(false);
    setPreview(URL.createObjectURL(small));
  }

  function submit(form: FormData) {
    if (picked.current) form.set("avatar", picked.current);
    else form.delete("avatar");
    form.set("remove_avatar", removed ? "1" : "0");
    return action(form);
  }

  return (
    <form action={submit} className="mt-8 space-y-6">
      <input type="hidden" name="mode" value={mode} />
      <div className="flex items-center gap-4">
        <Avatar name={name || handle || "?"} src={preview} size={80} />
        <div className="flex flex-col items-start gap-1">
          <button type="button" onClick={() => fileRef.current?.click()} className="text-sm font-medium underline underline-offset-4">
            {preview ? "Change photo" : "Add a photo"} <span className="font-normal text-[var(--muted)]">(optional)</span>
          </button>
          {preview && (
            <button
              type="button"
              onClick={() => { picked.current = null; setPreview(null); setRemoved(true); if (fileRef.current) fileRef.current.value = ""; }}
              className="text-xs text-[var(--muted)] underline-offset-4 hover:underline"
            >
              Remove
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFile} className="hidden" />
        </div>
      </div>

      <div>
        <label htmlFor="handle" className={label}>Username</label>
        <div className="relative mt-2">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-[var(--muted)]">@</span>
          <input
            id="handle"
            name="handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/\s/g, ""))}
            maxLength={20}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-describedby="handle-status"
            className={`${input} pl-9`}
            placeholder="yourname"
          />
        </div>
        <p id="handle-status" aria-live="polite" className={`mt-2 text-sm ${color}`}>{status.text}</p>
        {mode === "onboarding" && (
          <p className="mt-1 text-xs text-[var(--muted)]">Friends find you at tap/u/{handle || "yourname"}</p>
        )}
      </div>

      <div>
        <label htmlFor="display_name" className={label}>Display name</label>
        <input
          id="display_name"
          name="display_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          autoComplete="name"
          className={`${input} mt-2`}
          placeholder="What friends see"
        />
      </div>

      <div>
        <label htmlFor="bio" className={label}>Bio <span className="text-[var(--muted)]">(optional)</span></label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={160}
          rows={3}
          className={`${input} mt-2 h-auto resize-none py-3`}
          placeholder="A line about you"
        />
        <p className="mt-1 text-right text-xs text-[var(--muted)]">{bio.length}/160</p>
      </div>

      {state?.error && <p role="alert" className="text-sm text-[var(--loss)]">{state.error}</p>}
      {state?.notice && <p className="text-sm text-[var(--win)]">{state.notice}</p>}

      <button type="submit" disabled={!canSave} className={`${button} w-full`}>
        {pending ? "Saving…" : mode === "onboarding" ? "Create my Tap" : "Save profile"}
      </button>
    </form>
  );
}
