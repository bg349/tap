// Handle rules, shared by the browser (live feedback) and the server (the real check).
export const HANDLE_MIN = 3;
export const HANDLE_MAX = 20;

export const RESERVED_HANDLES = new Set([
  "admin", "administrator", "api", "app", "auth", "login", "logout", "signup", "signin", "account",
  "settings", "profile", "profiles", "friends", "feed", "home", "help", "support", "terms", "privacy",
  "tap", "taps", "root", "system", "null", "undefined", "about", "u", "www", "mail", "official",
  "staff", "moderator", "onboarding", "welcome",
]);

/** A friendly problem with the handle, or null if it's well formed. */
export function handleProblem(raw: string): string | null {
  const handle = raw.trim();
  if (handle.length < HANDLE_MIN) return `Use at least ${HANDLE_MIN} characters.`;
  if (handle.length > HANDLE_MAX) return `Keep it to ${HANDLE_MAX} characters or fewer.`;
  if (/[A-Z]/.test(handle)) return "Use lowercase letters only.";
  if (!/^[a-z0-9_]+$/.test(handle)) return "Only lowercase letters, numbers and underscores.";
  if (RESERVED_HANDLES.has(handle)) return "That name is reserved. Try another.";
  return null;
}
