export type NavItem = {
  id: string;
  label: string;
  href: string;
  /** Pages that don't exist yet render as "Soon" instead of a dead link. */
  ready: boolean;
};

export const navItems: NavItem[] = [
  { id: "home", label: "Home", href: "/", ready: true },
  { id: "friends", label: "Friends", href: "/friends", ready: true },
  { id: "link", label: "Link accounts", href: "/account", ready: true },
  { id: "notifications", label: "Notifications", href: "/notifications", ready: false },
  { id: "profile", label: "Profile", href: "/profile", ready: true },
];
