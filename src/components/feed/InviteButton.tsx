import Link from "next/link";

/** Opens the personal invite page: link, QR code and share options. */
export function InviteButton({ className = "" }: { className?: string }) {
  return (
    <Link href="/invite" className={`inline-flex items-center justify-center ${className}`}>
      Invite a friend
    </Link>
  );
}
