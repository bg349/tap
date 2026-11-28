import { Avatar } from "@/components/home/Avatar";
import { invitePreview, refHandle } from "@/lib/social/discovery";
import { createClient } from "@/lib/supabase/server";

/** "X invited you" for visitors who arrived through an invite link. Renders nothing otherwise. */
export async function InviteBanner() {
  const handle = await refHandle();
  if (!handle) return null;
  const who = await invitePreview(await createClient(), handle);
  if (!who) return null;
  return (
    <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 pr-4 shadow-[var(--shadow)]">
      <Avatar name={who.displayName} src={who.avatarUrl} className="size-11" />
      <p className="min-w-0 text-sm leading-snug">
        <span className="font-semibold">{who.displayName}</span> invited you to Tap.
        <span className="block text-[var(--muted)]">You&apos;ll be able to add each other once you&apos;re in.</span>
      </p>
    </div>
  );
}
