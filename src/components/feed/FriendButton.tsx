import { acceptFriendRequest, removeFriendship, sendFriendRequest } from "@/lib/social/actions";
import type { Relation } from "@/lib/social/queries";

const primary =
  "h-10 rounded-full bg-[var(--brand)] px-4 text-sm font-semibold text-[var(--brand-ink)] transition-opacity hover:opacity-90";
const quiet =
  "h-10 rounded-full border border-[var(--border)] px-4 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface-2)]";

export function FriendButton({ relation, userId }: { relation: Relation; userId: string }) {
  switch (relation.state) {
    case "self":
      return null;
    case "none":
      return (
        <form action={sendFriendRequest.bind(null, userId)}>
          <button className={primary}>Add friend</button>
        </form>
      );
    case "sent":
      return (
        <form action={removeFriendship.bind(null, relation.friendshipId)}>
          <button className={quiet}>Requested · Cancel</button>
        </form>
      );
    case "received":
      return (
        <div className="flex gap-2">
          <form action={acceptFriendRequest.bind(null, relation.friendshipId)}>
            <button className={primary}>Accept</button>
          </form>
          <form action={removeFriendship.bind(null, relation.friendshipId)}>
            <button className={quiet}>Decline</button>
          </form>
        </div>
      );
    case "friends":
      return (
        <form action={removeFriendship.bind(null, relation.friendshipId)}>
          <button className={quiet}>Friends ✓ · Remove</button>
        </form>
      );
  }
}
